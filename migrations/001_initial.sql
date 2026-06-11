-- Ozion Chat AI - PostgreSQL Schema for Supabase
-- Run this via Supabase SQL Editor or API

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_master INTEGER DEFAULT 0,
  plan_id TEXT,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'agent' NOT NULL,
  permissions TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  max_contacts INTEGER DEFAULT 0,
  max_flows INTEGER DEFAULT 0,
  max_workspaces INTEGER DEFAULT 1,
  max_phone_numbers INTEGER DEFAULT 1,
  max_agents INTEGER DEFAULT 0,
  max_voices INTEGER DEFAULT 0,
  max_executions INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT 1,
  max_integrations INTEGER DEFAULT 0,
  features TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  document TEXT,
  company TEXT,
  plan_id TEXT,
  status TEXT DEFAULT 'active',
  max_contacts INTEGER DEFAULT 0,
  max_flows INTEGER DEFAULT 0,
  max_workspaces INTEGER DEFAULT 1,
  max_phone_numbers INTEGER DEFAULT 1,
  max_agents INTEGER DEFAULT 0,
  max_voices INTEGER DEFAULT 0,
  max_executions INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 0,
  max_users INTEGER DEFAULT 1,
  max_integrations INTEGER DEFAULT 0,
  settings TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_id TEXT REFERENCES customers(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- CRM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  wa_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  tags TEXT DEFAULT '[]',
  custom_fields TEXT DEFAULT '{}',
  lead_source TEXT,
  lead_status TEXT DEFAULT 'new',
  lead_score INTEGER DEFAULT 0,
  lead_temperature TEXT,
  ai_summary TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  creative_id TEXT,
  assigned_to TEXT,
  last_message_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_fields (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- CHAT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  workspace_id TEXT,
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  phone_number_id TEXT,
  contact_wa_id TEXT,
  status TEXT DEFAULT 'open' NOT NULL,
  is_ctwa INTEGER DEFAULT 0,
  ctwa_clid TEXT,
  ad_id TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  creative_id TEXT,
  is_ai_active INTEGER DEFAULT 0,
  assigned_to TEXT,
  flow_id TEXT,
  started_at TEXT DEFAULT (now())::text NOT NULL,
  last_message_at TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  external_id TEXT,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  status TEXT,
  error_code INTEGER,
  error_message TEXT,
  metadata TEXT DEFAULT '{}',
  sent_at TEXT DEFAULT (now())::text NOT NULL,
  delivered_at TEXT,
  read_at TEXT
);

-- ============================================================
-- FLOW BUILDER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  workspace_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  category TEXT,
  is_active INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS flow_blocks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  flow_id TEXT NOT NULL REFERENCES flows(id),
  type TEXT NOT NULL,
  label TEXT,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS flow_edges (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  flow_id TEXT NOT NULL REFERENCES flows(id),
  source_block_id TEXT NOT NULL,
  target_block_id TEXT NOT NULL,
  label TEXT,
  condition TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- AI & VOICE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  identity TEXT DEFAULT 'Você é um assistente virtual',
  objective TEXT,
  communication TEXT,
  instructions TEXT,
  restrictions TEXT,
  faq TEXT DEFAULT '[]',
  knowledge_base TEXT DEFAULT '[]',
  objections TEXT DEFAULT '[]',
  offers TEXT DEFAULT '[]',
  memory TEXT DEFAULT '{}',
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,
  voice_id TEXT,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS voices (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- WHATSAPP TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_credentials (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
  business_id TEXT,
  business_name TEXT,
  waba_id TEXT,
  waba_name TEXT,
  page_id TEXT,
  phone_number_id TEXT,
  display_phone_number TEXT,
  access_token_encrypted TEXT,
  app_id TEXT,
  app_secret_encrypted TEXT,
  webhook_verify_token TEXT,
  phone_number_verified INTEGER DEFAULT 0,
  messaging_tier TEXT DEFAULT 'UNVERIFIED',
  quality_rating TEXT,
  is_on_biz_app INTEGER DEFAULT 0,
  connected_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT DEFAULT '[]',
  secret TEXT,
  status TEXT DEFAULT 'active',
  last_triggered_at TEXT,
  last_error TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- SALES & CTWA TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT REFERENCES contacts(id),
  conversation_id TEXT,
  product TEXT,
  amount REAL,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending',
  provider TEXT,
  provider_sale_id TEXT,
  commission REAL,
  campaign_id TEXT,
  ad_id TEXT,
  is_ctwa INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  sold_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS ctwa_attributions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  contact_id TEXT,
  conversation_id TEXT,
  ctwa_clid TEXT NOT NULL UNIQUE,
  ad_id TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  creative_id TEXT,
  headline TEXT,
  body TEXT,
  media_type TEXT,
  source_app TEXT,
  first_message_at TEXT,
  lead_qualified_at TEXT,
  purchase_at TEXT,
  conversion_sent_to_meta INTEGER DEFAULT 0,
  conversion_event_name TEXT,
  conversion_event_time TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- INTEGRATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  api_version TEXT,
  credentials TEXT DEFAULT '{}',
  settings TEXT DEFAULT '{}',
  last_checked_at TEXT,
  last_error TEXT,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_versions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  provider TEXT NOT NULL UNIQUE,
  current_version TEXT NOT NULL,
  latest_version TEXT,
  status TEXT DEFAULT 'stable',
  impact TEXT,
  changelog TEXT,
  last_checked_at TEXT,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- ANALYTICS & LOGS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_words (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  word TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  flow_id TEXT,
  block_id TEXT,
  event TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  value REAL,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT,
  workspace_id TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  provider TEXT,
  status TEXT NOT NULL,
  request_data TEXT,
  response_data TEXT,
  error_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS system_health (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  component TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'online' NOT NULL,
  message TEXT,
  last_checked_at TEXT DEFAULT (now())::text,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  customer_id TEXT REFERENCES customers(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT DEFAULT 'active',
  current_period_start TEXT,
  current_period_end TEXT,
  canceled_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- DEPLOY SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS changelogs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  module TEXT NOT NULL,
  author TEXT DEFAULT 'system',
  environment TEXT DEFAULT 'production',
  is_published INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  size INTEGER DEFAULT 0,
  file_path TEXT,
  modules TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now())::text NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'active',
  is_core INTEGER DEFAULT 0,
  dependencies TEXT DEFAULT '[]',
  last_updated TEXT DEFAULT (now())::text,
  created_at TEXT DEFAULT (now())::text NOT NULL,
  updated_at TEXT DEFAULT (now())::text NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  version TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  branch TEXT,
  commit_hash TEXT,
  commit_message TEXT,
  deployed_by TEXT DEFAULT 'system',
  build_log TEXT,
  rollback_version TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (now())::text NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts(tags);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_clid ON ctwa_attributions(ctwa_clid);
CREATE INDEX IF NOT EXISTS idx_ctwa_tenant ON ctwa_attributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flows_tenant ON flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flow_blocks_flow ON flow_blocks(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tenant
INSERT INTO tenants (id, name, slug, is_master, created_at, updated_at)
VALUES ('default', 'Ozion Master', 'ozion-master', 1, now()::text, now()::text)
ON CONFLICT (slug) DO NOTHING;

-- Admin user
INSERT INTO users (id, tenant_id, email, name, role, is_active, created_at, updated_at)
VALUES ('admin-1', 'default', 'admin@ozion.com', 'Admin Master', 'admin', 1, now()::text, now()::text)
ON CONFLICT (email) DO NOTHING;

-- Plans
INSERT INTO plans (id, name, slug, description, price, max_contacts, max_flows, max_workspaces, max_phone_numbers, max_agents, max_voices, max_executions, max_tokens, max_users, max_integrations, features, created_at, updated_at) VALUES
('plan-start', 'Start', 'start', 'Para quem está começando', 97, 1000, 5, 1, 1, 1, 1, 5000, 100000, 1, 2, '["WhatsApp","CRM","1 Agente IA","5 Fluxos","Analytics básico"]', now()::text, now()::text),
('plan-pro', 'Pro', 'pro', 'Para negócios em crescimento', 297, 10000, 50, 3, 5, 10, 10, 50000, 1000000, 5, 10, '["Tudo do Start","50 Fluxos","10 Agentes IA","Voice Studio","CTWA","Analytics avançado","Vendas"]', now()::text, now()::text),
('plan-scale', 'Scale', 'scale', 'Para operações grandes', 797, 100000, 999, 10, 20, 50, 50, 500000, 10000000, 20, 30, '["Tudo do Pro","Ilimitado","White-label","API completa","Suporte prioritário"]', now()::text, now()::text),
('plan-enterprise', 'Enterprise', 'enterprise', 'Sob medida para empresas', 2997, 999999, 999, 999, 999, 999, 999, 999999, 999999999, 999, 999, '["Tudo","Dedicado","SLA 99.9%","Infra dedicada"]', now()::text, now()::text)
ON CONFLICT (slug) DO NOTHING;

-- Modules
INSERT INTO modules (id, name, display_name, description, version, status, is_core, created_at, updated_at) VALUES
('mod-crm', 'crm', 'CRM', 'Gerenciamento de contatos e pipeline', '1.0.0', 'active', 1, now()::text, now()::text),
('mod-chat', 'chat', 'Chat ao Vivo', 'Chat em tempo real com clientes', '1.0.0', 'active', 1, now()::text, now()::text),
('mod-flows', 'flows', 'Flow Builder', 'Construtor de fluxos de automação', '1.0.0', 'active', 1, now()::text, now()::text),
('mod-agents', 'agents', 'Agentes IA', 'Agentes inteligentes com IA', '1.0.0', 'active', 1, now()::text, now()::text),
('mod-voice', 'voice', 'Voice Studio', 'Estúdio de clonagem de voz', '1.0.0', 'active', 0, now()::text, now()::text),
('mod-ctwa', 'ctwa', 'CTWA', 'Click-to-WhatsApp Ads tracking', '1.0.0', 'active', 0, now()::text, now()::text),
('mod-sales', 'sales', 'Vendas', 'Gestão de vendas e funil', '1.0.0', 'active', 0, now()::text, now()::text),
('mod-analytics', 'analytics', 'Analytics', 'Análise e relatórios', '1.0.0', 'active', 0, now()::text, now()::text),
('mod-integrations', 'integrations', 'Integrações', 'Integrações externas', '1.0.0', 'active', 0, now()::text, now()::text)
ON CONFLICT (name) DO NOTHING;

-- Changelog
INSERT INTO changelogs (id, version, title, description, type, module, author, environment, is_published, published_at, created_at) VALUES
('cl-1', '1.0.0', 'Lançamento da plataforma Ozion Chat AI', 'Versão inicial com todas as funcionalidades core: CRM, Chat, Flow Builder, Agentes IA, Voice Studio, CTWA, Vendas, Analytics e Integrações.', 'feature', 'core', 'Ozion Team', 'production', 1, now()::text, now()::text),
('cl-2', '1.0.0', 'Sistema de deploy e versionamento', 'CI/CD com GitHub Actions, deploy automático para Vercel, backups, changelog e centro de atualizações.', 'feature', 'integrations', 'Ozion Team', 'production', 1, now()::text, now()::text);

-- Initial deployment
INSERT INTO deployments (id, version, environment, status, branch, commit_hash, commit_message, deployed_by, started_at, completed_at, created_at) VALUES
('dep-1', '1.0.0', 'production', 'completed', 'main', 'initial', 'Initial release v1.0.0', 'system', now()::text, now()::text, now()::text);

SELECT '✅ Schema and seed data created successfully!' as result;
