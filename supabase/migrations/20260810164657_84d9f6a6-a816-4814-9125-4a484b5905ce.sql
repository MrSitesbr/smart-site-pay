-- Fix security warning: restrict execution of security definer functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Explicitly allow execution of non-sensitive functions if any exist, 
-- but for now we keep it tight. service_role can always execute.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
