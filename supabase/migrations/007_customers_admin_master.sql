-- OZION - Customers module for Admin Master.

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  plan_id TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free', 'starter', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_access_at TIMESTAMPTZ
);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_plan_id ON public.customers(plan_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_customer_id ON public.workspaces(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON public.users(customer_id);

INSERT INTO public.permissions (key, name, description, category)
VALUES ('customers.view', 'Ver Clientes', 'Acessar e gerenciar clientes da plataforma.', 'admin')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM public.roles
JOIN public.permissions ON permissions.key = 'customers.view'
WHERE roles.key = 'admin_master'
ON CONFLICT DO NOTHING;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_master_can_read_customers ON public.customers;
CREATE POLICY admin_master_can_read_customers ON public.customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'admin_master'
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_customers ON public.customers;
CREATE TRIGGER set_updated_at_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
