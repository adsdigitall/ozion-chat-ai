-- Automatically provisions a workspace and master profile for new sign-ups.

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
  VALUES (NEW.id, COALESCE(NEW.email, ''), display_name, 'master', new_workspace_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
