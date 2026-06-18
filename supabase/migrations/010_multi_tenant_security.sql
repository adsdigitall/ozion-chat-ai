-- OZION - Multi-tenant security hardening.
-- Adds tenant metadata, safer RLS helpers, and customer/workspace isolation policies.

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT users.id
  FROM public.users
  WHERE users.auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT users.role
  FROM public.users
  WHERE users.auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.current_profile_role() = 'admin_master', false)
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT users.customer_id
  FROM public.users
  WHERE users.auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_access_customer(target_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin_master()
    OR (
      target_customer_id IS NOT NULL
      AND target_customer_id = public.current_customer_id()
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_workspace(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users
      LEFT JOIN public.workspaces ON workspaces.id = target_workspace_id
      WHERE users.auth_id = auth.uid()
        AND target_workspace_id IS NOT NULL
        AND (
          users.role = 'admin_master'
          OR users.workspace_id = target_workspace_id
          OR (
            users.customer_id IS NOT NULL
            AND users.customer_id = workspaces.customer_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.workspace_users
            WHERE workspace_users.workspace_id = target_workspace_id
              AND workspace_users.user_id = users.id
              AND workspace_users.status = 'active'
          )
        )
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.apply_tenant_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  app_user_id UUID;
  derived_workspace_id UUID;
  derived_customer_id UUID;
BEGIN
  SELECT users.id INTO app_user_id
  FROM public.users
  WHERE users.auth_id = auth.uid()
  LIMIT 1;

  IF TG_TABLE_NAME = 'messages' AND NEW.workspace_id IS NULL AND to_jsonb(NEW) ? 'conversation_id' THEN
    SELECT conversations.workspace_id INTO derived_workspace_id
    FROM public.conversations
    WHERE conversations.id = ((to_jsonb(NEW)->>'conversation_id')::UUID);
    NEW.workspace_id := derived_workspace_id;
  END IF;

  IF NEW.workspace_id IS NOT NULL AND NEW.customer_id IS NULL THEN
    SELECT workspaces.customer_id INTO derived_customer_id
    FROM public.workspaces
    WHERE workspaces.id = NEW.workspace_id;
    NEW.customer_id := derived_customer_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := app_user_id;
    END IF;
  ELSE
    IF NEW.updated_by IS NULL THEN
      NEW.updated_by := app_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
  table_names TEXT[] := ARRAY[
    'contacts',
    'conversations',
    'messages',
    'tags',
    'flows',
    'ai_agents',
    'voice_configs',
    'integrations',
    'whatsapp_connections',
    'sales',
    'campaigns',
    'health_checks',
    'audit_logs',
    'quick_replies'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL', table_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL', table_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL', table_name);

      IF table_name = 'messages' THEN
        EXECUTE 'ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE';
        EXECUTE $sql$
          UPDATE public.messages
          SET workspace_id = conversations.workspace_id
          FROM public.conversations
          WHERE messages.conversation_id = conversations.id
            AND messages.workspace_id IS NULL
        $sql$;
      END IF;

      EXECUTE format($sql$
        UPDATE public.%I AS tenant_table
        SET customer_id = workspaces.customer_id
        FROM public.workspaces
        WHERE tenant_table.workspace_id = workspaces.id
          AND tenant_table.customer_id IS NULL
      $sql$, table_name);

      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(customer_id)', 'idx_' || table_name || '_customer_id', table_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(created_by)', 'idx_' || table_name || '_created_by', table_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(customer_id, workspace_id)', 'idx_' || table_name || '_tenant', table_name);

      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'apply_tenant_metadata_' || table_name, table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.apply_tenant_metadata()',
        'apply_tenant_metadata_' || table_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flow_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.flows(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  position JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flow_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.flows(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source_block_id UUID,
  target_block_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  source TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  events JSONB DEFAULT '[]',
  secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
  table_name TEXT;
  table_names TEXT[] := ARRAY[
    'custom_fields',
    'flow_blocks',
    'flow_edges',
    'analytics_events',
    'webhooks',
    'saved_filters',
    'templates'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(workspace_id)', 'idx_' || table_name || '_workspace_id', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(customer_id)', 'idx_' || table_name || '_customer_id', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(customer_id, workspace_id)', 'idx_' || table_name || '_tenant', table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'apply_tenant_metadata_' || table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.apply_tenant_metadata()',
      'apply_tenant_metadata_' || table_name,
      table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  table_name TEXT;
  table_names TEXT[] := ARRAY[
    'workspaces',
    'users',
    'customers',
    'customer_users',
    'workspace_users',
    'roles',
    'permissions',
    'role_permissions',
    'plans',
    'subscriptions',
    'contacts',
    'conversations',
    'messages',
    'tags',
    'custom_fields',
    'flows',
    'flow_blocks',
    'flow_edges',
    'ai_agents',
    'voice_configs',
    'integrations',
    'whatsapp_connections',
    'sales',
    'analytics_events',
    'webhooks',
    'audit_logs',
    'saved_filters',
    'quick_replies',
    'templates',
    'campaigns',
    'health_checks',
    'contact_tags',
    'conversation_tags'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS workspace_member_access ON public.workspaces;
DROP POLICY IF EXISTS tenant_workspaces_access ON public.workspaces;
CREATE POLICY tenant_workspaces_access ON public.workspaces
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(id))
  WITH CHECK (public.is_admin_master() OR public.can_access_customer(customer_id));

DROP POLICY IF EXISTS workspace_user_access ON public.users;
DROP POLICY IF EXISTS tenant_users_access ON public.users;
CREATE POLICY tenant_users_access ON public.users
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR id = public.current_profile_id()
    OR public.can_access_workspace(workspace_id)
    OR public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.is_admin_master()
    OR id = public.current_profile_id()
    OR public.can_access_workspace(workspace_id)
    OR public.can_access_customer(customer_id)
  );

DROP POLICY IF EXISTS admin_master_can_read_customers ON public.customers;
DROP POLICY IF EXISTS tenant_customers_access ON public.customers;
CREATE POLICY tenant_customers_access ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_admin_master() OR id = public.current_customer_id());

DROP POLICY IF EXISTS customer_member_can_read_own_subscription ON public.subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_access ON public.subscriptions;
CREATE POLICY tenant_subscriptions_access ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_admin_master() OR customer_id = public.current_customer_id());

DROP POLICY IF EXISTS admin_master_can_read_plans ON public.plans;
DROP POLICY IF EXISTS tenant_plans_access ON public.plans;
CREATE POLICY tenant_plans_access ON public.plans
  FOR SELECT TO authenticated
  USING (true);

DO $$
DECLARE
  table_name TEXT;
  table_names TEXT[] := ARRAY[
    'contacts',
    'tags',
    'custom_fields',
    'flows',
    'flow_blocks',
    'flow_edges',
    'ai_agents',
    'voice_configs',
    'integrations',
    'whatsapp_connections',
    'sales',
    'analytics_events',
    'webhooks',
    'audit_logs',
    'saved_filters',
    'quick_replies',
    'templates',
    'campaigns',
    'health_checks'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS workspace_isolation ON public.%I', table_name);
      EXECUTE format('DROP POLICY IF EXISTS tenant_workspace_access ON public.%I', table_name);
      EXECUTE format($sql$
        CREATE POLICY tenant_workspace_access ON public.%I
          FOR ALL TO authenticated
          USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
          WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id))
      $sql$, table_name);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS workspace_isolation ON public.conversations;
DROP POLICY IF EXISTS tenant_conversations_access ON public.conversations;
CREATE POLICY tenant_conversations_access ON public.conversations
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (
      public.can_access_workspace(workspace_id)
      AND (
        COALESCE(public.current_profile_role(), '') <> 'attendant'
        OR assigned_to = public.current_profile_id()
      )
    )
  )
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_isolation ON public.messages;
DROP POLICY IF EXISTS tenant_messages_access ON public.messages;
CREATE POLICY tenant_messages_access ON public.messages
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND public.can_access_workspace(conversations.workspace_id)
        AND (
          COALESCE(public.current_profile_role(), '') <> 'attendant'
          OR conversations.assigned_to = public.current_profile_id()
        )
    )
  )
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND public.can_access_workspace(conversations.workspace_id)
        AND (
          COALESCE(public.current_profile_role(), '') <> 'attendant'
          OR conversations.assigned_to = public.current_profile_id()
        )
    )
  );

DROP POLICY IF EXISTS workspace_contact_tags ON public.contact_tags;
DROP POLICY IF EXISTS tenant_contact_tags_access ON public.contact_tags;
CREATE POLICY tenant_contact_tags_access ON public.contact_tags
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
        AND public.can_access_workspace(contacts.workspace_id)
    )
  )
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
        AND public.can_access_workspace(contacts.workspace_id)
    )
  );

DROP POLICY IF EXISTS workspace_conversation_tags ON public.conversation_tags;
DROP POLICY IF EXISTS tenant_conversation_tags_access ON public.conversation_tags;
CREATE POLICY tenant_conversation_tags_access ON public.conversation_tags
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.id = conversation_tags.conversation_id
        AND public.can_access_workspace(conversations.workspace_id)
    )
  )
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.id = conversation_tags.conversation_id
        AND public.can_access_workspace(conversations.workspace_id)
    )
  );

DROP POLICY IF EXISTS workspace_users_member_access ON public.workspace_users;
DROP POLICY IF EXISTS tenant_workspace_users_access ON public.workspace_users;
CREATE POLICY tenant_workspace_users_access ON public.workspace_users
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id) OR user_id = public.current_profile_id())
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));
