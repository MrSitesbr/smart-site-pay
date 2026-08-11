-- Grant ALL to authenticated and anon to support admin bypass
GRANT ALL ON public.clientes_corp TO authenticated, anon;
GRANT ALL ON public.funcionarios_cliente TO authenticated, anon;
GRANT ALL ON public.visitantes TO authenticated, anon;
GRANT ALL ON public.planos TO authenticated, anon;
GRANT ALL ON public.servicos TO authenticated, anon;
GRANT ALL ON public.unidades TO authenticated, anon;
GRANT ALL ON public.salas TO authenticated, anon;
GRANT ALL ON public.reservations TO authenticated, anon;
GRANT ALL ON public.contract_requests TO authenticated, anon;
GRANT ALL ON public.contratos_ativos TO authenticated, anon;
GRANT ALL ON public.plano_unidades TO authenticated, anon;
GRANT ALL ON public.sala_planos TO authenticated, anon;

-- Ensure RLS is enabled but policies allow all for now (Admin Bypass Mode)
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Bypass Mode" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Bypass Mode" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
