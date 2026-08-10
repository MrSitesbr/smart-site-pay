DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    target_email TEXT := 'admin@coworking013.com.br';
    target_pass_hash TEXT := crypt('976431852@#Wt', gen_salt('bf'));
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud)
        VALUES (new_user_id, '00000000-0000-0000-0000-000000000000', target_email, target_pass_hash, now(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated');
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        UPDATE auth.users SET encrypted_password = target_pass_hash WHERE email = target_email;
        INSERT INTO public.user_roles (user_id, role)
        SELECT id, 'admin' FROM auth.users WHERE email = target_email
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;