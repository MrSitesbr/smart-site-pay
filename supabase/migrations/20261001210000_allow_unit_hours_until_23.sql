BEGIN;

CREATE OR REPLACE FUNCTION public.validate_unidade_horarios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.horario_abertura < time '08:00'
     OR NEW.horario_fechamento > time '23:00'
     OR NEW.horario_abertura >= NEW.horario_fechamento THEN
    RAISE EXCEPTION 'O expediente deve começar a partir das 08:00 e terminar até as 23:00.';
  END IF;

  IF extract(minute FROM NEW.horario_abertura)::integer NOT IN (0, 30)
     OR extract(minute FROM NEW.horario_fechamento)::integer NOT IN (0, 30) THEN
    RAISE EXCEPTION 'Use intervalos de 30 minutos nos horários da agenda.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_unidade_horarios ON public.unidades;
CREATE TRIGGER validate_unidade_horarios
  BEFORE INSERT OR UPDATE OF horario_abertura, horario_fechamento
  ON public.unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unidade_horarios();

COMMIT;
