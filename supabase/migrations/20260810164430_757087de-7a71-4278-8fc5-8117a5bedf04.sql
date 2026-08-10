-- Revoke execution from public/anon/authenticated roles for security definer function
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- Grant execution only to service_role (as it is meant to be used internally by RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
