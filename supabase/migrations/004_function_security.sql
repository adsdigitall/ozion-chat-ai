-- Restrict internal functions and make their object resolution deterministic.

ALTER FUNCTION public.update_updated_at() SET search_path = '';

REVOKE ALL ON FUNCTION public.current_workspace_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM authenticated;
