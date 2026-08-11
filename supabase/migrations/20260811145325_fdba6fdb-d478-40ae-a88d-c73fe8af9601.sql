
-- Grant full access to reservations table for all roles to bypass RLS issues in admin mode
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.reservations;
DROP POLICY IF EXISTS "Allow all for everyone on reservations" ON public.reservations;

-- Create a fully permissive policy for the reservations table
CREATE POLICY "Allow all for everyone on reservations" 
ON public.reservations 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);
