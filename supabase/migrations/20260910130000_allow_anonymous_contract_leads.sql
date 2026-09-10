-- Public reservation and contact forms create CRM leads before authentication.
ALTER TABLE public.contract_requests
  ALTER COLUMN user_id DROP NOT NULL;
