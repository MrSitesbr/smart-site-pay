ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS valor numeric,
  ADD COLUMN IF NOT EXISTS valor_original numeric,
  ADD COLUMN IF NOT EXISTS desconto_motivo text,
  ADD COLUMN IF NOT EXISTS desconto_por text,
  ADD COLUMN IF NOT EXISTS serie_id uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_motivo text;

CREATE INDEX IF NOT EXISTS reservations_serie_id_idx ON public.reservations(serie_id);

CREATE TABLE IF NOT EXISTS public.pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'pendente',
  prioridade integer NOT NULL DEFAULT 2,
  responsavel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias TO anon;
GRANT ALL ON public.pendencias TO service_role;

ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pendencias_all_access" ON public.pendencias FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER pendencias_updated_at BEFORE UPDATE ON public.pendencias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();