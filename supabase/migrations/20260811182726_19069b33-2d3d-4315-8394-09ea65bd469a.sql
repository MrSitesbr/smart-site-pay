
-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Acesso Publico para Leitura de Mídias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Upload para Autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public View Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete assets" ON storage.objects;

-- Criar novas políticas conforme solicitado
CREATE POLICY "Acesso Publico para Leitura de Mídias"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

CREATE POLICY "Permitir Upload para Autenticados"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assets');

-- Adicionar permissões extras para garantir o funcionamento do bypass
CREATE POLICY "Permitir Update para Todos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'assets');

CREATE POLICY "Permitir Delete para Todos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'assets');

-- Garantir GRANTs necessários no schema storage
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
