-- Completa a operação de estações compartilhadas e preserva histórico administrativo.
ALTER TABLE public.clientes_corp
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS clientes_corp_deleted_at_idx ON public.clientes_corp(deleted_at);
CREATE INDEX IF NOT EXISTS planos_deleted_at_idx ON public.planos(deleted_at);

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  realizado_em timestamptz NOT NULL DEFAULT now(),
  realizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);

GRANT SELECT, INSERT, UPDATE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_admin_access" ON public.checkins;
CREATE POLICY "checkins_admin_access" ON public.checkins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Garante uma sala compartilhada por unidade sem criar duplicatas em reexecuções.
INSERT INTO public.salas (unidade_id, nome, tipo, capacidade, descricao)
SELECT u.id, 'Estação Compartilhada', 'compartilhada', 14,
       'Espaço compartilhado com 14 vagas por horário.'
FROM public.unidades u
WHERE NOT EXISTS (
  SELECT 1 FROM public.salas s
  WHERE s.unidade_id = u.id
    AND lower(s.nome) = lower('Estação Compartilhada')
);

-- Mantém a primeira Sala Amarela de cada unidade e libera referências das duplicatas.
WITH duplicadas AS (
  SELECT id, unidade_id,
         row_number() OVER (PARTITION BY unidade_id, lower(nome) ORDER BY created_at, id) AS ordem
  FROM public.salas
  WHERE lower(nome) = lower('Sala Amarela')
)
DELETE FROM public.salas s
USING duplicadas d
WHERE s.id = d.id AND d.ordem > 1;

-- Soft delete: registros arquivados continuam disponíveis para auditoria.
GRANT UPDATE ON public.clientes_corp TO authenticated;
GRANT UPDATE ON public.planos TO authenticated;
