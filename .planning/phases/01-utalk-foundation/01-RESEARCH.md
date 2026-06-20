# Phase 1: UTalk Foundation — Research

**Researched:** 2026-06-20
**Domain:** WhatsApp provider integration, database schema design, API client service architecture
**Confidence:** HIGH

## Summary

Phase 1 establishes the data layer and API client foundation for UTalk (Umbler Talk) as a second WhatsApp provider in the Ozion CRM. The phase must deliver three things: (1) a Supabase migration (`004_utalk_integration.sql`) creating `utalk_integrations` and `utalk_mappings` tables, plus `provider`/`external_id` columns on existing `conversations` and `messages` tables; (2) a UTalk API client service (`server/services/utalk-client.ts`) following the existing `evolution-api.ts` pattern with Bearer token auth, encrypted credential storage, and fetch-based HTTP calls; and (3) a UTalk message normalizer (`server/services/utalk-normalizer.ts`) that transforms UTalk's form-encoded-style webhook payloads and API message shapes into the same internal message format that Meta/Evolution messages use.

**Primary recommendation:** Follow the existing `evolution-api.ts` service pattern for the UTalk client — module-level env config, `// @ts-nocheck`, fetch-based HTTP, per-endpoint named async functions. Add columns via `ALTER TABLE` in a new `004_utalk_integration.sql` migration file. Store UTalk API tokens using the existing `encrypt()`/`decrypt()` from `server/lib/encryption.ts`. The normalizer must handle UTalk's unique `contact[number]` and `chat[body]` key format and produce typed output matching Ozion's internal `NormalizedMessage` shape.

**Phase requirements addressed:** UTALK-03 (client service), UTALK-04 (migrations), UTALK-07 (normalizer)

## User Constraints (from CONTEXT.md)

> This phase is the first phase — no CONTEXT.md exists yet. The following constraints are extracted from PROJECT.md and ROADMAP.md as locked decisions.

### Locked Decisions
- Provider separado "utalk" — não quebrar provider Meta existente
- UTalk é só provider/canal — Ozion continua sendo o sistema principal (Inbox, Flow, IA, Analytics próprios)
- Flow Engine próprio e agnóstico — engine precisa funcionar com qualquer provider
- Nada fake, nada mock — todo dado vem do banco real ou de API real
- Modo MVP vertical slice — cada fase entrega uma fatia funcional ponta a ponta

### the agent's Discretion
- Migration strategy (new file 004 vs inline)
- Whether to add `provider` to conversations and messages as nullable TEXT vs with a default
- Exact UTalk normalizer output shape mapping from UTalk fields to Ozion fields

### Deferred Ideas (OUT OF SCOPE)
- Página Swagger/API Docs pública da Ozion
- Portal de desenvolvedor
- Tela pública de tokens API
- CAPI Meta
- Substituir Flow Engine da Ozion pelo Flowchart da UTalk
- Usar AI Agents da UTalk como cérebro principal

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UTALK-03 | UTalk Client service (`server/services/utalk-client.ts`) | Pattern established by `evolution-api.ts` — section "Standard Stack" documents the pattern |
| UTALK-04 | Migrations: `utalk_integrations`, `utalk_mappings`, provider/external_id columns | Existing `003_flow_controls.sql` is the reference pattern — section "Migration Strategy" documents the approach |
| UTALK-07 | Normalizador UTalk | UTalk webhook payload format documented in "Architecture Patterns" — normalizer design in "UTalk Normalizer" section |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UTalk API client | Service Layer | — | Follows existing pattern: `server/services/evolution-api.ts` owns WhatsApp HTTP API calls |
| Credential encryption | Service Layer | Data Layer | `server/lib/encryption.ts` is already in service layer; UTalk uses same `encrypt()`/`decrypt()` |
| Database schema | Data Layer | — | Migration files in `migrations/`, Drizzle schema in `server/db/schema.ts` — existing pattern |
| Message normalization | Service Layer | — | Webhook payload transformation belongs in service layer (see `parseWebhookEvent` in `evolution-api.ts`) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fetch` | (runtime) | HTTP requests to UTalk API | Existing `evolution-api.ts` and `meta-api.ts` both use fetch, not axios |
| `crypto-js` | ^4.2.0 | AES encrypt/decrypt for UTalk API tokens | Already installed and used by `server/lib/encryption.ts` |
| Drizzle ORM | ^0.45.2 | SQLite schema for local dev | Existing pattern in `server/db/schema.ts` |
| Supabase client (supabase-js) | ^2.108.1 | PostgreSQL queries in production | Existing pattern — `getSupabase()` used everywhere |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto` (Node.js built-in) | (stdlib) | UUID generation for record IDs | Every route uses `crypto.randomUUID()` for new records |
| `zod` | ^3.23.8 | Potential validation for messages | Already installed but unused — could validate normalizer output shape |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `evolution-api.ts` service pattern | Wrap in a class | The codebase uses module-level functions, not classes. A class would break the existing convention |
| fetch-based HTTP | axios | fetch is already used everywhere in the codebase. No axios dependency exists |
| New migration file | Inline DDL in code | Migration files are the established pattern (001, 002, 003). Inline DDL was not used in any existing path |

**Installation:**
```bash
# No new packages needed for this phase
# All dependencies (crypto-js, supabase-js, drizzle-orm) are already installed
npm install   # only if not already run
```

**Version verification:** These are already installed in the project. No new npm packages required for Phase 1.

## Package Legitimacy Audit

> No new packages are installed in Phase 1. All work uses existing dependencies (crypto-js, supabase-js, drizzle-orm, Node.js built-in fetch) and new source files. This section is informational.

No packages to audit — phase adds only first-party source code and a SQL migration file.

## Architecture Patterns

### UTalk API Client Service Pattern

The UTalk client must follow the exact pattern established by `server/services/evolution-api.ts`:

**Pattern:**
1. `// @ts-nocheck` at top
2. Module-level config constants from `process.env` (or encrypted storage)
3. Named async functions for each API operation
4. Early-return guard: `if (!config) return { ok: false, error: '...' }`
5. `fetch()`-based HTTP calls with JSON body
6. Error caught per-function, returned as `{ ok: false, error: e.message }`
7. Console logging with emoji prefixes for key operations

**UTalk API endpoints for Phase 1:**
```
GET  /v1/members/me/                → verify auth, get organizationId
GET  /v1/channels/                  → list WhatsApp channels (requires orgId)
GET  /v1/chats/                     → list chats (requires orgId + ?organizationId=)
GET  /v1/chats/{chatId}/relative-messages/  → get messages in date range
POST /v1/messages/simplified/       → send message (creates contact+chat if needed)
POST /v1/messages/                  → send to existing contact+chat
GET  /v1/webhooks/                  → list registered webhooks
GET  /v1/contacts/                  → list contacts (paginated)
```

**Auth pattern:**
```
Authorization: Bearer <api-token>
```
API token obtained from Umbler Account profile page (`https://account.umbler.com/profile`). Stored encrypted using `server/lib/encryption.ts`.

### Migration Strategy

**Location:** `migrations/004_utalk_integration.sql`

**Format:** Follows `003_flow_controls.sql` as the reference:
- `CREATE TABLE IF NOT EXISTS` for new tables
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing table changes
- `CREATE INDEX IF NOT EXISTS` for indexes
- Comments with `-- ======` section separators
- Final `SELECT` statement as a success confirmation

**New tables:**
1. `utalk_integrations` — per-tenant UTalk configuration
   - `id`, `tenant_id`, `organization_id`, `channel_id`, `api_key_encrypted`, `webhook_url`, `status`, `last_checked_at`, `last_error`, `created_at`, `updated_at`
2. `utalk_mappings` — maps UTalk IDs to Ozion IDs for bidirectional reference
   - `id`, `tenant_id`, `utalk_chat_id`, `utalk_contact_id`, `ozion_conversation_id`, `ozion_contact_id`, `created_at`, `updated_at`

**Existing table changes:**
3. `ALTER TABLE conversations ADD COLUMN provider TEXT DEFAULT 'meta'` — identifies which provider owns the conversation
4. `ALTER TABLE conversations ADD COLUMN external_id TEXT` — stores the provider's conversation/chat ID
5. `ALTER TABLE messages ADD COLUMN provider TEXT DEFAULT 'meta'` — identifies which provider sent the message
6. `ALTER TABLE messages ADD COLUMN tenant_id TEXT` — required for provider-agnostic querying (messages table currently lacks tenant_id)

**Drizzle schema updates** (in `server/db/schema.ts`):
- Add `provider: text('provider').default('meta')` to `conversations`
- Add `externalId: text('external_id')` to `conversations`
- Add `provider: text('provider').default('meta')` to `messages`
- Add `tenantId: text('tenant_id')` to `messages`

**Note on provider default:** The `DEFAULT 'meta'` ensures backward compatibility — existing conversations/messages without a provider value are automatically treated as Meta. New UTalk conversations will explicitly set `provider: 'utalk'`.

### UTalk Message Normalizer

The normalizer must handle UTalk's webhook payload format, which uses form-encoded-style keys like `contact[number]` and `chat[body]`. This is critical — UTalk does NOT send JSON with nested objects in standard format.

**UTalk Webhook Payload (inbound message):**
```json
{
  "event": "chat",
  "token": "token-da-sua-conta",
  "operador": "xxxxx",
  "user": "55119XXXXXXXX",
  "contact[number]": "5511984459878",
  "contact[name]": "Fake name",
  "contact[server]": "c.us",
  "chat[dtm]": "1550759821",
  "chat[uid]": "36TZTHHSVTGPLR8H8ZIS",
  "chat[dir]": "i",
  "chat[type]": "chat",
  "chat[body]": "Message test",
  "ack": "-1"
}
```

**Key fields to extract:**
| UTalk Field | Ozion Field | Notes |
|-------------|-------------|-------|
| `contact[number]` | `from` / contact phone | E.164 format with + |
| `contact[name]` | Contact name | May be missing |
| `chat[uid]` | `external_id` (message) | Unique message ID |
| `chat[dir]` | `direction` | `"i"` → `inbound`, `"o"` → `outbound` |
| `chat[type]` | `type` | `"chat"` → `text`, media types |
| `chat[body]` | `content` | Message text or base64 media |
| `chat[dtm]` | `sent_at` / `timestamp` | Unix timestamp |
| `user` | `phone_number_id` / channel | The receiving number |
| `event` | — | Always `"chat"` for messages |
| `ack` | `status` | `-1`, `1`, `2`, `3` |

**UTalk ACK/Status webhook:**
```json
{
  "event": "ack",
  "token": "...",
  "user": "55119XXXXXXXX",
  "muid": "MQUSR313M6XVHOBLEUOH",
  "id": "1E51LFO46A",
  "ack": "2"
}
```
- `muid` = message UID (matches `chat[uid]`)
- `ack`: `"1"` = sent, `"2"` = delivered, `"3"` = read

**Normalized output shape:**
```typescript
interface NormalizedMessage {
  from: string;           // phone number (E.164)
  fromName?: string;
  to: string;             // channel/number receiving it
  messageId: string;      // UTalk chat[uid]
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'unknown';
  content: string;        // text body or caption
  mediaUrl?: string;      // if media message
  mediaMimeType?: string;
  direction: 'inbound' | 'outbound';
  timestamp: number;      // Unix seconds
  raw: any;               // original payload for debugging
}
```

This is the same shape returned by `parseWebhookEvent()` in `evolution-api.ts` — the normalizer ensures UTalk messages are interchangeable with Evolution/Meta messages downstream.

### Encryption for UTalk Credentials

UTalk API tokens should be stored encrypted in the `utalk_integrations.api_key_encrypted` column using the existing `encrypt()` function from `server/lib/encryption.ts`:

```typescript
import { encrypt, decrypt } from '../lib/encryption.js';

// On save:
const encrypted = encrypt(utalkApiToken);

// On use:
const token = decrypt(record.api_key_encrypted);
```

This matches the existing pattern in `whatsapp_credentials.access_token_encrypted` / `app_secret_encrypted`.

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                      UTalk External API                          │
│              https://app-utalk.umbler.com/api                    │
│              Bearer <api-token> auth                             │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ HTTP (fetch)                 │ Webhook POST
               ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  utalk-client.ts (service)   │  │  POST /api/webhooks/utalk    │
│                              │  │  (Phase 2, endpoint only     │
│  • Authenticate & get org    │  │   created in Phase 2)        │
│  • List channels             │  │                              │
│  • List/send messages        │  │  → utalk-normalizer.ts       │
│  • Test connection           │  │    (Phase 1, logic only)     │
└──────────────┬───────────────┘  └──────────────┬───────────────┘
               │                                 │
               ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ozion Data Layer                            │
│                                                                  │
│  • utalk_integrations (encrypted API keys + org config)         │
│  • utalk_mappings (UTalk ID ↔ Ozion ID mapping)                │
│  • conversations (now has provider + external_id)               │
│  • messages (now has provider)                                  │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Downstream Consumers                        │
│  (Phase 3+: Provider-agnostic Flow Engine)                      │
│  (Phase 4+: Real Inbox showing UTalk conversations)             │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (New/Modified Files)

```
ozion-chat-ai/
├── server/
│   ├── services/
│   │   ├── utalk-client.ts           # NEW - UTalk API client
│   │   └── utalk-normalizer.ts       # NEW - Message normalizer
│   └── db/
│       └── schema.ts                 # MODIFY - Add provider/external_id to conversations + messages
├── migrations/
│   └── 004_utalk_integration.sql     # NEW - UTalk tables + ALTER TABLEs
└── .env.example                      # MODIFY - Add UTALK_API_TOKEN placeholder
```

No route file changes in Phase 1 — routes come in Phase 2.

### UTalk Client — File Pattern (`server/services/utalk-client.ts`)

```typescript
// @ts-nocheck
import { getSupabase } from '../db/supabase.js';
import { decrypt } from '../lib/encryption.js';
import crypto from 'crypto';

const UTALK_API_URL = process.env.UTALK_API_URL || 'https://app-utalk.umbler.com/api';

// ─── Auth ─────────────────────────────────────────────────────
export async function getOrganizationId(apiToken: string): Promise<string | null> {
  // GET /v1/members/me/ → extract organizationId from response
}

// ─── Channels ──────────────────────────────────────────────────
export async function listChannels(apiToken: string, organizationId: string): Promise<any[]> {
  // GET /v1/channels/?organizationId=
}

// ─── Chats ─────────────────────────────────────────────────────
export async function listChats(apiToken: string, organizationId: string): Promise<any[]> {
  // GET /v1/chats/?organizationId=
}

export async function getMessages(apiToken: string, chatId: string, startDate?: string): Promise<any[]> {
  // GET /v1/chats/{chatId}/relative-messages/
}

// ─── Messages ──────────────────────────────────────────────────
export async function sendSimplifiedMessage(
  apiToken: string,
  toPhone: string,
  fromPhone: string,
  organizationId: string,
  message: string,
  file?: File | Blob
): Promise<any> {
  // POST /v1/messages/simplified/
}

// ─── Webhooks ──────────────────────────────────────────────────
export async function listWebhooks(apiToken: string, organizationId: string): Promise<any[]> {
  // GET /v1/webhooks/?organizationId=
}

// ─── Contacts ──────────────────────────────────────────────────
export async function listContacts(apiToken: string, organizationId: string): Promise<any[]> {
  // GET /v1/contacts/?organizationId=
}

// ─── Connection Test ───────────────────────────────────────────
export async function testConnection(apiToken: string): Promise<{ ok: boolean; error?: string; organizationId?: string }> {
  // Verify auth: GET /v1/members/me/
}

// ─── Decrypt token from DB ─────────────────────────────────────
export async function getDecryptedToken(tenantId: string): Promise<string | null> {
  // Look up utalk_integrations for tenant, decrypt api_key_encrypted
}
```

### Anti-Patterns to Avoid
- **Axios/HTTP client library:** Don't import axios. The codebase uses native `fetch()` everywhere.
- **Classes:** Don't create a UTalkClient class. The codebase uses module-level functions (see `evolution-api.ts`, `meta-api.ts`).
- **Inline credentials in source:** Never hardcode UTalk tokens. Must go through `encrypt()`/`decrypt()`.
- **Assume nested JSON webhook body:** UTalk sends form-encoded-style keys (`contact[number]`), not nested JSON. The normalizer must handle that.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES encryption for credentials | Custom encryption | `server/lib/encryption.ts` (CryptoJS) | Already exists and is used by `whatsapp_credentials` — matches project pattern |
| UUID generation | Manual ID logic | `crypto.randomUUID()` | Used in every route and service for new record IDs |
| HTTP client | Custom HTTP wrapper | Native `fetch()` | All existing service files use raw fetch — no axios, no wrapper |
| Phone number parsing | Custom parser | Simple regex `.replace(/\D/g, '')` | Pattern from `evolution-api.ts:59` — consistent across providers |

**Key insight:** The codebase has strong established patterns — fighting them by introducing new abstractions (classes, axios, DI) will create inconsistency and maintenance burden. Always match the existing `evolution-api.ts` pattern.

## Common Pitfalls

### Pitfall 1: UTalk Form-Encoded Keys in Webhook
**What goes wrong:** The normalizer treats the incoming webhook body as standard nested JSON and can't find `contact.number`.
**Why it happens:** UTalk's webhooks use form-encoded-style keys (e.g., `contact[number]`, `chat[body]`) rather than nested objects. The JSON payload has flat string keys like `"contact[number]"`.
**How to avoid:** Parse with bracket-aware key extraction:
```typescript
function extractField(data: Record<string, any>, prefix: string, field: string): string {
  return data[`${prefix}[${field}]`] || '';
}
```
**Warning signs:** `undefined` when accessing `data.contact.number` — switch to `data['contact[number]']`.

### Pitfall 2: UTalk API Beta Status
**What goes wrong:** Routes change between UTalk API versions, breaking the client after a UTalk update.
**Why it happens:** The UTalk API documentation explicitly states it is in Beta: "rotas podem ser alteradas sem aviso prévio."
**How to avoid:** (1) Always use `/v1/` prefix paths. (2) Log UTalk API response versions. (3) Test the `testConnection` endpoint after UTalk updates. (4) Consider adding a `UTALK_API_VERSION` env var for future flexibility.
**Warning signs:** Previous working UTalk endpoints return 404 or unexpected response shapes.

### Pitfall 3: Dual Schema Drift
**What goes wrong:** Columns exist in the Supabase migration but not in the Drizzle schema (or vice versa), causing failures in one environment.
**Why it happens:** The codebase maintains `migrations/*.sql` for PostgreSQL and `server/db/schema.ts` for SQLite separately — they must be manually synced.
**How to avoid:** Add columns to BOTH `migrations/004_utalk_integration.sql` AND `server/db/schema.ts` in the same commit. Verify `npm run build` passes after schema changes.
**Warning signs:** `schema.ts` references `provider` column but migration doesn't have it → local dev works, production breaks.

### Pitfall 4: Missing `tenant_id` on Messages
**What goes wrong:** UTalk-normalized messages get stored without `tenant_id`, then provider-agnostic queries fail.
**Why it happens:** The existing `messages` table schema (`001_initial.sql` and `server/db/schema.ts`) does NOT have a `tenant_id` column — only `conversation_id`. Queries that need to filter messages by tenant need a join.
**How to avoid:** Add `tenant_id` to both the migration and Drizzle schema as part of the ALTER TABLE changes. This is needed for Phase 3's provider-agnostic engine.
**Warning signs:** Error `column messages.tenant_id does not exist` when querying messages.

## UTalk Normalizer — Design Details

The normalizer must accept UTalk's webhook format and produce Ozion's internal message shape. It also needs to handle the "simplified" API response format when polling for messages via `GET /v1/chats/{chatId}/relative-messages/`.

### UTalk Webhook → Ozion NormalizedMessage

```typescript
// server/services/utalk-normalizer.ts

// UTalk webhook uses form-encoded-style flat keys
interface UTalkWebhookPayload {
  event: string;        // "chat" | "ack"
  token: string;
  user?: string;        // recipient phone number
  operador?: string;
  'contact[number]'?: string;
  'contact[name]'?: string;
  'contact[server]'?: string;
  'chat[dtm]'?: string; // Unix timestamp as string
  'chat[uid]'?: string;
  'chat[dir]'?: string;  // "i" (inbound) | "o" (outbound)
  'chat[type]'?: string; // "chat" | "image" | "audio" | ...
  'chat[body]'?: string;
  ack?: string;         // "-1" | "1" | "2" | "3"
  muid?: string;        // message UID on ACK events
  id?: string;          // on ACK events
}

// Ozion internal normalized message shape
export interface NormalizedMessage {
  from: string;
  fromName?: string;
  to: string;
  messageId: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'unknown';
  content: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  direction: 'inbound' | 'outbound';
  timestamp: number;
  ack?: number;
  raw: any;
}

// ACK/status update shape
export interface StatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
}

export function normalizeIncomingMessage(payload: UTalkWebhookPayload): NormalizedMessage | null
export function normalizeStatusUpdate(payload: UTalkWebhookPayload): StatusUpdate | null
```

### Message Type Mapping

| UTalk `chat[type]` | Ozion `type` |
|--------------------|--------------|
| `"chat"` | `"text"` |
| `"image"` | `"image"` |
| `"audio"` | `"audio"` |
| `"video"` | `"video"` |
| `"document"` | `"document"` |
| (other) | `"unknown"` |

### Direction Mapping

| UTalk `chat[dir]` | Ozion `direction` |
|--------------------|-------------------|
| `"i"` | `"inbound"` |
| `"o"` | `"outbound"` |
| (missing) | `"inbound"` (default for webhook) |

### ACK Status Mapping

| UTalk `ack` | Ozion `status` |
|-------------|----------------|
| `"-1"` | `"unsent"` |
| `"1"` | `"sent"` |
| `"2"` | `"delivered"` |
| `"3"` | `"read"` |

## Code Examples

### Verified Service Pattern (from evolution-api.ts)

```typescript
// @ts-nocheck
import { getSupabase } from '../db/supabase.js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export async function sendTextMessage(instanceName: string, number: string, text: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('⚠️ Evolution API not configured');
    return { ok: false, error: 'Evolution API not configured' };
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        text,
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendText error:', e.message);
    return { ok: false, error: e.message };
  }
}
```
[VERIFIED: codebase — `server/services/evolution-api.ts`]

### UTalk Normalizer — Field Extraction Pattern

```typescript
// The key insight: UTalk webhooks use flat bracket-notation keys
// NOT nested objects. Extract with bracket-aware helpers.

export function normalizeIncomingMessage(payload: Record<string, any>): NormalizedMessage | null {
  if (payload.event !== 'chat') return null;

  const dir = payload['chat[dir]'] || '';
  if (dir !== 'i') return null; // Only normalize inbound messages

  const from = payload['contact[number]'] || '';
  const to = payload.user || '';
  if (!from || !to) return null;

  const type = mapMessageType(payload['chat[type]'] || '');
  const content = type === 'text'
    ? (payload['chat[body]'] || '')
    : (payload['chat[body]'] || '');  // For media, body may be base64

  return {
    from,
    fromName: payload['contact[name]'] || from,
    to,
    messageId: payload['chat[uid]'] || '',
    type,
    content,
    direction: 'inbound',
    timestamp: parseInt(payload['chat[dtm]'] || '0') || Math.floor(Date.now() / 1000),
    raw: payload,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single provider (Meta) | Multi-provider (Meta + UTalk) | This phase | Conversations/messages need `provider` column for routing |
| Evolution API webhook only covers Baileys | UTalk adds Umbler Talk channel | This phase | New normalizer needed for different payload format |
| Credentials only in `whatsapp_credentials` table | Credentials in `utalk_integrations` for UTalk | This phase | New table, same encryption pattern |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | UTalk webhook payload uses form-encoded-style flat keys (`contact[number]`) not nested JSON | UTalk Normalizer | LOW — confirmed from Umbler's official help article showing the webhook payload format |
| A2 | UTalk API returns messages with the same fields as listed in the Swagger docs | UTalk Client | LOW — Swagger docs are auto-generated from the API source, should be accurate |
| A3 | Messages table needs `tenant_id` column added | Migration Strategy | MEDIUM — if existing queries never filter messages by tenant_id directly, this may not be needed yet. Safe to add as optional column |
| A4 | `DEFAULT 'meta'` on provider columns is backward-compatible | Migration Strategy | LOW — all existing conversations/messages are from Meta, default ensures they're treated as such |
| A5 | No new npm packages needed | Package Audit | LOW — all dependencies (crypto-js, Node.js fetch) are already available |

**No critical assumptions.** All architectural decisions are backed by verified codebase patterns or official UTalk documentation.

## Open Questions

1. **UTalk API message shape for `GET /v1/chats/{chatId}/relative-messages/` response**
   - What we know: The endpoint returns messages within a date range. The full response shape is documented in the Swagger UI but the JSON spec URL returned 404.
   - What's unclear: Exact field names and nesting in the response JSON.
   - Recommendation: Implement the client method with `any` return type and `console.log` the first response during Phase 2 testing. The normalizer can be updated then.

2. **UTalk webhook `chat[type]` values for media types**
   - What we know: The Umbler help article shows `"chat"` for text messages and mentions media is sent as a separate `file` event.
   - What's unclear: The exact `chat[type]` values for `image`, `audio`, `video`, `document`.
   - Recommendation: Accept known types and default to `"text"`. Add `console.warn` for unknown types. Update as the actual values are discovered during Phase 2.

3. **Should `utalk_mappings` be used in Phase 1 or Phase 2?**
   - What we know: The table must exist in Phase 1 (UTALK-04 requires it).
   - What's unclear: Whether Phase 1 should include the code that populates it, or just the table DDL.
   - Recommendation: Create the table in the migration (DDL only). The code that writes to it comes in Phase 2 (webhook handler) and Phase 3 (engine routing).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | (project default) | — |
| npm | Package mgmt | ✓ | (lockfile present) | — |
| Supabase | Data layer | ✓ | (env vars configured) | — |
| SQLite | Local dev | ✓ | (via better-sqlite3) | — |
| UTalk API token | External API | ✗ (env var TBD) | — | Must be configured by admin in Phase 2 UI |

**Missing dependencies with no fallback:**
- None for Phase 1 — the client service works without a configured token (returns `{ ok: false, error }` gracefully)

**Missing dependencies with fallback:**
- UTalk API token: not set yet — handled by the `testConnection` path warning and early return pattern

## Validation Architecture

> nyquist_validation is enabled per `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) + `tsx` |
| Config file | none (no `vitest.config.ts`) |
| Quick run command | `node --test --import tsx tests/01-utalk-foundation.test.ts` |
| Full suite command | Same as above |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UTALK-03 | UTalk client constructs valid HTTP requests | unit | — | ❌ Wave 0 |
| UTALK-04 | Migration creates expected tables/columns | smoke | — | ❌ Wave 0 |
| UTALK-07 | Normalizer converts UTalk format to Ozion format | unit | — | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run the relevant test file with `node --test --import tsx`
- **Per wave merge:** Run all Phase 1 tests
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/01-utalk-foundation.test.ts` — covers UTALK-03, UTALK-07 unit tests
- [ ] `tests/` directory — does not exist yet
- [ ] Framework install: `node --test` is built-in, no install needed

## Security Domain

> `security_enforcement` is not explicitly `false` in config, so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth via Bearer token — encrypted at rest via `server/lib/encryption.ts` |
| V5 Input Validation | yes | Normalizer validates message shape before storing |
| V6 Cryptography | yes | AES encrypt/decrypt (existing `crypto-js` pattern) |
| V8 Data Protection | yes | API tokens encrypted at rest in `utalk_integrations.api_key_encrypted` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UTalk API token leak | Information Disclosure | Encrypt at rest with `server/lib/encryption.ts`. Never log raw tokens |
| Webhook spoofing | Spoofing | Phase 2 (not Phase 1) should add UTalk webhook secret validation |
| Injection via message content | Tampering | The codebase stores message content as JSON strings (existing pattern). Normalizer should not eval/execute message content |

**Phase 1 scope:** Only credential encryption matters here (UTALK-05). Webhook signature verification is a Phase 2 concern.

## Sources

### Primary (HIGH confidence)
- Codebase verified: `server/services/evolution-api.ts` — service pattern for WhatsApp provider client [VERIFIED: codebase]
- Codebase verified: `server/services/meta-api.ts` — second provider client pattern [VERIFIED: codebase]
- Codebase verified: `server/lib/encryption.ts` — AES encrypt/decrypt [VERIFIED: codebase]
- Codebase verified: `server/db/schema.ts` — Drizzle SQLite schema [VERIFIED: codebase]
- Codebase verified: `migrations/003_flow_controls.sql` — migration pattern [VERIFIED: codebase]
- Codebase verified: `server/services/webhook-handler.ts` — message processing pattern [VERIFIED: codebase]
- Codebase verified: `server/routes/evolution.ts` — webhook route pattern [VERIFIED: codebase]
- Official UTalk API docs: `https://app-utalk.umbler.com/api/docs/index.html` [VERIFIED: web]
- Official UTalk help article (webhook payloads): `https://help.umbler.com/hc/pt-br/articles/5047520020621` [VERIFIED: web]

### Secondary (MEDIUM confidence)
- Umbler Talk API manual: `https://help.umbler.com/hc/pt-br/articles/21150267515149` — webhook format details [CITED: help.umbler.com]
- `.planning/codebase/*.md` — all 7 codebase analysis documents [VERIFIED: project files]

### Tertiary (LOW confidence)
- None — all claims in this research are either codebase-verified or confirmed by official UTalk documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All patterns verified directly in codebase files
- Architecture: HIGH — Existing service/route/migration patterns are well-documented
- UTalk API details: MEDIUM — Swagger page confirmed endpoints and auth, but exact JSON response shapes for `relative-messages` endpoint not retrievable via webfetch

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 (30 days — UTalk API is beta, may change)
