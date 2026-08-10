-- Attempting to fix the Search Path which often causes "Database error querying schema"
-- Note: ALTER ROLE authenticator might not be permitted in all environments, 
-- but we can try to set it at the database level if possible, 
-- or ensure usage is extremely clear.

GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticator;

-- Check if we can set the search path for the authenticator role
DO $$
BEGIN
  EXECUTE 'ALTER ROLE authenticator SET search_path = public, auth';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter authenticator role search_path: %', SQLERRM;
END $$;
