
-- ============================================
-- OZION CHAT AI - Database Schema
-- Multi-tenant SaaS with Row Level Security
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- WORKSPACES (Multi-tenant root)
-- ============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  logo TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS & ROLES
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('master', 'admin', 'agent', 'viewer')),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- ============================================
-- CONTACTS (CRM)
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'interested', 'qualified', 'proposal', 'won', 'lost', 'risk')),
  origin TEXT,
  campaign TEXT,
  adset TEXT,
  ad TEXT,
  creative TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  ai_summary TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_tags (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- ============================================
-- WHATSAPP CONNECTIONS
-- ============================================
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  business_id TEXT,
  access_token TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  type TEXT DEFAULT 'cloud_api' CHECK (type IN ('cloud_api', 'qrcode')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'instagram', 'facebook', 'web')),
  phone_number TEXT,
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed')),
  assigned_to UUID REFERENCES users(id),
  flow_id UUID,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_tags (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'template', 'flow', 'location', 'contact')),
  sender TEXT NOT NULL CHECK (sender IN ('contact', 'agent', 'ai', 'system')),
  sender_name TEXT,
  sender_id UUID,
  media_url TEXT,
  media_type TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FLOWS (Flow Builder)
-- ============================================
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  trigger_type TEXT CHECK (trigger_type IN ('keyword', 'flow', 'api', 'webhook', 'schedule')),
  trigger_config JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI AGENTS
-- ============================================
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT,
  provider TEXT DEFAULT 'openai' CHECK (provider IN ('openai', 'gemini', 'claude', 'deepseek', 'groq', 'dify')),
  model TEXT DEFAULT 'gpt-4o',
  prompt TEXT NOT NULL,
  objective TEXT,
  rules JSONB DEFAULT '[]',
  knowledge_base JSONB DEFAULT '[]',
  memory BOOLEAN DEFAULT true,
  max_tokens INTEGER DEFAULT 4096,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  conversations_handled INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE CONFIGURATIONS
-- ============================================
CREATE TABLE voice_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('elevenlabs', 'openai', 'cartesia')),
  voice_id TEXT,
  language TEXT DEFAULT 'pt-BR',
  gender TEXT,
  style TEXT,
  config JSONB DEFAULT '{}',
  is_cloned BOOLEAN DEFAULT false,
  clone_source_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAMPAIGNS (CTWA)
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'meta' CHECK (platform IN ('meta', 'google', 'tiktok')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  budget DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  cpa DECIMAL(12,2) DEFAULT 0,
  roi DECIMAL(8,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  external_id TEXT,
  config JSONB DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTEGRATIONS
-- ============================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB DEFAULT '{}',
  credentials JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, type)
);

-- ============================================
-- SALES
-- ============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  amount DECIMAL(12,2) NOT NULL,
  platform TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'pending')),
  product TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HEALTH CHECKS
-- ============================================
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'unstable', 'error')),
  latency INTEGER,
  details JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUICK REPLIES (Templates)
-- ============================================
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_workspace ON users(workspace_id);
CREATE INDEX idx_users_auth ON users(auth_id);
CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX idx_contacts_phone ON contacts(workspace_id, phone);
CREATE INDEX idx_contacts_status ON contacts(workspace_id, status);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_status ON conversations(workspace_id, status);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_flows_workspace ON flows(workspace_id);
CREATE INDEX idx_ai_agents_workspace ON ai_agents(workspace_id);
CREATE INDEX idx_integrations_workspace ON integrations(workspace_id);
CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_sales_workspace ON sales(workspace_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_health_checks_service ON health_checks(service, checked_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

-- Workspace isolation policy (users can only see their workspace data)
CREATE POLICY workspace_isolation ON contacts
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON conversations
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON messages
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE workspace_id IN (
      SELECT workspace_id FROM users WHERE auth_id = auth.uid()
    )
  ));

CREATE POLICY workspace_isolation ON flows
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON audit_logs
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON integrations
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON campaigns
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON sales
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON tags
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON whatsapp_connections
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON voice_configs
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON ai_agents
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY workspace_isolation ON quick_replies
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE auth_id = auth.uid()
  ));

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON flows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON whatsapp_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
