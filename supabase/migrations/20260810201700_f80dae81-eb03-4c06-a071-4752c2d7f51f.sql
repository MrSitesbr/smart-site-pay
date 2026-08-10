
-- Garantir que a tabela salas e tabelas relacionadas tenham GRANTs e RLS corretos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salas TO authenticated;
GRANT ALL ON public.salas TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_planos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_planos TO authenticated;
GRANT ALL ON public.sala_planos TO service_role;

-- Recriar políticas de forma permissiva
DROP POLICY IF EXISTS "Allow all for everyone on salas" ON public.salas;
CREATE POLICY "Allow all for everyone on salas" ON public.salas FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for everyone on unidades" ON public.unidades;
CREATE POLICY "Allow all for everyone on unidades" ON public.unidades FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for everyone on sala_planos" ON public.sala_planos;
CREATE POLICY "Allow all for everyone on sala_planos" ON public.sala_planos FOR ALL TO public USING (true) WITH CHECK (true);
