-- Allow each approved client to manage only records linked to its own company.
DROP POLICY IF EXISTS "Clients manage own collaborators" ON public.funcionarios_cliente;
CREATE POLICY "Clients manage own collaborators" ON public.funcionarios_cliente
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clientes_corp
    WHERE clientes_corp.id = funcionarios_cliente.cliente_corp_id
      AND clientes_corp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes_corp
    WHERE clientes_corp.id = funcionarios_cliente.cliente_corp_id
      AND clientes_corp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients manage own visitors" ON public.visitantes;
CREATE POLICY "Clients manage own visitors" ON public.visitantes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clientes_corp
    WHERE clientes_corp.id = visitantes.cliente_corp_id
      AND clientes_corp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes_corp
    WHERE clientes_corp.id = visitantes.cliente_corp_id
      AND clientes_corp.user_id = auth.uid()
  )
);
