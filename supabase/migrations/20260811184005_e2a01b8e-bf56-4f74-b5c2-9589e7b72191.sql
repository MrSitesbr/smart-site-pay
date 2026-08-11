-- Relax security for contract_requests
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_requests TO anon;
GRANT ALL ON public.contract_requests TO service_role;

DROP POLICY IF EXISTS "Permissao Total Contract Requests" ON public.contract_requests;
CREATE POLICY "Permissao Total Contract Requests" 
ON public.contract_requests FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- Also ensure units and rooms have permissive access as requested for the bypass mode
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salas TO authenticated, anon;

DROP POLICY IF EXISTS "Permissao Total Unidades" ON public.unidades;
CREATE POLICY "Permissao Total Unidades" ON public.unidades FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Salas" ON public.salas;
CREATE POLICY "Permissao Total Salas" ON public.salas FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS for Storage (SQL on storage.objects is allowed)
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO service_role;

DROP POLICY IF EXISTS "Acesso Publico Storage" ON storage.objects;
CREATE POLICY "Acesso Publico Storage"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'assets')
WITH CHECK (bucket_id = 'assets');
