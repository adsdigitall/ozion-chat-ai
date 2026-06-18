-- OZION - Workspaces module and multi-workspace memberships.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'operacao',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_status_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

UPDATE public.workspaces
SET
  color = COALESCE(color, '#10b981'),
  status = COALESCE(status, 'active'),
  category = COALESCE(category, 'operacao'),
  logo_url = COALESCE(logo_url, logo)
WHERE color IS NULL OR status IS NULL OR category IS NULL OR logo_url IS NULL;

CREATE TABLE IF NOT EXISTS public.workspace_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendant' CHECK (role IN ('owner', 'manager', 'attendant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

INSERT INTO public.workspace_users (workspace_id, user_id, role, status)
SELECT
  users.workspace_id,
  users.id,
  CASE
    WHEN users.role IN ('admin_master', 'client') THEN 'owner'
    WHEN users.role = 'manager' THEN 'manager'
    ELSE 'attendant'
  END,
  'active'
FROM public.users
WHERE users.workspace_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON public.workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id ON public.workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_status ON public.workspace_users(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces(status);

ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_users_member_access ON public.workspace_users;
CREATE POLICY workspace_users_member_access ON public.workspace_users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (
          users.role = 'admin_master'
          OR users.id = workspace_users.user_id
          OR users.customer_id = (
            SELECT workspaces.customer_id
            FROM public.workspaces
            WHERE workspaces.id = workspace_users.workspace_id
          )
        )
    )
  );

DROP POLICY IF EXISTS workspace_member_access ON public.workspaces;
CREATE POLICY workspace_member_access ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (
          users.role = 'admin_master'
          OR users.workspace_id = workspaces.id
          OR users.customer_id = workspaces.customer_id
          OR EXISTS (
            SELECT 1
            FROM public.workspace_users
            WHERE workspace_users.workspace_id = workspaces.id
              AND workspace_users.user_id = users.id
              AND workspace_users.status = 'active'
          )
        )
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
CREATE TRIGGER set_updated_at_workspaces
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
