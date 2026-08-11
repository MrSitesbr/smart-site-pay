
-- 1. client_colors: remover leitura ampla, restringir a admins
DROP POLICY IF EXISTS "Authenticated can read client colors" ON public.client_colors;

-- 2. reservations: restringir INSERT a usuários autenticados
DROP POLICY IF EXISTS "Anyone can create reservation" ON public.reservations;
CREATE POLICY "Authenticated can create reservation"
ON public.reservations FOR INSERT
TO authenticated
WITH CHECK (true);
REVOKE INSERT ON public.reservations FROM anon;

-- 3. storage assets: remover políticas de escrita públicas
DROP POLICY IF EXISTS "Permitir Delete para Todos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Update para Todos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Upload para Autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access Assets" ON storage.objects;
DROP POLICY IF EXISTS "Acesso Publico para Leitura de Mídias" ON storage.objects;

CREATE POLICY "Admins manage assets objects"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'assets' AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'assets' AND private.has_role(auth.uid(), 'admin'::app_role));

REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon, public;
