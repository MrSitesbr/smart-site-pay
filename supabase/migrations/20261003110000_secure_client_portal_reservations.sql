UPDATE public.reservations AS reservation
   SET cliente_corp_id = client.id
  FROM public.clientes_corp AS client
 WHERE reservation.cliente_corp_id IS NULL
   AND coalesce(btrim(reservation.email), '') <> ''
   AND lower(btrim(reservation.email)) = lower(btrim(client.responsavel_email))
   AND client.user_id IS NOT NULL
   AND client.deleted_at IS NULL
   AND (
     SELECT count(*)
     FROM public.clientes_corp AS candidate
     WHERE candidate.user_id IS NOT NULL
       AND candidate.deleted_at IS NULL
       AND lower(btrim(candidate.responsavel_email)) = lower(btrim(reservation.email))
   ) = 1;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.clientes_corp;
DROP POLICY IF EXISTS "Admins manage corporate clients" ON public.clientes_corp;
DROP POLICY IF EXISTS "Clients read own company" ON public.clientes_corp;
DROP POLICY IF EXISTS "Clients update own company" ON public.clientes_corp;

CREATE POLICY "Admins manage corporate clients"
  ON public.clientes_corp FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles AS role
    WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles AS role
    WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ));

CREATE POLICY "Clients read own company"
  ON public.clientes_corp FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Clients update own company"
  ON public.clientes_corp FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.reservations;
DROP POLICY IF EXISTS "Admins manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "Clients read own reservations" ON public.reservations;

CREATE POLICY "Admins manage reservations"
  ON public.reservations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles AS role
    WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles AS role
    WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ));

CREATE POLICY "Clients read own reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes_corp AS client
    WHERE client.id = reservations.cliente_corp_id
      AND client.user_id = auth.uid()::text
      AND client.deleted_at IS NULL
  ));

REVOKE ALL ON TABLE public.clientes_corp, public.reservations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clientes_corp, public.reservations TO authenticated;

NOTIFY pgrst, 'reload schema';