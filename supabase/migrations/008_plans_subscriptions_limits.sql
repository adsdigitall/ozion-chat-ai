-- OZION - Plans, subscriptions, SaaS limits and module flags.

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_check;
ALTER TABLE public.workspaces ALTER COLUMN plan SET DEFAULT 'start';
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_plan_check
  CHECK (plan IN ('start', 'pro', 'scale', 'enterprise', 'free', 'starter'));

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_plan_id_check;
UPDATE public.customers
SET plan_id = CASE plan_id
  WHEN 'free' THEN 'start'
  WHEN 'starter' THEN 'start'
  ELSE plan_id
END;
ALTER TABLE public.customers ALTER COLUMN plan_id SET DEFAULT 'start';
ALTER TABLE public.customers ADD CONSTRAINT customers_plan_id_check
  CHECK (plan_id IN ('start', 'pro', 'scale', 'enterprise'));

CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  limits_json JSONB NOT NULL DEFAULT '{}',
  modules_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

INSERT INTO public.plans (id, name, description, price, billing_cycle, status, limits_json, modules_json)
VALUES
  (
    'start',
    'Start',
    'Plano inicial para validar a operação.',
    197,
    'monthly',
    'active',
    '{"workspaces":1,"users":1,"contacts":1000,"flows":2,"agents":1,"voices":1,"whatsapp_numbers":1,"integrations":2,"webhooks":1,"gpt_tokens":100000,"voice_tokens":30000,"storage":2,"flow_executions":1000,"sent_messages":3000}'::jsonb,
    '{"dashboard":true,"chat":true,"crm":true,"flows":true,"agents":true,"voice":true,"ctwa":false,"campaigns":false,"analytics":true,"sales":true,"integrations":true,"whatsapp":true,"workspaces":true,"members":false,"community":false}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Plano para operação comercial em crescimento.',
    497,
    'monthly',
    'active',
    '{"workspaces":3,"users":5,"contacts":10000,"flows":10,"agents":3,"voices":3,"whatsapp_numbers":3,"integrations":8,"webhooks":5,"gpt_tokens":500000,"voice_tokens":150000,"storage":20,"flow_executions":15000,"sent_messages":30000}'::jsonb,
    '{"dashboard":true,"chat":true,"crm":true,"flows":true,"agents":true,"voice":true,"ctwa":true,"campaigns":true,"analytics":true,"sales":true,"integrations":true,"whatsapp":true,"workspaces":true,"members":false,"community":false}'::jsonb
  ),
  (
    'scale',
    'Scale',
    'Plano com recursos ilimitados para escala.',
    997,
    'monthly',
    'active',
    '{"workspaces":-1,"users":-1,"contacts":-1,"flows":-1,"agents":-1,"voices":-1,"whatsapp_numbers":-1,"integrations":-1,"webhooks":-1,"gpt_tokens":-1,"voice_tokens":-1,"storage":-1,"flow_executions":-1,"sent_messages":-1}'::jsonb,
    '{"dashboard":true,"chat":true,"crm":true,"flows":true,"agents":true,"voice":true,"ctwa":true,"campaigns":true,"analytics":true,"sales":true,"integrations":true,"whatsapp":true,"workspaces":true,"members":true,"community":true}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'Contrato customizado com limites manuais.',
    0,
    'monthly',
    'active',
    '{"workspaces":-1,"users":-1,"contacts":-1,"flows":-1,"agents":-1,"voices":-1,"whatsapp_numbers":-1,"integrations":-1,"webhooks":-1,"gpt_tokens":-1,"voice_tokens":-1,"storage":-1,"flow_executions":-1,"sent_messages":-1}'::jsonb,
    '{"dashboard":true,"chat":true,"crm":true,"flows":true,"agents":true,"voice":true,"ctwa":true,"campaigns":true,"analytics":true,"sales":true,"integrations":true,"whatsapp":true,"workspaces":true,"members":true,"community":true}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  billing_cycle = EXCLUDED.billing_cycle,
  status = EXCLUDED.status,
  limits_json = EXCLUDED.limits_json,
  modules_json = EXCLUDED.modules_json,
  updated_at = NOW();

INSERT INTO public.subscriptions (customer_id, plan_id, status, current_period_start, next_billing_date)
SELECT customers.id, customers.plan_id, 'active', NOW(), NOW() + INTERVAL '1 month'
FROM public.customers
ON CONFLICT (customer_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = 'active',
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_master_can_read_plans ON public.plans;
CREATE POLICY admin_master_can_read_plans ON public.plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'admin_master'
    )
  );

DROP POLICY IF EXISTS customer_member_can_read_own_subscription ON public.subscriptions;
CREATE POLICY customer_member_can_read_own_subscription ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.customer_id = subscriptions.customer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'admin_master'
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_plans ON public.plans;
CREATE TRIGGER set_updated_at_plans
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON public.subscriptions;
CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
