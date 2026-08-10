-- Reparar permissões básicas no schema auth
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT SELECT ON auth.identities TO anon, authenticated;
GRANT SELECT ON auth.sessions TO anon, authenticated;

-- Garantir que o schema public e o tipo app_role sejam acessíveis
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Reparar a função has_role para ser SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT SELECT ON public.user_roles TO anon, authenticated;