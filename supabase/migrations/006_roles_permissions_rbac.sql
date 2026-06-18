-- OZION - RBAC foundation: roles, permissions, route/menu access.

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

INSERT INTO public.roles (key, name, description, level)
VALUES
  ('admin_master', 'Admin Master', 'Acesso total à plataforma Ozion.', 100),
  ('client', 'Cliente', 'Dono do workspace, com acesso aos recursos do próprio ambiente.', 80),
  ('manager', 'Gestor', 'Gerencia operação, vendas, atendimento e automações.', 60),
  ('attendant', 'Atendente', 'Atendimento e acompanhamento básico de clientes.', 30)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  updated_at = NOW();

INSERT INTO public.permissions (key, name, description, category)
VALUES
  ('dashboard.view', 'Ver Dashboard', 'Acessar indicadores gerais.', 'dashboard'),
  ('chat.view', 'Ver Chat ao Vivo', 'Acessar conversas e atendimento.', 'chat'),
  ('crm.view', 'Ver CRM', 'Acessar contatos e oportunidades.', 'crm'),
  ('flows.view', 'Ver Fluxos', 'Acessar automações e fluxos.', 'automation'),
  ('agents.view', 'Ver Agentes IA', 'Acessar agentes de inteligência artificial.', 'ai'),
  ('voice.view', 'Ver Voice Studio', 'Acessar recursos de voz.', 'voice'),
  ('ctwa.view', 'Ver CTWA', 'Acessar configuração de anúncios Click-to-WhatsApp.', 'marketing'),
  ('campaigns.view', 'Ver Campanhas', 'Acessar campanhas.', 'marketing'),
  ('analytics.view', 'Ver Analytics', 'Acessar relatórios e análises.', 'analytics'),
  ('sales.view', 'Ver Vendas', 'Acessar vendas.', 'sales'),
  ('integrations.view', 'Ver Integrações', 'Acessar integrações.', 'integrations'),
  ('whatsapp.view', 'Ver WhatsApp', 'Acessar dispositivos WhatsApp.', 'whatsapp'),
  ('workspaces.view', 'Ver Workspaces', 'Acessar administração de workspaces.', 'admin'),
  ('users.view', 'Ver Usuários', 'Acessar usuários e permissões.', 'admin'),
  ('plans.view', 'Ver Planos', 'Acessar planos.', 'billing'),
  ('settings.view', 'Ver Configurações', 'Acessar configurações.', 'settings'),
  ('logs.view', 'Ver Logs', 'Acessar logs e auditoria.', 'admin')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

WITH grants(role_key, permission_key) AS (
  VALUES
    ('admin_master', 'dashboard.view'),
    ('admin_master', 'chat.view'),
    ('admin_master', 'crm.view'),
    ('admin_master', 'flows.view'),
    ('admin_master', 'agents.view'),
    ('admin_master', 'voice.view'),
    ('admin_master', 'ctwa.view'),
    ('admin_master', 'campaigns.view'),
    ('admin_master', 'analytics.view'),
    ('admin_master', 'sales.view'),
    ('admin_master', 'integrations.view'),
    ('admin_master', 'whatsapp.view'),
    ('admin_master', 'workspaces.view'),
    ('admin_master', 'users.view'),
    ('admin_master', 'plans.view'),
    ('admin_master', 'settings.view'),
    ('admin_master', 'logs.view'),
    ('client', 'dashboard.view'),
    ('client', 'chat.view'),
    ('client', 'crm.view'),
    ('client', 'flows.view'),
    ('client', 'agents.view'),
    ('client', 'voice.view'),
    ('client', 'ctwa.view'),
    ('client', 'campaigns.view'),
    ('client', 'analytics.view'),
    ('client', 'sales.view'),
    ('client', 'integrations.view'),
    ('client', 'whatsapp.view'),
    ('client', 'settings.view'),
    ('manager', 'dashboard.view'),
    ('manager', 'chat.view'),
    ('manager', 'crm.view'),
    ('manager', 'flows.view'),
    ('manager', 'agents.view'),
    ('manager', 'campaigns.view'),
    ('manager', 'analytics.view'),
    ('manager', 'sales.view'),
    ('manager', 'whatsapp.view'),
    ('attendant', 'chat.view'),
    ('attendant', 'crm.view'),
    ('attendant', 'whatsapp.view')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM grants
JOIN public.roles ON roles.key = grants.role_key
JOIN public.permissions ON permissions.key = grants.permission_key
ON CONFLICT DO NOTHING;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE public.users
SET role = CASE role
  WHEN 'master' THEN 'admin_master'
  WHEN 'admin' THEN 'manager'
  WHEN 'agent' THEN 'attendant'
  WHEN 'viewer' THEN 'attendant'
  ELSE role
END;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'attendant';
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin_master', 'client', 'manager', 'attendant'));

CREATE INDEX IF NOT EXISTS idx_roles_key ON public.roles(key);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_can_read_roles ON public.roles;
CREATE POLICY authenticated_can_read_roles ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_can_read_permissions ON public.permissions;
CREATE POLICY authenticated_can_read_permissions ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS authenticated_can_read_role_permissions ON public.role_permissions;
CREATE POLICY authenticated_can_read_role_permissions ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS set_updated_at_roles ON public.roles;
CREATE TRIGGER set_updated_at_roles
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.user_permission_keys(target_auth_id UUID)
RETURNS TABLE(permission_key TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT permissions.key
  FROM public.users
  JOIN public.roles ON roles.key = users.role
  JOIN public.role_permissions ON role_permissions.role_id = roles.id
  JOIN public.permissions ON permissions.id = role_permissions.permission_id
  WHERE users.auth_id = target_auth_id
$$;

REVOKE ALL ON FUNCTION public.user_permission_keys(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_permission_keys(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_workspace_id UUID;
  display_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    split_part(COALESCE(NEW.email, 'usuario'), '@', 1)
  );

  INSERT INTO public.workspaces (name, slug, owner_id, plan)
  VALUES (
    display_name,
    'workspace-' || replace(NEW.id::TEXT, '-', ''),
    NEW.id,
    'free'
  )
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.users (auth_id, email, name, role, workspace_id)
  VALUES (NEW.id, COALESCE(NEW.email, ''), display_name, 'admin_master', new_workspace_id);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM authenticated;
