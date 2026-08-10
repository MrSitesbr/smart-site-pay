ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Re-grant permissions to ensure the app can access the new columns
GRANT ALL ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;
GRANT SELECT ON public.unidades TO anon;
