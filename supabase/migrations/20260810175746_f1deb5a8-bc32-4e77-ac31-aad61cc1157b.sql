REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- Mantemos 'anon' apenas se o login depender dessa verificação antes do JWT ser processado pelo PostgREST,
-- mas geralmente o login (auth.signIn) não usa essa função, apenas o pós-login.
-- Vou remover de anon por segurança e ver se o erro 500 persiste.
