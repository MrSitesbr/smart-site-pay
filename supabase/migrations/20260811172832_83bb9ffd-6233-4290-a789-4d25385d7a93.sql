
-- Garantir permissões de acesso ao schema storage para usuários anônimos
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access Assets" ON storage.objects;

-- Criar política de leitura pública para o bucket 'assets'
-- Mesmo que o bucket seja privado, a política RLS permite o SELECT se o token for válido ou se for público
CREATE POLICY "Public Read Assets" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'assets');

-- Criar política de acesso total para o bypass administrativo
CREATE POLICY "Admin Full Access Assets" ON storage.objects
FOR ALL TO public
USING (bucket_id = 'assets')
WITH CHECK (bucket_id = 'assets');

-- Tentar atualizar o bucket para público (pode falhar, mas o RLS acima garante o acesso se o bucket permitir SELECT)
-- UPDATE storage.buckets SET public = true WHERE id = 'assets';
