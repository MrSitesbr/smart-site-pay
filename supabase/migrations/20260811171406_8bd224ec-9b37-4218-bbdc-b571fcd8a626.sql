
-- Criar políticas permissivas na storage.objects que ignoram o check de 'public' do bucket
-- se o acesso for via RLS (Select para todos)

DROP POLICY IF EXISTS "Allow Public View" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Allow Public View"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Re-aplicar permissões de escrita para anon/public para suportar o admin bypass
DROP POLICY IF EXISTS "Anyone can upload to assets" ON storage.objects;
CREATE POLICY "Anyone can upload to assets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assets');

DROP POLICY IF EXISTS "Anyone can update own assets" ON storage.objects;
CREATE POLICY "Anyone can update own assets"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "Anyone can delete own assets" ON storage.objects;
CREATE POLICY "Anyone can delete own assets"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'assets');

-- Grant explícito para anon na tabela de objetos para evitar permissão negada
GRANT ALL ON storage.objects TO anon;
GRANT SELECT ON storage.objects TO anon;
