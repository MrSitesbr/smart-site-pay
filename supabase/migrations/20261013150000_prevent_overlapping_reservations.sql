-- Impede reservas com horário sobreposto na mesma sala (respeitando a capacidade das salas
-- compartilhadas) e também entre reservas antigas sem sala definida.

-- 1) Limpa duplicatas exatas já existentes: mesmo cliente, data, horário e sala (inclusive sem sala).
--    Mantém a mais importante (realizada / com check-in / mais antiga) e cancela as demais, sem apagar nada.
WITH ranqueadas AS (
  SELECT reservation.id,
         row_number() OVER (
           PARTITION BY lower(btrim(coalesce(reservation.email, ''))),
                        lower(btrim(coalesce(reservation.nome, ''))),
                        reservation.data::text,
                        reservation.hora_inicio::time,
                        reservation.hora_fim::time,
                        coalesce(reservation.sala_id::text, '')
           ORDER BY (reservation.status::text = 'realizada') DESC,
                    EXISTS (SELECT 1 FROM public.checkins AS checkin WHERE checkin.reservation_id::text = reservation.id::text) DESC,
                    (reservation.status::text = 'confirmada') DESC,
                    reservation.created_at ASC
         ) AS posicao
  FROM public.reservations AS reservation
  WHERE reservation.status::text <> 'cancelada'
)
UPDATE public.reservations AS reservation
   SET status = 'cancelada',
       cancelled_at = now(),
       cancel_motivo = 'Reserva duplicada cancelada automaticamente'
  FROM ranqueadas
 WHERE reservation.id = ranqueadas.id
   AND ranqueadas.posicao > 1;

-- 2) Validação em toda inclusão e alteração de reserva.
CREATE OR REPLACE FUNCTION public.require_reservation_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio time;
  v_fim time;
  v_capacidade integer := 1;
  v_ocupadas integer;
  v_mudou_agenda boolean;
BEGIN
  -- Cancelamentos nunca são bloqueados.
  IF coalesce(NEW.status::text, '') = 'cancelada' THEN
    RETURN NEW;
  END IF;

  v_mudou_agenda := TG_OP = 'INSERT'
    OR NEW.data IS DISTINCT FROM OLD.data
    OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
    OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim
    OR NEW.sala_id IS DISTINCT FROM OLD.sala_id
    OR coalesce(OLD.status::text, '') = 'cancelada';

  -- Check-in, valores e outros campos de reservas já existentes não são revalidados.
  IF NOT v_mudou_agenda THEN
    RETURN NEW;
  END IF;

  -- Toda reserva nova ou remarcada precisa de sala.
  IF NEW.sala_id IS NULL OR btrim(NEW.sala_id::text) = '' THEN
    RAISE EXCEPTION 'Escolha a unidade e a sala.' USING ERRCODE = '23502';
  END IF;
  IF NEW.unidade_id IS NULL THEN
    SELECT room.unidade_id INTO NEW.unidade_id FROM public.salas AS room WHERE room.id::text = NEW.sala_id::text;
  END IF;
  IF NEW.unidade_id IS NULL THEN
    RAISE EXCEPTION 'Escolha a unidade e a sala.' USING ERRCODE = '23502';
  END IF;

  v_inicio := NEW.hora_inicio::time;
  v_fim := NEW.hora_fim::time;
  IF v_fim <= v_inicio THEN
    RAISE EXCEPTION 'O horário final deve ser posterior ao inicial.' USING ERRCODE = '22007';
  END IF;

  -- Serializa reservas da mesma sala e dia para evitar duas gravações simultâneas no mesmo horário.
  PERFORM pg_advisory_xact_lock(hashtext('reserva:' || NEW.sala_id::text || ':' || NEW.data::text));

  SELECT CASE
           WHEN 'compartilhado' = ANY(coalesce(room.categorias, '{}'::text[]))
             OR lower(coalesce(room.tipo, '')) ~ 'comp|estac|coworking'
           THEN greatest(coalesce(room.capacidade, 1), 1)
           ELSE 1
         END
    INTO v_capacidade
    FROM public.salas AS room
   WHERE room.id::text = NEW.sala_id::text;
  v_capacidade := coalesce(v_capacidade, 1);

  SELECT count(*) INTO v_ocupadas
    FROM public.reservations AS existing
   WHERE existing.id::text <> NEW.id::text
     AND existing.sala_id::text = NEW.sala_id::text
     AND existing.data::date = NEW.data::date
     AND coalesce(existing.status::text, '') <> 'cancelada'
     AND v_inicio < existing.hora_fim::time
     AND v_fim > existing.hora_inicio::time;

  IF v_ocupadas >= v_capacidade THEN
    RAISE EXCEPTION 'Horário já reservado nesta sala em %. Escolha outro horário ou outra sala.', to_char(NEW.data::date, 'DD/MM/YYYY')
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_require_room ON public.reservations;
CREATE TRIGGER reservations_require_room
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.require_reservation_room();

NOTIFY pgrst, 'reload schema';
