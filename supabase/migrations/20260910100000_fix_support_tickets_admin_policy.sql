-- O helper público has_role foi removido das permissões da API.
-- As policies administrativas devem usar o helper privado já adotado pelo projeto.
DROP POLICY IF EXISTS "support_tickets_admin_access" ON public.support_tickets;

CREATE POLICY "support_tickets_admin_access" ON public.support_tickets
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));