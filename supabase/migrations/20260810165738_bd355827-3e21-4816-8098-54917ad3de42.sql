-- Critical fix for "Database error querying schema" and Auth persistence
-- This addresses permissions required for the Supabase Auth client to function correctly

-- 1. Grant necessary usage on schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, authenticator;

-- 2. Grant explicit SELECT on auth tables needed for session hydration
-- These are often blocked by default in Lovable Cloud environments
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT SELECT ON auth.identities TO anon, authenticated;
GRANT SELECT ON auth.sessions TO anon, authenticated;

-- 3. Ensure the user_roles table is fully accessible
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO anon; -- Allow client to check roles during login

-- 4. Re-verify the admin user existance and credentials
DO $$
DECLARE
    target_email TEXT := 'admin@coworking013.com.br';
    target_pass_hash TEXT := crypt('976431852@#Wt', gen_salt('bf'));
    existing_user_id UUID;
BEGIN
    SELECT id INTO existing_user_id FROM auth.users WHERE email = target_email;

    IF existing_user_id IS NULL THEN
        existing_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud, 
            created_at, updated_at
        )
        VALUES (
            existing_user_id, '00000000-0000-0000-0000-000000000000', target_email, 
            target_pass_hash, now(), '{"provider":"email","providers":["email"]}', 
            '{}', false, 'authenticated', 'authenticated', 
            now(), now()
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = target_pass_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = existing_user_id;
    END IF;

    -- Map role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;