
-- Já que não posso inserir em storage.buckets diretamente via migração,
-- vamos garantir as políticas RLS na storage.objects que permitem o acesso público.
-- O bucket 'assets' já existe, o problema é o status 'public' dele.
-- A política RLS SELECT em storage.objects PODE ignorar o status public do bucket
-- se for escrita corretamente.

DROP POLICY IF EXISTS "Allow Public View" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Criar uma política de SELECT que permite leitura baseado no bucket_id
-- independente de o bucket estar marcado como public ou não na tabela buckets,
-- desde que a role tenha permissão.
CREATE POLICY "Allow Public View"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Re-garantir permissões de escrita para o admin bypass
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

-- GRANTs são cruciais no Lovable Cloud para o anon acessar o schema storage
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;
GRANT INSERT ON storage.objects TO anon;
GRANT UPDATE ON storage.objects TO anon;
GRANT DELETE ON storage.objects TO anon;

GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;
