GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
REVOKE USAGE ON SCHEMA private FROM anon;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;