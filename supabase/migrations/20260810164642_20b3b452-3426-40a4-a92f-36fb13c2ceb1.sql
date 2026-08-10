-- Grant access to the entire public schema to resolve "Database error querying schema"
-- This ensures the PostgREST API can introspect the schema properly.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Specific permissions for user_roles which is used during login
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO anon; -- Allow anon to check roles if needed during login flow
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Ensure the admin user exists and has the role
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
            raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud
        )
        VALUES (
            existing_user_id, '00000000-0000-0000-0000-000000000000', target_email, 
            target_pass_hash, now(), '{"provider":"email","providers":["email"]}', 
            '{}', false, 'authenticated', 'authenticated'
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = target_pass_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = existing_user_id;
    END IF;

    -- Ensure admin role mapping exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
