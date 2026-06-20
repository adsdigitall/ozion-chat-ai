-- Message status history for complete delivery tracking
CREATE TABLE IF NOT EXISTS message_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  error_message TEXT,
  error_code INTEGER,
  raw JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_status_events_message
  ON message_status_events(message_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_status_events_tenant
  ON message_status_events(tenant_id, occurred_at DESC);

-- Add failed_at column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_at TEXT;
