-- Ozion Chat AI - SaaS Multi-Tenant Schema
-- Run this via Supabase SQL Editor

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Sessions table for JWT management
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- Audit logs for all actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL,
  customer_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- SaaS revenue tracking
CREATE TABLE IF NOT EXISTS saas_revenue (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  plan_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  gateway TEXT,
  gateway_payment_id TEXT,
  invoice_number TEXT,
  due_date TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- Per-customer module access control
CREATE TABLE IF NOT EXISTS modules_enabled (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  module_name TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  custom_settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  UNIQUE(customer_id, module_name)
);

-- Customer usage tracking
CREATE TABLE IF NOT EXISTS customer_usage (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  metric TEXT NOT NULL,
  value REAL DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  UNIQUE(customer_id, metric, period_start)
);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Add customer_id to users for client impersonation
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);

-- Add more fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_access_at TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS token_usage REAL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS voice_usage REAL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS storage_usage REAL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]';

-- Add customer_id to all data tables for multi-tenant isolation
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE flows ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE voices ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
ALTER TABLE whatsapp_credentials ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_saas_revenue_tenant ON saas_revenue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_revenue_customer ON saas_revenue(customer_id);
CREATE INDEX IF NOT EXISTS idx_saas_revenue_status ON saas_revenue(status);
CREATE INDEX IF NOT EXISTS idx_modules_enabled_customer ON modules_enabled(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_usage_customer ON customer_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_flows_customer ON flows(customer_id);
CREATE INDEX IF NOT EXISTS idx_agents_customer ON agents(customer_id);
CREATE INDEX IF NOT EXISTS idx_voices_customer ON voices(customer_id);
CREATE INDEX IF NOT EXISTS idx_tags_customer ON tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_integrations_customer ON integrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_customer ON users(customer_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Update admin user with password hash (admin123)
UPDATE users SET password_hash = '$2b$10$placeholder_hash_will_be_replaced_by_backend' WHERE id = 'admin-1';

-- Enable all modules for master tenant
INSERT INTO modules_enabled (customer_id, module_name, is_enabled)
SELECT 'master', name, 1 FROM modules
ON CONFLICT DO NOTHING;

SELECT '✅ SaaS multi-tenant schema created successfully!' as result;
