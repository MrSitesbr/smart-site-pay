ALTER TABLE public.clientes_corp
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cliente_corp_id text
    REFERENCES public.clientes_corp(id) ON DELETE SET NULL;

ALTER TABLE public.contract_requests
  ADD COLUMN IF NOT EXISTS cliente_corp_id text
    REFERENCES public.clientes_corp(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_cliente_corp_id_idx
  ON public.reservations (cliente_corp_id);

CREATE INDEX IF NOT EXISTS contract_requests_cliente_corp_id_idx
  ON public.contract_requests (cliente_corp_id);

CREATE OR REPLACE FUNCTION public.attach_current_client_to_reservation()
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

DROP TRIGGER IF EXISTS reservations_attach_current_client ON public.reservations;
CREATE TRIGGER reservations_attach_current_client
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_current_client_to_reservation();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-avatars', 'client-avatars', true, 100000, ARRAY['image/jpeg']::text[])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 100000,
    allowed_mime_types = ARRAY['image/jpeg']::text[];

DROP POLICY IF EXISTS "Public read client avatars" ON storage.objects;
CREATE POLICY "Public read client avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'client-avatars');

DROP POLICY IF EXISTS "Clients and admins upload client avatars" ON storage.objects;
CREATE POLICY "Clients and admins upload client avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-avatars'
    AND (
      EXISTS (
        SELECT 1
          FROM public.user_roles AS role
         WHERE role.user_id = auth.uid()
           AND role.role = 'admin'
      )
      OR EXISTS (
        SELECT 1
          FROM public.clientes_corp AS cliente
         WHERE cliente.id = (storage.foldername(name))[1]
           AND cliente.user_id::text = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Clients and admins delete client avatars" ON storage.objects;
CREATE POLICY "Clients and admins delete client avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-avatars'
    AND (
      EXISTS (
        SELECT 1
          FROM public.user_roles AS role
         WHERE role.user_id = auth.uid()
           AND role.role = 'admin'
      )
      OR EXISTS (
        SELECT 1
          FROM public.clientes_corp AS cliente
         WHERE cliente.id = (storage.foldername(name))[1]
           AND cliente.user_id::text = auth.uid()::text
      )
    )
  );