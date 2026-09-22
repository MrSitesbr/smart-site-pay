ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS modalidades_locacao text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.salas
SET categorias = ARRAY[categoria]
WHERE cardinality(categorias) = 0
  AND categoria IS NOT NULL
  AND btrim(categoria) <> '';

UPDATE public.salas
SET modalidades_locacao = ARRAY(
  SELECT DISTINCT modalidade
  FROM unnest(ARRAY[
    CASE WHEN tipo_locacao = 'locacao_mensal' THEN 'mensal' END,
    CASE WHEN tipo_locacao = 'locacao_periodo' OR subtipo_periodo = 'locacao_avulsa' THEN 'avulso' END
  ]) AS modalidade
  WHERE modalidade IS NOT NULL
)
WHERE cardinality(modalidades_locacao) = 0;

UPDATE public.salas
SET modalidades_locacao = ARRAY['mensal']::text[]
WHERE cardinality(modalidades_locacao) = 0;

ALTER TABLE public.salas DROP CONSTRAINT IF EXISTS salas_categorias_check;
ALTER TABLE public.salas ADD CONSTRAINT salas_categorias_check
CHECK (
  cardinality(categorias) > 0
  AND categorias <@ ARRAY['privativa','compartilhado','consultorio_poltrona','consultorio_maca']::text[]
);

ALTER TABLE public.salas DROP CONSTRAINT IF EXISTS salas_modalidades_locacao_check;
ALTER TABLE public.salas ADD CONSTRAINT salas_modalidades_locacao_check
CHECK (
  cardinality(modalidades_locacao) > 0
  AND modalidades_locacao <@ ARRAY['avulso','mensal']::text[]
);

ALTER TABLE public.contract_requests DROP CONSTRAINT IF EXISTS contract_requests_status_check;
UPDATE public.contract_requests
SET status = CASE
  WHEN status IN ('pendente','contato','aprovada','negociacao','paga','concluida','cancelada') THEN status
  ELSE 'pendente'
END;
ALTER TABLE public.contract_requests ADD CONSTRAINT contract_requests_status_check
CHECK (status IN ('pendente','contato','aprovada','negociacao','paga','concluida','cancelada'));

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS horas_reservadas numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_cobertas_plano numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_excedentes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculo_justificativa text,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz,
  ADD COLUMN IF NOT EXISTS modified_by uuid;

CREATE TABLE IF NOT EXISTS public.reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  previous_data jsonb NOT NULL,
  new_data jsonb NOT NULL
);
GRANT SELECT ON public.reservation_history TO authenticated;
GRANT ALL ON public.reservation_history TO service_role;
ALTER TABLE public.reservation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view reservation history" ON public.reservation_history;
CREATE POLICY "Admins can view reservation history"
ON public.reservation_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_reservation_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
    INSERT INTO public.reservation_history(reservation_id, changed_by, previous_data, new_data)
    VALUES (NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    NEW.modified_at := now();
    NEW.modified_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_history_trigger ON public.reservations;
CREATE TRIGGER reservations_history_trigger
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.record_reservation_history();

REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservation(uuid, date, time without time zone, time without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb, text, text, text, text) FROM anon;