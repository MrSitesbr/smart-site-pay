GRANT ALL ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;
GRANT SELECT ON public.unidades TO anon;

-- Verificar RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Allow public read'
    ) THEN
        CREATE POLICY "Allow public read" ON public.unidades FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Allow admin all'
    ) THEN
        CREATE POLICY "Allow admin all" ON public.unidades FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;
