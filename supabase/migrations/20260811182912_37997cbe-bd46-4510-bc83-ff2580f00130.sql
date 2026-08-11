
-- Tentar apenas as políticas sem o ALTER TABLE (que exige ser owner)
-- Como o bucket já existe, focamos nas políticas de acesso que geralmente são permitidas via SECURITY DEFINER ou service_role que o Lovable usa

DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
CREATE POLICY "Public Read Assets" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "Public Insert Assets" ON storage.objects;
CREATE POLICY "Public Insert Assets" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'assets');

-- Grant para garantir que o Data API consiga ver os registros
GRANT SELECT, INSERT ON storage.objects TO public;
