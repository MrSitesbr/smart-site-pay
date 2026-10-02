CREATE OR REPLACE FUNCTION public.attach_current_client_to_contract_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.cliente_corp_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT cliente.id::text
      INTO NEW.cliente_corp_id
      FROM public.clientes_corp AS cliente
     WHERE cliente.user_id::text = auth.uid()::text
       AND cliente.deleted_at IS NULL
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_requests_attach_current_client ON public.contract_requests;
CREATE TRIGGER contract_requests_attach_current_client
  BEFORE INSERT ON public.contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_current_client_to_contract_request();

UPDATE public.contract_requests AS request
   SET cliente_corp_id = cliente.id::text
  FROM public.clientes_corp AS cliente
 WHERE request.cliente_corp_id IS NULL
   AND request.user_id::text = cliente.user_id::text
   AND cliente.deleted_at IS NULL;