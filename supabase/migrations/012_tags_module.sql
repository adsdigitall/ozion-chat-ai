-- ============================================
-- TAGS / ETIQUETAS GLOBAIS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.ozion_slugify(value text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT trim(both '-' from regexp_replace(regexp_replace(lower(unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));
$$;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Funil',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.tags
SET
  slug = COALESCE(NULLIF(slug, ''), public.ozion_slugify(name)),
  category = COALESCE(category, 'Funil'),
  status = COALESCE(status, 'active'),
  updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public.tags
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN category SET DEFAULT 'Funil',
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tags_status_check'
      AND conrelid = 'public.tags'::regclass
  ) THEN
    ALTER TABLE public.tags
      ADD CONSTRAINT tags_status_check CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tags_workspace_slug_key ON public.tags(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_tags_customer_workspace ON public.tags(customer_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_status_category ON public.tags(status, category);

ALTER TABLE public.contact_tags
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.contact_tags ct
SET
  id = COALESCE(ct.id, uuid_generate_v4()),
  workspace_id = COALESCE(ct.workspace_id, c.workspace_id, t.workspace_id),
  customer_id = COALESCE(ct.customer_id, c.customer_id, t.customer_id),
  created_at = COALESCE(ct.created_at, now())
FROM public.contacts c, public.tags t
WHERE c.id = ct.contact_id
  AND t.id = ct.tag_id;

ALTER TABLE public.contact_tags
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_tags_pkey'
      AND conrelid = 'public.contact_tags'::regclass
  ) THEN
    ALTER TABLE public.contact_tags DROP CONSTRAINT contact_tags_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_tags_pkey'
      AND conrelid = 'public.contact_tags'::regclass
  ) THEN
    ALTER TABLE public.contact_tags ADD CONSTRAINT contact_tags_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contact_tags_contact_tag_key ON public.contact_tags(contact_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_workspace ON public.contact_tags(workspace_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_customer ON public.contact_tags(customer_id);

ALTER TABLE public.conversation_tags
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.conversation_tags ct
SET
  id = COALESCE(ct.id, uuid_generate_v4()),
  workspace_id = COALESCE(ct.workspace_id, c.workspace_id, t.workspace_id),
  customer_id = COALESCE(ct.customer_id, c.customer_id, t.customer_id),
  created_at = COALESCE(ct.created_at, now())
FROM public.conversations c, public.tags t
WHERE c.id = ct.conversation_id
  AND t.id = ct.tag_id;

ALTER TABLE public.conversation_tags
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_tags_pkey'
      AND conrelid = 'public.conversation_tags'::regclass
  ) THEN
    ALTER TABLE public.conversation_tags DROP CONSTRAINT conversation_tags_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_tags_pkey'
      AND conrelid = 'public.conversation_tags'::regclass
  ) THEN
    ALTER TABLE public.conversation_tags ADD CONSTRAINT conversation_tags_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_tags_conversation_tag_key ON public.conversation_tags(conversation_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_workspace ON public.conversation_tags(workspace_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_customer ON public.conversation_tags(customer_id);

WITH defaults(name, color, category, description) AS (
  VALUES
    ('Novo Lead', '#22c55e', 'Funil', 'Lead recém criado no workspace.'),
    ('Interessado', '#84cc16', 'Funil', 'Lead demonstrou interesse.'),
    ('Qualificado', '#14b8a6', 'Funil', 'Lead validado para avanço comercial.'),
    ('Pix Enviado', '#06b6d4', 'Pagamento', 'Pix ou oferta enviada.'),
    ('Aguardando Pagamento', '#f59e0b', 'Pagamento', 'Lead aguardando confirmação de pagamento.'),
    ('Pagou', '#10b981', 'Pagamento', 'Pagamento confirmado.'),
    ('Perdido', '#ef4444', 'Funil', 'Lead perdido ou sem interesse.'),
    ('Risco', '#f97316', 'Risco', 'Lead com sinal de risco ou palavra sensível.'),
    ('Bloqueado', '#71717a', 'Atendimento', 'Contato bloqueado ou não acionável.'),
    ('Suporte', '#3b82f6', 'Atendimento', 'Contato de suporte.'),
    ('Pós-venda', '#a855f7', 'Produto', 'Relacionamento depois da venda.')
)
INSERT INTO public.tags (workspace_id, customer_id, name, slug, color, category, description, status, created_at, updated_at)
SELECT
  w.id,
  w.customer_id,
  d.name,
  public.ozion_slugify(d.name),
  d.color,
  d.category,
  d.description,
  'active',
  now(),
  now()
FROM public.workspaces w
CROSS JOIN defaults d
ON CONFLICT (workspace_id, slug) DO NOTHING;

DROP TRIGGER IF EXISTS set_tags_updated_at ON public.tags;
CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS workspace_isolation ON public.tags;
DROP POLICY IF EXISTS tenant_tags_access ON public.tags;
CREATE POLICY tenant_tags_access ON public.tags
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_contact_tags ON public.contact_tags;
DROP POLICY IF EXISTS tenant_contact_tags_access ON public.contact_tags;
CREATE POLICY tenant_contact_tags_access ON public.contact_tags
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_conversation_tags ON public.conversation_tags;
DROP POLICY IF EXISTS tenant_conversation_tags_access ON public.conversation_tags;
CREATE POLICY tenant_conversation_tags_access ON public.conversation_tags
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR public.can_access_workspace(workspace_id))
  WITH CHECK (public.is_admin_master() OR public.can_access_workspace(workspace_id));
