ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativa'::text;

ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativa'::text;

ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativa'::text;

UPDATE public.unidades SET status = 'ativa' WHERE status IS NULL OR status NOT IN ('ativa', 'inativa');
UPDATE public.salas SET status = 'ativa' WHERE status IS NULL OR status NOT IN ('ativa', 'inativa');
UPDATE public.servicos SET status = 'ativa' WHERE status IS NULL OR status NOT IN ('ativa', 'inativa');

ALTER TABLE public.unidades
  ALTER COLUMN status SET DEFAULT 'ativa',
  ADD CONSTRAINT unidades_status_check CHECK (status IN ('ativa', 'inativa'));

ALTER TABLE public.salas
  ALTER COLUMN status SET DEFAULT 'ativa',
  ADD CONSTRAINT salas_status_check CHECK (status IN ('ativa', 'inativa'));

ALTER TABLE public.servicos
  ALTER COLUMN status SET DEFAULT 'ativa',
  ADD CONSTRAINT servicos_status_check CHECK (status IN ('ativa', 'inativa'));
