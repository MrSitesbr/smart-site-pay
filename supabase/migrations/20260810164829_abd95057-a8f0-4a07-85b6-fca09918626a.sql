-- Core repair for Auth schema errors on Lovable Cloud
-- This addresses the "Database error querying schema" specifically in the context of Supabase Auth.

-- 1. Essential usage grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, authenticator;

-- 2. Grant access to necessary auth tables for the API roles
GRANT SELECT ON auth.users TO authenticated, anon;
GRANT SELECT ON auth.identities TO authenticated, anon;
GRANT SELECT ON auth.sessions TO authenticated, anon;

-- 3. Fix the admin user without touching generated columns
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
            last_sign_in_at, created_at, updated_at
        )
        VALUES (
            existing_user_id, '00000000-0000-0000-0000-000000000000', target_email, 
            target_pass_hash, now(), '{"provider":"email","providers":["email"]}', 
            '{}', false, 'authenticated', 'authenticated', 
            now(), now(), now()
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
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
END $$;
