-- Review before applying to an existing production project.
-- This migration completes tenant isolation for tables omitted by the initial schema.

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_workspace_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_member_access ON public.workspaces;
CREATE POLICY workspace_member_access ON public.workspaces
  FOR SELECT TO authenticated
  USING (id = public.current_workspace_id());

DROP POLICY IF EXISTS workspace_user_access ON public.users;
CREATE POLICY workspace_user_access ON public.users
  FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS workspace_contact_tags ON public.contact_tags;
CREATE POLICY workspace_contact_tags ON public.contact_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
        AND contacts.workspace_id = public.current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
        AND contacts.workspace_id = public.current_workspace_id()
    )
  );

DROP POLICY IF EXISTS workspace_conversation_tags ON public.conversation_tags;
CREATE POLICY workspace_conversation_tags ON public.conversation_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_tags.conversation_id
        AND conversations.workspace_id = public.current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_tags.conversation_id
        AND conversations.workspace_id = public.current_workspace_id()
    )
  );

DROP POLICY IF EXISTS workspace_health_checks ON public.health_checks;
CREATE POLICY workspace_health_checks ON public.health_checks
  FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS workspace_audit_logs ON public.audit_logs;
CREATE POLICY workspace_audit_logs ON public.audit_logs
  FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());

CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag ON public.conversation_tags(tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id
  ON public.messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
