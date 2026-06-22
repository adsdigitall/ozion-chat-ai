-- CRM contact timeline primitives

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
