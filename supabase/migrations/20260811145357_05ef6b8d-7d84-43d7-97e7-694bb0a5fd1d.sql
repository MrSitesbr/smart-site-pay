
-- Fix RLS for all existing tables in the project for admin bypass mode
DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'reservations', 
        'contract_requests', 
        'clientes_corp', 
        'visitantes', 
        'funcionarios_cliente', 
        'unidades', 
        'salas', 
        'sala_planos', 
        'planos', 
        'servicos', 
        'site_pages',
        'site_sections',
        'contratos_ativos',
        'client_colors'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- Grant permissions
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
        
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Create permissive policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all for everyone on ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', 'Allow all for everyone on ' || t, t);
    END LOOP;
END $$;
