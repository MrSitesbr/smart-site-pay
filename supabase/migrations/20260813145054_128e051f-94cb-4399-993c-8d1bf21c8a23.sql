CREATE TABLE IF NOT EXISTS public.media_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename text NOT NULL,
    file_type text NOT NULL,
    mime_type text,
    url text NOT NULL,
    size_bytes bigint,
    created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO anon;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_library' AND policyname = 'Allow all') THEN
        CREATE POLICY "Allow all" ON public.media_library FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
