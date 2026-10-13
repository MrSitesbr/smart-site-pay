-- Fluxo de reservas: sala obrigatória, check-in confirma, checkout automático,
-- reserva própria visível ao cliente e cancelamento de recorrência a partir de uma data.

-- 1) Vincula reservas antigas (criadas pelo admin sem cliente) ao cliente pelo e-mail.
UPDATE public.reservations AS reservation
   SET cliente_corp_id = client.id
  FROM public.clientes_corp AS client
 WHERE reservation.cliente_corp_id IS NULL
   AND coalesce(btrim(reservation.email), '') <> ''
   AND lower(btrim(reservation.email)) = lower(btrim(client.responsavel_email))
   AND client.deleted_at IS NULL
   AND (
     SELECT count(*)
     FROM public.clientes_corp AS candidate
     WHERE candidate.deleted_at IS NULL
       AND lower(btrim(candidate.responsavel_email)) = lower(btrim(reservation.email))
   ) = 1;

-- 2) Novas reservas sempre com unidade e sala definidas (admin, cliente e qualquer outro caminho).
CREATE OR REPLACE FUNCTION public.require_reservation_room()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sala_id IS NULL OR btrim(NEW.sala_id::text) = '' THEN
    RAISE EXCEPTION 'Escolha a unidade e a sala.' USING ERRCODE = '23502';
  END IF;
  IF NEW.unidade_id IS NULL THEN
    SELECT room.unidade_id INTO NEW.unidade_id
    FROM public.salas AS room
    WHERE room.id::text = NEW.sala_id::text;
  END IF;
  IF NEW.unidade_id IS NULL THEN
    RAISE EXCEPTION 'Escolha a unidade e a sala.' USING ERRCODE = '23502';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_require_room ON public.reservations;
CREATE TRIGGER reservations_require_room
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.require_reservation_room();

-- 3) Disponibilidade pública informa se a reserva é do cliente logado (e o status só nesse caso).
DROP FUNCTION IF EXISTS public.get_public_room_availability(date, date, text);
CREATE FUNCTION public.get_public_room_availability(
  p_start_date date,
  p_end_date date,
  p_sala_id text DEFAULT NULL
)
RETURNS TABLE (
  sala_id text,
  data text,
  hora_inicio text,
  hora_fim text,
  color_slot integer,
  propria boolean,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  IF p_end_date - p_start_date > 62 THEN
    RAISE EXCEPTION 'Consulte no máximo 63 dias por vez.';
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT client.id::text AS id, lower(btrim(coalesce(client.responsavel_email, ''))) AS email
    FROM public.clientes_corp AS client
    WHERE auth.uid() IS NOT NULL
      AND client.user_id = auth.uid()::text
      AND client.deleted_at IS NULL
  ), base AS (
    SELECT
      reservation.sala_id::text AS sala_id,
      reservation.data::text AS data,
      reservation.hora_inicio::text AS hora_inicio,
      reservation.hora_fim::text AS hora_fim,
      mod(abs(hashtext(coalesce(reservation.id::text, reservation.sala_id::text))), 6)::integer AS color_slot,
      EXISTS (
        SELECT 1 FROM mine
        WHERE mine.id = reservation.cliente_corp_id::text
           OR (reservation.cliente_corp_id IS NULL AND mine.email <> '' AND mine.email = lower(btrim(coalesce(reservation.email, ''))))
      ) AS propria,
      reservation.status::text AS status
    FROM public.reservations AS reservation
    JOIN public.salas AS room ON room.id::text = reservation.sala_id::text
    JOIN public.unidades AS unit ON unit.id = room.unidade_id
    WHERE reservation.sala_id IS NOT NULL
      AND reservation.data::date BETWEEN p_start_date AND p_end_date
      AND coalesce(reservation.status::text, '') <> 'cancelada'
      AND (p_sala_id IS NULL OR reservation.sala_id::text = p_sala_id)
      AND room.status IN ('disponivel', 'ativa')
      AND unit.status ILIKE 'ativ%'
      AND unit.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
  )
  SELECT base.sala_id, base.data, base.hora_inicio, base.hora_fim, base.color_slot, base.propria,
         CASE WHEN base.propria THEN base.status ELSE NULL END
  FROM base
  ORDER BY base.data, base.hora_inicio;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_room_availability(date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, text) TO anon, authenticated;

-- 4) Check-in/checkout: colunas de checkout e acesso somente para admin.
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS checkout_at timestamptz;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS checkout_auto boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "checkins_all" ON public.checkins;
DROP POLICY IF EXISTS "checkins_admin_access" ON public.checkins;
CREATE POLICY "checkins_admin_access" ON public.checkins
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = auth.uid() AND role.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = auth.uid() AND role.role = 'admin'));
REVOKE ALL ON TABLE public.checkins FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.checkins TO authenticated;

-- 5) Checkout automático: confirmadas cujo horário terminou viram "realizada".
CREATE OR REPLACE FUNCTION public.finalize_finished_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_agora timestamp := now() AT TIME ZONE 'America/Sao_Paulo';
  v_total integer;
BEGIN
  WITH encerradas AS (
    UPDATE public.reservations AS reservation
       SET status = 'realizada'
     WHERE reservation.status::text = 'confirmada'
       AND (reservation.data::date + reservation.hora_fim::time) <= v_agora
    RETURNING reservation.id, reservation.data, reservation.hora_fim
  ), saidas AS (
    UPDATE public.checkins AS checkin
       SET checkout_at = ((encerradas.data::date + encerradas.hora_fim::time) AT TIME ZONE 'America/Sao_Paulo'),
           checkout_auto = true
      FROM encerradas
     WHERE checkin.reservation_id::text = encerradas.id::text
       AND checkin.checkout_at IS NULL
    RETURNING checkin.id
  )
  SELECT count(*) INTO v_total FROM encerradas;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_finished_reservations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_finished_reservations() TO authenticated, service_role;

-- Agenda o checkout automático a cada 10 minutos (quando pg_cron estiver disponível).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('finalize-reservations', '*/10 * * * *', 'select public.finalize_finished_reservations()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível; o checkout automático roda ao abrir a agenda do admin. (%)', SQLERRM;
END;
$$;

-- 6) Cancela uma recorrência a partir de uma data, preservando realizadas, check-ins e datas passadas.
CREATE OR REPLACE FUNCTION public.cancel_reservation_series(p_serie_id text, p_from date)
RETURNS TABLE (id text, google_event_id text, google_calendar_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inicio date := greatest(coalesce(p_from, current_date), (now() AT TIME ZONE 'America/Sao_Paulo')::date);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = auth.uid() AND role.role = 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem cancelar recorrências.' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_serie_id), '') = '' THEN
    RAISE EXCEPTION 'Recorrência inválida.';
  END IF;

  RETURN QUERY
  WITH alvo AS (
    SELECT reservation.id AS rid,
           reservation.google_event_id::text AS gid,
           reservation.google_calendar_id::text AS cid
    FROM public.reservations AS reservation
    WHERE reservation.serie_id::text = p_serie_id
      AND reservation.data::date >= v_inicio
      AND reservation.status::text IN ('pendente', 'confirmada')
      AND NOT EXISTS (SELECT 1 FROM public.checkins AS checkin WHERE checkin.reservation_id::text = reservation.id::text)
  ), cancelados AS (
    UPDATE public.reservations AS reservation
       SET status = 'cancelada',
           cancelled_at = now(),
           cancel_motivo = 'Cancelamento da recorrência a partir de ' || to_char(v_inicio, 'DD/MM/YYYY'),
           google_event_id = NULL
      FROM alvo
     WHERE reservation.id = alvo.rid
    RETURNING alvo.rid, alvo.gid, alvo.cid
  )
  SELECT cancelados.rid::text, cancelados.gid, cancelados.cid FROM cancelados;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_reservation_series(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_reservation_series(text, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
