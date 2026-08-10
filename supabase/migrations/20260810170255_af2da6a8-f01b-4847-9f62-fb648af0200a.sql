-- Final Attempt to fix Permissions and Auth Schema visibility
-- 1. Schema Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, authenticator, service_role;

-- 2. Grant access to auth tables (Essential for GoTrue to function)
GRANT SELECT, UPDATE, INSERT ON auth.users TO authenticated, authenticator, service_role;
GRANT SELECT, INSERT ON auth.identities TO authenticated, authenticator, service_role;
GRANT SELECT, INSERT ON auth.sessions TO authenticated, authenticator, service_role;

-- 3. Grant access to metadata (PostgREST sometimes needs this)
GRANT SELECT ON pg_catalog.pg_type TO anon, authenticated, authenticator, service_role;
GRANT SELECT ON pg_catalog.pg_enum TO anon, authenticated, authenticator, service_role;

-- 4. Fix has_role function with correct types
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

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- 5. Ensure user_roles has correct grants
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
