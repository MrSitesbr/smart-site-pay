-- Add missing columns to clientes_corp if they don't exist
ALTER TABLE public.clientes_corp ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.unidades(id);
ALTER TABLE public.clientes_corp ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES public.planos(id);

-- Re-grant ALL to support bypass
GRANT ALL ON public.clientes_corp TO authenticated, anon;

-- Refresh bypass policy
DROP POLICY IF EXISTS "Bypass Mode" ON public.clientes_corp;
CREATE POLICY "Bypass Mode" ON public.clientes_corp FOR ALL TO public USING (true) WITH CHECK (true);
