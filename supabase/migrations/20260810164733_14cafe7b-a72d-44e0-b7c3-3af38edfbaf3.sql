-- Full reset and explicit permission grant for the public schema and user_roles table
-- This address the "Database error querying schema" which often stems from PostgREST permission issues

-- 1. Ensure schema is accessible
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Recreate the table with standard structure if there's any corruption
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Explicitly grant permissions (CRITICAL for Lovable Cloud)
GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Set up RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Allow public read for roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create a simple policy that allows the auth flow to check roles
CREATE POLICY "Allow public read for roles" 
ON public.user_roles 
FOR SELECT 
TO public 
USING (true);

-- 5. Ensure the admin user is correctly mapped
DO $$
DECLARE
    target_email TEXT := 'admin@coworking013.com.br';
    existing_user_id UUID;
BEGIN
    SELECT id INTO existing_user_id FROM auth.users WHERE email = target_email;

    IF existing_user_id IS NOT NULL THEN
        -- Insert or update the role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (existing_user_id, 'admin')
        ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
    END IF;
END $$;
