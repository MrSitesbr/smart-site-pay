ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS horario_abertura time without time zone NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS horario_fechamento time without time zone NOT NULL DEFAULT '20:00';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT ON public.unidades TO anon;
GRANT ALL ON public.unidades TO service_role;

CREATE OR REPLACE FUNCTION public.validate_unidade_horarios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.horario_abertura < time '08:00'
     OR NEW.horario_fechamento > time '20:00'
     OR NEW.horario_abertura >= NEW.horario_fechamento THEN
    RAISE EXCEPTION 'O expediente da agenda deve começar a partir das 08:00 e terminar até as 20:00.';
  END IF;
  IF extract(minute FROM NEW.horario_abertura)::integer NOT IN (0, 30)
     OR extract(minute FROM NEW.horario_fechamento)::integer NOT IN (0, 30) THEN
    RAISE EXCEPTION 'Use intervalos de 30 minutos nos horários da agenda.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_unidade_horarios_trigger ON public.unidades;
CREATE TRIGGER validate_unidade_horarios_trigger
BEFORE INSERT OR UPDATE OF horario_abertura, horario_fechamento ON public.unidades
FOR EACH ROW EXECUTE FUNCTION public.validate_unidade_horarios();