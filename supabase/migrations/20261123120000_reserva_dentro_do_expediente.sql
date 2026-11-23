-- Toda reserva precisa caber no expediente da unidade naquele dia (unidade_horarios / feriados).
-- Antes só o agendamento do cliente validava; inclusões diretas na tabela (assistente do admin,
-- integrações, edições) podiam gravar, por exemplo, 08:00 num sábado que abre às 09:00.
-- Reservas já existentes não são alteradas; só novas inclusões e mudanças de data/horário/sala.

CREATE OR REPLACE FUNCTION public.validar_reserva_expediente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_unidade uuid;
  v_data date;
  v_inicio time;
  v_fim time;
  v_abre time;
  v_fecha time;
  v_fechado boolean;
BEGIN
  -- Cancelamentos nunca são bloqueados.
  IF coalesce(NEW.status::text, '') = 'cancelada' THEN
    RETURN NEW;
  END IF;

  -- Check-in, valores, status e outros campos de reservas existentes não são revalidados.
  IF TG_OP = 'UPDATE'
     AND NEW.data IS NOT DISTINCT FROM OLD.data
     AND NEW.hora_inicio IS NOT DISTINCT FROM OLD.hora_inicio
     AND NEW.hora_fim IS NOT DISTINCT FROM OLD.hora_fim
     AND NEW.sala_id IS NOT DISTINCT FROM OLD.sala_id
     AND coalesce(OLD.status::text, '') <> 'cancelada' THEN
    RETURN NEW;
  END IF;

  IF NEW.sala_id IS NULL OR NEW.data IS NULL OR NEW.hora_inicio IS NULL OR NEW.hora_fim IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT room.unidade_id::uuid INTO v_unidade FROM public.salas AS room WHERE room.id::text = NEW.sala_id::text;
  IF v_unidade IS NULL THEN
    RETURN NEW;
  END IF;

  v_data := NEW.data::date;
  v_inicio := NEW.hora_inicio::time;
  v_fim := NEW.hora_fim::time;

  SELECT h.abre, h.fecha, h.fechado INTO v_abre, v_fecha, v_fechado
    FROM public.unidade_horario_dia(v_unidade, v_data) AS h;

  IF coalesce(v_fechado, false) THEN
    RAISE EXCEPTION 'A unidade não funciona em %.', to_char(v_data, 'DD/MM/YYYY') USING ERRCODE = '23514';
  END IF;
  IF v_abre IS NOT NULL AND (v_inicio < v_abre OR v_fim > v_fecha) THEN
    RAISE EXCEPTION 'Horário fora do expediente da unidade em % (% às %).',
      to_char(v_data, 'DD/MM/YYYY'), to_char(v_abre, 'HH24:MI'), to_char(v_fecha, 'HH24:MI')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_validar_expediente ON public.reservations;
CREATE TRIGGER reservations_validar_expediente
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.validar_reserva_expediente();

NOTIFY pgrst, 'reload schema';
