-- Add provider column to distinguish between Meta and Evolution
ALTER TABLE whatsapp_credentials ADD COLUMN provider TEXT NOT NULL DEFAULT 'meta';
ALTER TABLE whatsapp_credentials ADD COLUMN instance_name TEXT;
ALTER TABLE whatsapp_credentials ADD COLUMN evolution_api_url TEXT;
ALTER TABLE whatsapp_credentials ADD COLUMN evolution_api_key TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_provider ON whatsapp_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_instance ON whatsapp_credentials(instance_name);
