-- 1. Security fix for has_role (Linter compliance)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 2. Ensure the admin user exists with the requested password
-- Email: admin@coworking013.com.br
-- Pass: 976431852@#Wt
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
            created_at, updated_at, confirmation_token
        )
        VALUES (
            existing_user_id, '00000000-0000-0000-0000-000000000000', target_email, 
            target_pass_hash, now(), '{"provider":"email","providers":["email"]}', 
            '{}', false, 'authenticated', 'authenticated', 
            now(), now(), ''
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = target_pass_hash,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = existing_user_id;
    END IF;

    -- Ensure role mapping
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
