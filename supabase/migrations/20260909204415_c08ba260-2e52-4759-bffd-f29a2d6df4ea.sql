
CREATE POLICY "cliente le seus arquivos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-docs' AND (storage.foldername(name))[1] = public.current_cliente_id()::text);

CREATE POLICY "admin gerencia arquivos client-docs" ON storage.objects
  FOR ALL TO authenticated, anon
  USING (bucket_id = 'client-docs' AND (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL))
  WITH CHECK (bucket_id = 'client-docs' AND (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL));
