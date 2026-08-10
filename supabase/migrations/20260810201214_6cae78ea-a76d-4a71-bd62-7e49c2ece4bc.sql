
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete own assets" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'assets' );
CREATE POLICY "Anyone can upload to assets" ON storage.objects FOR INSERT TO public WITH CHECK ( bucket_id = 'assets' );
CREATE POLICY "Anyone can update own assets" ON storage.objects FOR UPDATE TO public USING ( bucket_id = 'assets' );
CREATE POLICY "Anyone can delete own assets" ON storage.objects FOR DELETE TO public USING ( bucket_id = 'assets' );
