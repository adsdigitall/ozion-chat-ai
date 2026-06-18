-- ============================================
-- CHAT AO VIVO / INBOX DE ATENDIMENTO
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS campaign_id text,
  ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_message text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

UPDATE public.conversations
SET
  assigned_user_id = COALESCE(assigned_user_id, assigned_to),
  ai_status = COALESCE(ai_status, CASE WHEN (metadata->>'aiEnabled')::boolean THEN 'active' ELSE 'paused' END),
  last_message_at = COALESCE(last_message_at, updated_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_ai_status_check'
      AND conrelid = 'public.conversations'::regclass
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_ai_status_check CHECK (ai_status IN ('active', 'paused'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_user_id ON public.conversations(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ai_status ON public.conversations(workspace_id, ai_status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_source_campaign ON public.conversations(workspace_id, source, campaign_id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_type text,
  ADD COLUMN IF NOT EXISTS message_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.messages m
SET
  workspace_id = COALESCE(m.workspace_id, c.workspace_id),
  customer_id = COALESCE(m.customer_id, c.customer_id),
  contact_id = COALESCE(m.contact_id, c.contact_id),
  sender_type = COALESCE(m.sender_type, CASE m.sender WHEN 'contact' THEN 'lead' WHEN 'agent' THEN 'human' ELSE m.sender END),
  message_type = COALESCE(
    m.message_type,
    CASE
      WHEN m.type IN ('text', 'image', 'audio', 'video', 'document', 'template', 'internal_note', 'flow') THEN m.type
      ELSE 'text'
    END
  ),
  status = COALESCE(m.status, CASE WHEN m.read THEN 'read' ELSE 'sent' END),
  metadata_json = COALESCE(m.metadata_json, m.metadata, '{}'::jsonb)
FROM public.conversations c
WHERE c.id = m.conversation_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_type_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('lead', 'human', 'ai', 'system', 'flow'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_message_type_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_message_type_check CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'template', 'internal_note', 'flow'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_status_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_status_check CHECK (status IN ('sent', 'delivered', 'read', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(customer_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(workspace_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(workspace_id, message_type);

ALTER TABLE public.quick_replies
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.quick_replies
SET
  title = COALESCE(title, shortcut),
  message = COALESCE(message, content),
  updated_at = COALESCE(updated_at, created_at, now());

INSERT INTO public.quick_replies (workspace_id, customer_id, title, shortcut, message, content, category, created_at, updated_at)
SELECT w.id, w.customer_id, seed.title, seed.shortcut, seed.message, seed.message, seed.category, now(), now()
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('Enviar Pix', '/pix', 'Segue o Pix para pagamento: {{pix}}', 'Pagamento'),
    ('Confirmar pagamento', '/confirmar', 'Pagamento localizado. Vou liberar seu acesso agora.', 'Pagamento'),
    ('Quebra de objeção', '/objecao', 'Entendo sua dúvida. Posso te mostrar o caminho mais simples para começar hoje.', 'Vendas'),
    ('Pós-venda', '/posvenda', 'Tudo certo por aí? Estou passando para garantir que você conseguiu acessar.', 'Pós-venda'),
    ('Encerrar atendimento', '/encerrar', 'Vou finalizar este atendimento. Se precisar, é só chamar novamente.', 'Atendimento')
) AS seed(title, shortcut, message, category)
ON CONFLICT DO NOTHING;

ALTER TABLE public.saved_filters
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS filters_json jsonb DEFAULT '{}';

UPDATE public.saved_filters
SET
  user_id = COALESCE(user_id, created_by),
  filters_json = COALESCE(filters_json, filters, '{}'::jsonb);

CREATE INDEX IF NOT EXISTS idx_saved_filters_module_user ON public.saved_filters(workspace_id, module, user_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_workspace_category ON public.quick_replies(workspace_id, category);

DROP POLICY IF EXISTS workspace_isolation ON public.quick_replies;
DROP POLICY IF EXISTS tenant_workspace_access ON public.quick_replies;
DROP POLICY IF EXISTS tenant_quick_replies_access ON public.quick_replies;
CREATE POLICY tenant_quick_replies_access ON public.quick_replies
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_isolation ON public.saved_filters;
DROP POLICY IF EXISTS tenant_workspace_access ON public.saved_filters;
DROP POLICY IF EXISTS tenant_saved_filters_access ON public.saved_filters;
CREATE POLICY tenant_saved_filters_access ON public.saved_filters
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (
      public.can_access_workspace(workspace_id)
      AND (user_id IS NULL OR user_id = public.current_profile_id() OR created_by = public.current_profile_id())
    )
  )
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP POLICY IF EXISTS tenant_conversations_access ON public.conversations;
CREATE POLICY tenant_conversations_access ON public.conversations
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR (
      public.can_access_workspace(workspace_id)
      AND (
        COALESCE(public.current_profile_role(), '') <> 'attendant'
        OR assigned_user_id = public.current_profile_id()
        OR assigned_to = public.current_profile_id()
        OR assigned_user_id IS NULL
        OR assigned_to IS NULL
      )
    )
  )
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));
