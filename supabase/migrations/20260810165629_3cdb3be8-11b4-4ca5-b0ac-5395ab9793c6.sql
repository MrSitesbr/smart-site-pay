-- Extreme Repair for Lovable Cloud Auth Permissions
-- Resetting schema grants to baseline for Data API access

DO $$
BEGIN
    -- 1. Schema-level access
    GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, authenticator;
    
    -- 2. Direct table access (Data API / PostgREST needs this for some auth operations)
    GRANT SELECT ON auth.users TO anon, authenticated;
    GRANT SELECT ON auth.identities TO anon, authenticated;
    
    -- 3. Ensure public schema objects are accessible
    -- Re-grant everything on user_roles to be safe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        GRANT SELECT ON public.user_roles TO anon, authenticated;
    END IF;

END $$;