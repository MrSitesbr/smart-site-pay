
-- 1. Adicionar colunas de unidade e sala em reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sala_id UUID REFERENCES public.salas(id) ON DELETE SET NULL;

-- 2. Garantir permissões nas novas colunas (visto que o projeto usa bypass/anon para admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

-- 3. Criar índice para performance de busca de conflitos
CREATE INDEX IF NOT EXISTS idx_reservations_sala_data ON public.reservations(sala_id, data);
CREATE INDEX IF NOT EXISTS idx_visitantes_sala_data ON public.visitantes(sala_id, data_hora_prevista);
