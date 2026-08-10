-- Comprehensive Database and Auth Repair
-- This script ensures all necessary objects exist and are correctly permissioned.

-- 1. Enum for roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Grants for user_roles (CRITICAL for Data API)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;
GRANT ALL ON public.user_roles TO service_role;

-- 4. RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles'
    ) THEN
        CREATE POLICY "Users can view their own roles" ON public.user_roles
            FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Allow public check for login'
    ) THEN
        CREATE POLICY "Allow public check for login" ON public.user_roles
            FOR SELECT TO anon USING (true);
    END IF;
END $$;

-- 5. Security Definer function to prevent recursion
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

-- 6. Schema usage grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, authenticator;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, authenticator;

-- 7. Auth table grants (Fixes "Database error querying schema" in some clients)
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT SELECT ON auth.identities TO anon, authenticated;

-- 8. Final check/update for the admin user
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

    -- Ensure the admin role is mapped
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;