-- OZION - CRM / Contacts module.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.contacts
SET
  source = COALESCE(source, origin),
  campaign_id = COALESCE(campaign_id, campaign),
  adset_id = COALESCE(adset_id, adset),
  ad_id = COALESCE(ad_id, ad),
  creative_id = COALESCE(creative_id, creative),
  last_interaction_at = COALESCE(last_interaction_at, updated_at, created_at)
WHERE source IS NULL
   OR campaign_id IS NULL
   OR adset_id IS NULL
   OR ad_id IS NULL
   OR creative_id IS NULL
   OR last_interaction_at IS NULL;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_status_check;

UPDATE public.contacts
SET status = CASE status
  WHEN 'interested' THEN 'in_service'
  WHEN 'proposal' THEN 'pix_sent'
  WHEN 'won' THEN 'paid'
  ELSE status
END
WHERE status IN ('interested', 'proposal', 'won');

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_status_check CHECK (
    status IN ('new', 'in_service', 'qualified', 'pix_sent', 'waiting_payment', 'paid', 'lost', 'risk')
  );

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_temperature_check;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_temperature_check CHECK (temperature IN ('hot', 'warm', 'cold'));

CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_user_id ON public.contacts(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON public.contacts(workspace_id, source);
CREATE INDEX IF NOT EXISTS idx_contacts_channel ON public.contacts(workspace_id, channel);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON public.contacts(workspace_id, last_interaction_at DESC);

ALTER TABLE public.custom_fields
  ADD COLUMN IF NOT EXISTS options_json JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.contact_custom_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, custom_field_id)
);

CREATE TABLE IF NOT EXISTS public.contact_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_custom_field_values_contact ON public.contact_custom_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_custom_field_values_field ON public.contact_custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_contact ON public.contact_timeline(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_timeline_tenant ON public.contact_timeline(customer_id, workspace_id);

ALTER TABLE public.contact_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_contact_custom_field_values_access ON public.contact_custom_field_values;
CREATE POLICY tenant_contact_custom_field_values_access ON public.contact_custom_field_values
  FOR ALL TO authenticated
  USING (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.contacts
      WHERE contacts.id = contact_custom_field_values.contact_id
        AND public.can_access_workspace(contacts.workspace_id)
    )
  )
  WITH CHECK (
    public.is_admin_master()
    OR EXISTS (
      SELECT 1
      FROM public.contacts
      WHERE contacts.id = contact_custom_field_values.contact_id
        AND public.can_access_workspace(contacts.workspace_id)
    )
  );

DROP POLICY IF EXISTS tenant_contact_timeline_access ON public.contact_timeline;
CREATE POLICY tenant_contact_timeline_access ON public.contact_timeline
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP TRIGGER IF EXISTS set_updated_at_contact_custom_field_values ON public.contact_custom_field_values;
CREATE TRIGGER set_updated_at_contact_custom_field_values
  BEFORE UPDATE ON public.contact_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
