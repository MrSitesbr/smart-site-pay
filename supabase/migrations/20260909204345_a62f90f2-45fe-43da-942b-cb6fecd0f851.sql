REVOKE EXECUTE ON FUNCTION public.current_cliente_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_cliente_id() TO authenticated, service_role;