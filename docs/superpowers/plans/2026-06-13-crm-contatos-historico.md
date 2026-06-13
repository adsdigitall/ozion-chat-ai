# CRM de Contatos + Histórico Unificado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRM surface for contacts with a single timeline that merges WhatsApp messages, internal notes, tasks, and system events.

**Architecture:** Keep the existing Express app and Vercel entrypoint. Move CRM data logic into small Supabase-backed services so the route layer stays thin and testable, and normalize all activity into one timeline model that the frontend can render consistently.

**Tech Stack:** TypeScript, Express, Supabase, vanilla JS, Node `test`, `tsx`, SQL migrations.

---

## File Map

- Create `migrations/003_contact_timeline.sql`: add `contact_notes`, `contact_tasks`, and `contact_events` tables plus indexes.
- Modify `server/db/schema.ts`: mirror the new tables for local SQLite/dev usage.
- Create `server/services/contact-timeline.ts`: merge messages, notes, tasks, and events into a single sorted timeline.
- Create `server/services/contact-crm.ts`: Supabase repository functions for contact list, detail view, notes, tasks, and events.
- Create `server/services/contact-events.ts`: builders for system events and helper to insert them.
- Modify `server/routes/crm.ts`: expose CRM endpoints that call the service layer.
- Modify `server/routes/webhooks.ts`, `server/routes/chat.ts`, `server/routes/messages.ts`, and `server/services/webhook-handler.ts`: emit contact events when WhatsApp or chat state changes.
- Create `public/js/crm.js`: CRM-specific rendering and actions for contacts and timeline.
- Modify `public/js/ozion.js`: delegate the contacts page to the new CRM module.
- Modify `public/index.html`: load `crm.js` before `ozion.js`.
- Modify `public/css/ozion.css`: CRM layout, side panel, and timeline styling.
- Create `tests/contact-timeline.test.ts`, `tests/contact-crm.test.ts`, and `tests/contact-events.test.ts`: pure unit tests for timeline normalization, repository behavior, and event builders.

## Task 1: Data Model and Timeline Normalizer

**Files:**
- Create: `migrations/003_contact_timeline.sql`
- Modify: `server/db/schema.ts`
- Create: `server/services/contact-timeline.ts`
- Create: `tests/contact-timeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactTimeline } from '../server/services/contact-timeline.js';

test('buildContactTimeline merges messages, notes, tasks and events newest-first', () => {
  const timeline = buildContactTimeline({
    messages: [
      { id: 'm1', sent_at: '2026-06-13T10:00:00.000Z', direction: 'inbound', type: 'text', content: 'oi' },
    ],
    notes: [
      { id: 'n1', created_at: '2026-06-13T10:05:00.000Z', body: 'ligar depois', author_name: 'Ana' },
    ],
    tasks: [
      { id: 't1', created_at: '2026-06-13T10:10:00.000Z', title: 'Follow-up', status: 'open' },
    ],
    events: [
      { id: 'e1', created_at: '2026-06-13T10:15:00.000Z', event_type: 'status_changed', title: 'Status alterado' },
    ],
  });

  assert.deepEqual(timeline.map((item) => item.kind), ['event', 'task', 'note', 'message']);
  assert.equal(timeline[0].title, 'Status alterado');
  assert.equal(timeline[3].body, 'oi');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test --import tsx tests/contact-timeline.test.ts`

Expected: failure because `buildContactTimeline` does not exist yet.

- [ ] **Step 3: Add the migration and the normalizer**

```sql
CREATE TABLE IF NOT EXISTS contact_notes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  conversation_id TEXT REFERENCES conversations(id),
  author_user_id TEXT REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_tasks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  conversation_id TEXT REFERENCES conversations(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  assigned_to TEXT,
  created_by TEXT REFERENCES users(id),
  completed_at TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  conversation_id TEXT REFERENCES conversations(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_tenant_contact ON contact_notes(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_tenant_contact ON contact_tasks(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_tenant_contact ON contact_events(tenant_id, contact_id);
```

```ts
export type TimelineKind = 'message' | 'note' | 'task' | 'event';

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  createdAt: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
};

type TimelineInput = {
  messages?: Array<{ id: string; sent_at: string; direction: string; type: string; content: string }>;
  notes?: Array<{ id: string; created_at: string; body: string; author_name?: string | null }>;
  tasks?: Array<{ id: string; created_at: string; title: string; status: string; due_at?: string | null }>;
  events?: Array<{ id: string; created_at: string; event_type: string; title: string; body?: string | null }>;
};

export function buildContactTimeline(input: TimelineInput): TimelineItem[] {
  const items: TimelineItem[] = [
    ...(input.messages || []).map((message) => ({
      id: message.id,
      kind: 'message' as const,
      createdAt: message.sent_at,
      title: message.direction === 'inbound' ? 'Mensagem recebida' : 'Mensagem enviada',
      body: message.content,
      meta: { direction: message.direction, type: message.type },
    })),
    ...(input.notes || []).map((note) => ({
      id: note.id,
      kind: 'note' as const,
      createdAt: note.created_at,
      title: note.author_name ? `Nota de ${note.author_name}` : 'Nota interna',
      body: note.body,
    })),
    ...(input.tasks || []).map((task) => ({
      id: task.id,
      kind: 'task' as const,
      createdAt: task.created_at,
      title: task.title,
      body: task.status === 'done' ? 'Tarefa concluída' : task.due_at ? `Vencimento: ${task.due_at}` : 'Tarefa aberta',
      meta: { status: task.status, dueAt: task.due_at || null },
    })),
    ...(input.events || []).map((event) => ({
      id: event.id,
      kind: 'event' as const,
      createdAt: event.created_at,
      title: event.title,
      body: event.body || undefined,
      meta: { eventType: event.event_type },
    })),
  ];

  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

Run: `node --test --import tsx tests/contact-timeline.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add migrations/003_contact_timeline.sql server/db/schema.ts server/services/contact-timeline.ts tests/contact-timeline.test.ts
git commit -m "feat: add contact timeline primitives"
```

## Task 2: CRM Repository and Contact Routes

**Files:**
- Create: `server/services/contact-crm.ts`
- Modify: `server/routes/crm.ts`
- Create: `tests/contact-crm.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getContactDetail, listContacts } from '../server/services/contact-crm.js';

function fakeSupabase(state: any) {
  return {
    from(table: string) {
      const rows = state[table] || [];
      return {
        select() {
          let data = [...rows];
          const chain: any = {
            eq(column: string, value: string) {
              data = data.filter((row) => row[column] === value);
              return chain;
            },
            in(column: string, values: string[]) {
              data = data.filter((row) => values.includes(row[column]));
              return chain;
            },
            order(column: string, { ascending = true } = {}) {
              data.sort((a, b) => ascending ? String(a[column]).localeCompare(String(b[column])) : String(b[column]).localeCompare(String(a[column])));
              return chain;
            },
            limit(n: number) {
              data = data.slice(0, n);
              return chain;
            },
            single() {
              return Promise.resolve({ data: data[0] || null, error: data[0] ? null : new Error('missing') });
            },
            then(resolve: any) {
              return Promise.resolve({ data, error: null }).then(resolve);
            },
          };
          return chain;
        },
      };
    },
  };
}

test('listContacts filters by tenant and search term', async () => {
  const sb = fakeSupabase({
    contacts: [
      { id: '1', tenant_id: 't1', name: 'Ana', phone: '111', email: 'a@x.com', tags: '[]', lead_status: 'new', last_message_at: '2026-06-13T10:00:00.000Z' },
      { id: '2', tenant_id: 't2', name: 'Bruno', phone: '222', email: 'b@x.com', tags: '[]', lead_status: 'new', last_message_at: '2026-06-13T11:00:00.000Z' },
    ],
  });

  const result = await listContacts(sb as any, 't1', { search: 'ana' });
  assert.equal(result.total, 1);
  assert.equal(result.contacts[0].name, 'Ana');
});

test('getContactDetail returns contact plus unified timeline', async () => {
  const sb = fakeSupabase({
    contacts: [{ id: 'c1', tenant_id: 't1', name: 'Ana', tags: '[]' }],
    conversations: [{ id: 'conv1', tenant_id: 't1', contact_id: 'c1' }],
    messages: [{ id: 'm1', conversation_id: 'conv1', sent_at: '2026-06-13T10:00:00.000Z', direction: 'inbound', type: 'text', content: 'oi' }],
    contact_notes: [{ id: 'n1', tenant_id: 't1', contact_id: 'c1', created_at: '2026-06-13T10:05:00.000Z', body: 'ligar depois' }],
    contact_tasks: [{ id: 't1', tenant_id: 't1', contact_id: 'c1', created_at: '2026-06-13T10:10:00.000Z', title: 'Follow-up', status: 'open' }],
    contact_events: [{ id: 'e1', tenant_id: 't1', contact_id: 'c1', created_at: '2026-06-13T10:15:00.000Z', event_type: 'status_changed', title: 'Status alterado' }],
  });

  const detail = await getContactDetail(sb as any, 't1', 'c1');
  assert.equal(detail.contact.name, 'Ana');
  assert.equal(detail.timeline[0].kind, 'event');
  assert.equal(detail.timeline.length, 4);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test --import tsx tests/contact-crm.test.ts`

Expected: failure because `getContactDetail` and `listContacts` do not exist yet.

- [ ] **Step 3: Implement the repository and wire the routes**

```ts
type SupabaseLike = {
  from(table: string): {
    select(columns?: string): any;
    insert(row: any): Promise<{ error: Error | null }>;
  };
};

import { buildContactTimeline } from './contact-timeline.js';

export async function listContacts(sb: SupabaseLike, tenantId: string, filters: { search?: string; tag?: string; status?: string; source?: string; stage?: string; limit?: number } = {}) {
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(filters.limit || 100);

  if (error) throw error;

  let contacts = (data || []).map((contact) => ({
    ...contact,
    tags: JSON.parse(contact.tags || '[]'),
    customFields: JSON.parse(contact.custom_fields || '{}'),
  }));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    contacts = contacts.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(filters.search!) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }

  if (filters.tag) contacts = contacts.filter((c) => (c.tags || []).includes(filters.tag));
  if (filters.status) contacts = contacts.filter((c) => c.lead_status === filters.status);
  if (filters.source) contacts = contacts.filter((c) => c.lead_source === filters.source);
  if (filters.stage) contacts = contacts.filter((c) => c.stage === filters.stage);

  return { contacts, total: contacts.length };
}

export async function getContactDetail(sb: SupabaseLike, tenantId: string, contactId: string) {
  const { data: contact, error: contactError } = await sb
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', contactId)
    .single();

  if (contactError || !contact) {
    return { contact: null, conversations: [], messages: [], notes: [], tasks: [], events: [], timeline: [] };
  }

  const { data: conversations = [] } = await sb
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId);

  const conversationIds = (conversations || []).map((conversation) => conversation.id);
  const { data: messages = [] } = conversationIds.length
    ? await sb.from('messages').select('*').in('conversation_id', conversationIds).order('sent_at', { ascending: false })
    : { data: [], error: null };

  const { data: notes = [] } = await sb.from('contact_notes').select('*').eq('tenant_id', tenantId).eq('contact_id', contactId).order('created_at', { ascending: false });
  const { data: tasks = [] } = await sb.from('contact_tasks').select('*').eq('tenant_id', tenantId).eq('contact_id', contactId).order('created_at', { ascending: false });
  const { data: events = [] } = await sb.from('contact_events').select('*').eq('tenant_id', tenantId).eq('contact_id', contactId).order('created_at', { ascending: false });

  return {
    contact: { ...contact, tags: JSON.parse(contact.tags || '[]'), customFields: JSON.parse(contact.custom_fields || '{}') },
    conversations,
    messages,
    notes,
    tasks,
    events,
    timeline: buildContactTimeline({ messages, notes, tasks, events }),
  };
}

export async function createContactNote(sb: SupabaseLike, input: { tenantId: string; contactId: string; conversationId?: string | null; authorUserId?: string | null; body: string }) {
  const row = {
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    conversation_id: input.conversationId || null,
    author_user_id: input.authorUserId || null,
    body: input.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('contact_notes').insert(row);
  if (error) throw error;
  return row;
}

export async function createContactTask(sb: SupabaseLike, input: { tenantId: string; contactId: string; title: string; description?: string; dueAt?: string | null; assignedTo?: string | null; createdBy?: string | null }) {
  const row = {
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    title: input.title,
    description: input.description || '',
    due_at: input.dueAt || null,
    assigned_to: input.assignedTo || null,
    created_by: input.createdBy || null,
    status: 'open',
    metadata: '{}',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('contact_tasks').insert(row);
  if (error) throw error;
  return row;
}
```

```ts
router.get('/contacts', async (req, res) => {
  const tid = (req.headers['x-tenant-id'] as string) || 'default';
  const result = await listContacts(getSupabase(), tid, {
    search: req.query.search as string | undefined,
    tag: req.query.tag as string | undefined,
    status: req.query.status as string | undefined,
    source: req.query.source as string | undefined,
    stage: req.query.stage as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
  });
  res.json(result);
});

router.get('/contacts/:id', async (req, res) => {
  const tid = (req.headers['x-tenant-id'] as string) || 'default';
  const detail = await getContactDetail(getSupabase(), tid, req.params.id);
  if (!detail.contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(detail);
});
```

- [ ] **Step 4: Run the test again and confirm it passes**

Run: `node --test --import tsx tests/contact-crm.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/contact-crm.ts server/routes/crm.ts tests/contact-crm.test.ts
git commit -m "feat: add crm contact repository and detail route"
```

## Task 3: Event Logging for WhatsApp, Chat, and CRM Actions

**Files:**
- Create: `server/services/contact-events.ts`
- Modify: `server/services/webhook-handler.ts`
- Modify: `server/routes/webhooks.ts`
- Modify: `server/routes/messages.ts`
- Modify: `server/routes/chat.ts`
- Modify: `server/routes/crm.ts`
- Create: `tests/contact-events.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInboundMessageEvent, buildStatusChangeEvent } from '../server/services/contact-events.js';

test('buildInboundMessageEvent creates a readable event row', () => {
  const event = buildInboundMessageEvent({
    tenantId: 't1',
    contactId: 'c1',
    conversationId: 'conv1',
    text: 'oi, quero preço',
    phone: '5511999999999',
    messageId: 'msg1',
  });

  assert.equal(event.event_type, 'message_received');
  assert.equal(event.title, 'Mensagem recebida');
  assert.match(event.body || '', /quero preço/);
});

test('buildStatusChangeEvent keeps the event focused on the conversation change', () => {
  const event = buildStatusChangeEvent({
    tenantId: 't1',
    contactId: 'c1',
    conversationId: 'conv1',
    status: 'closed',
  });

  assert.equal(event.event_type, 'conversation_closed');
  assert.equal(event.title, 'Conversa encerrada');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test --import tsx tests/contact-events.test.ts`

Expected: failure because the event builders do not exist yet.

- [ ] **Step 3: Implement event builders and call them from existing flows**

```ts
type SupabaseLike = {
  from(table: string): {
    insert(row: any): Promise<{ error: Error | null }>;
  };
};

import crypto from 'crypto';

export function buildInboundMessageEvent(input: { tenantId: string; contactId: string; conversationId?: string | null; text: string; phone?: string | null; messageId?: string | null }) {
  return {
    id: crypto.randomUUID(),
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    conversation_id: input.conversationId || null,
    event_type: 'message_received',
    title: 'Mensagem recebida',
    body: input.text,
    source: 'whatsapp',
    metadata: JSON.stringify({ phone: input.phone || null, messageId: input.messageId || null }),
    created_at: new Date().toISOString(),
  };
}

export function buildOutboundMessageEvent(input: { tenantId: string; contactId: string; conversationId?: string | null; body: string }) {
  return {
    id: crypto.randomUUID(),
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    conversation_id: input.conversationId || null,
    event_type: 'message_sent',
    title: 'Mensagem enviada',
    body: input.body,
    source: 'system',
    metadata: '{}',
    created_at: new Date().toISOString(),
  };
}

export function buildStatusChangeEvent(input: { tenantId: string; contactId: string; conversationId?: string | null; status: string }) {
  return {
    id: crypto.randomUUID(),
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    conversation_id: input.conversationId || null,
    event_type: input.status === 'closed' ? 'conversation_closed' : 'conversation_status_changed',
    title: input.status === 'closed' ? 'Conversa encerrada' : 'Status da conversa alterado',
    body: `Novo status: ${input.status}`,
    source: 'system',
    metadata: JSON.stringify({ status: input.status }),
    created_at: new Date().toISOString(),
  };
}

export async function appendContactEvent(sb: SupabaseLike, event: Record<string, unknown>) {
  const { error } = await sb.from('contact_events').insert(event);
  if (error) throw error;
  return event;
}
```

```ts
// webhook-handler.ts
await sb.from('contact_events').insert(buildInboundMessageEvent({
  tenantId,
  contactId: contact.id,
  conversationId: conversation.id,
  text: message.text?.body || '',
  phone: message.from,
  messageId: message.id,
}));

// messages.ts after outbound send
await sb.from('contact_events').insert({
  tenant_id: conversation.tenant_id,
  contact_id: conversation.contact_id,
  conversation_id: conversationId,
  event_type: 'message_sent',
  title: 'Mensagem enviada',
  body: type === 'text' ? text : JSON.stringify({ template: templateName }),
  source: 'system',
  metadata: '{}',
});

// chat.ts after close / transfer / AI toggle
await sb.from('contact_events').insert(buildStatusChangeEvent({
  tenantId: tid,
  contactId: conv.contact_id,
  conversationId: req.params.id,
  status,
}));
```

- [ ] **Step 4: Run the test again and confirm it passes**

Run: `node --test --import tsx tests/contact-events.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/contact-events.ts server/services/webhook-handler.ts server/routes/webhooks.ts server/routes/messages.ts server/routes/chat.ts server/routes/crm.ts tests/contact-events.test.ts
git commit -m "feat: log contact timeline events from message flows"
```

## Task 4: Frontend CRM Surface

**Files:**
- Create: `public/js/crm.js`
- Modify: `public/js/ozion.js`
- Modify: `public/index.html`
- Modify: `public/css/ozion.css`

- [ ] **Step 1: Add the CRM module and a smoke check**

```js
window.OzionCRM = {
  async render({ root, api, tenantId }) {
    const data = await api('/api/crm/contacts?limit=100', { headers: { 'X-Tenant-Id': tenantId } });
    root.innerHTML = `
      <section class="crm-layout">
        <aside class="crm-list">
          <div class="crm-list-header">
            <h2>Contatos</h2>
            <input id="crm-search" placeholder="Buscar por nome, telefone, email" />
          </div>
          <div class="crm-list-items">
            ${(data?.contacts || []).map((contact) => `
              <button class="crm-contact-card" data-contact-id="${contact.id}">
                <strong>${contact.name || 'Sem nome'}</strong>
                <span>${contact.phone || ''}</span>
              </button>
            `).join('')}
          </div>
        </aside>
        <section class="crm-detail">
          <div class="crm-empty-state">Selecione um contato para ver o histórico unificado.</div>
        </section>
      </section>
    `;
  }
};
```

```html
<script src="/js/crm.js"></script>
<script src="/js/ozion.js"></script>
```

```js
// ozion.js inside the contacts page branch
if (window.OzionCRM) {
  await window.OzionCRM.render({ root: document.getElementById('app'), api, tenantId: TENANT });
  return;
}
```

- [ ] **Step 2: Run syntax and build checks**

Run: `node --check public/js/crm.js`

Run: `npm run build`

Expected: both pass without syntax or TypeScript errors.

- [ ] **Step 3: Add the layout styles**

```css
.crm-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  min-height: calc(100vh - 120px);
}

.crm-list, .crm-detail {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.crm-contact-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  padding: 12px 14px;
  background: transparent;
  border: 0;
  color: inherit;
}
```

- [ ] **Step 4: Smoke test in the browser and against the API**

Run: `curl -s https://app.mdii.com.br/api/crm/contacts -H 'X-Tenant-Id: default' | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); console.log(data.total)"`

Then open the app locally or in production and verify:
- the contacts page renders a list;
- clicking a contact loads the right-hand detail pane;
- the timeline shows messages, notes, tasks, and events in one feed.

- [ ] **Step 5: Commit**

```bash
git add public/js/crm.js public/js/ozion.js public/index.html public/css/ozion.css
git commit -m "feat: add crm contacts timeline frontend"
```

## Final Verification

- Run `node --test --import tsx tests/contact-timeline.test.ts`.
- Run `node --test --import tsx tests/contact-crm.test.ts`.
- Run `node --test --import tsx tests/contact-events.test.ts`.
- Run `npm run build`.
- Boot the app and verify `/api/crm/contacts`, `/api/crm/contacts/:id`, and the CRM page load cleanly.
- Confirm the new tables exist in Supabase and the timeline shows mixed activity in chronological order.
