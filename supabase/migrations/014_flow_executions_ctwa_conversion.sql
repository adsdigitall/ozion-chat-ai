-- ============================================
-- FLOW EXECUTIONS + CTWA CONVERSION EVENTS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================
-- FLOW EXECUTIONS
-- ==============================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'flow_executions' AND schemaname = 'public'
  ) THEN
    CREATE TABLE public.flow_executions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
      flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
      flow_name text,
      conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
      contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'running',
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      node_count integer DEFAULT 0,
      error_message text,
      triggered_by text DEFAULT 'manual',
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.flow_executions
      ADD CONSTRAINT flow_executions_status_check CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));

    CREATE INDEX idx_flow_executions_workspace ON public.flow_executions(workspace_id);
    CREATE INDEX idx_flow_executions_conversation ON public.flow_executions(conversation_id);
    CREATE INDEX idx_flow_executions_flow ON public.flow_executions(flow_id);
    CREATE INDEX idx_flow_executions_status ON public.flow_executions(workspace_id, status);
    CREATE INDEX idx_flow_executions_started ON public.flow_executions(workspace_id, started_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'flow_executions' AND policyname = 'tenant_flow_executions_access'
  ) THEN
    ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tenant_flow_executions_access ON public.flow_executions
      FOR ALL TO authenticated
      USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
      WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));
  END IF;
END $$;

-- ==============================
-- CTWA CONVERSION EVENTS
-- ==============================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'ctwa_conversion_events' AND schemaname = 'public'
  ) THEN
    CREATE TABLE public.ctwa_conversion_events (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
      conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
      contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
      event_name text NOT NULL,
      event_time timestamptz NOT NULL DEFAULT now(),
      conversion_value numeric(15,2),
      currency text DEFAULT 'BRL',
      phone text,
      status text NOT NULL DEFAULT 'pending',
      meta_event_id text,
      error_message text,
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.ctwa_conversion_events
      ADD CONSTRAINT ctwa_conversion_events_status_check CHECK (status IN ('pending', 'sent', 'confirmed', 'failed'));

    CREATE INDEX idx_ctwa_conversion_workspace ON public.ctwa_conversion_events(workspace_id);
    CREATE INDEX idx_ctwa_conversion_conversation ON public.ctwa_conversion_events(conversation_id);
    CREATE INDEX idx_ctwa_conversion_status ON public.ctwa_conversion_events(workspace_id, status);
    CREATE INDEX idx_ctwa_conversion_created ON public.ctwa_conversion_events(workspace_id, created_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ctwa_conversion_events' AND policyname = 'tenant_ctwa_conversion_events_access'
  ) THEN
    ALTER TABLE public.ctwa_conversion_events ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tenant_ctwa_conversion_events_access ON public.ctwa_conversion_events
      FOR ALL TO authenticated
      USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
      WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));
  END IF;
END $$;
