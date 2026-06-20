-- Create webhook_events table for idempotent webhook processing
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL DEFAULT 'meta',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'message',
  payload JSONB NOT NULL DEFAULT '{}',
  raw_body_hash TEXT,
  signature_valid BOOLEAN,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','processed','failed','ignored','duplicate')),
  attempts INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: unique per (tenant_id, provider, event_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_idempotency
  ON webhook_events(tenant_id, provider, event_id);

-- Lookup by status for retry/reprocessing
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON webhook_events(tenant_id, status, received_at DESC);

-- Lookup by provider's external identifier (phone_number_id or instance_name)
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
  ON webhook_events(provider, received_at DESC);

-- Quick duplicate check by raw body hash
CREATE INDEX IF NOT EXISTS idx_webhook_events_body_hash
  ON webhook_events(raw_body_hash)
  WHERE raw_body_hash IS NOT NULL;
