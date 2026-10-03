CREATE OR REPLACE FUNCTION public.get_public_room_availability(
  p_start_date date,
  p_end_date date,
  p_sala_id text DEFAULT NULL
)
RETURNS TABLE (
  sala_id text,
  data text,
  hora_inicio text,
  hora_fim text,
  color_slot integer
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
  SELECT
    reservation.sala_id,
    reservation.data,
    reservation.hora_inicio,
    reservation.hora_fim,
    mod(abs(hashtext(coalesce(reservation.id, reservation.sala_id))), 6)::integer
  FROM public.reservations AS reservation
  JOIN public.salas AS room ON room.id = reservation.sala_id
  JOIN public.unidades AS unit ON unit.id = room.unidade_id
  WHERE reservation.sala_id IS NOT NULL
    AND reservation.data::date BETWEEN p_start_date AND p_end_date
    AND coalesce(reservation.status, '') <> 'cancelada'
    AND (p_sala_id IS NULL OR reservation.sala_id = p_sala_id)
    AND room.status IN ('disponivel', 'ativa')
    AND unit.status ILIKE 'ativ%'
    AND unit.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
  ORDER BY reservation.data, reservation.hora_inicio;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_room_availability(date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_authenticated_reservations(
  p_periodos jsonb,
  p_sala_id text DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cliente public.clientes_corp%ROWTYPE;
  v_sala public.salas%ROWTYPE;
  v_unidade public.unidades%ROWTYPE;
  v_ambiente text;
  v_item jsonb;
  v_data date;
  v_inicio time;
  v_fim time;
  v_abertura time;
  v_fechamento time;
  v_capacidade integer;
  v_ids text[] := ARRAY[]::text[];
  v_id text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para solicitar uma reserva.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cliente
  FROM public.clientes_corp
  WHERE user_id = auth.uid()::text
    AND status_acesso = 'aprovado'
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_cliente.id IS NULL THEN
    RAISE EXCEPTION 'Seu cadastro ainda não está autorizado.' USING ERRCODE = '42501';
  END IF;

  IF p_periodos IS NULL OR jsonb_typeof(p_periodos) <> 'array' THEN
    RAISE EXCEPTION 'Informe uma lista válida de períodos.';
  END IF;
  v_count := jsonb_array_length(p_periodos);
  IF v_count < 1 OR v_count > 20 THEN
    RAISE EXCEPTION 'Escolha entre 1 e 20 períodos.';
  END IF;

  IF p_sala_id IS NOT NULL THEN
    SELECT room.*
      INTO v_sala
      FROM public.salas AS room
      JOIN public.unidades AS unit ON unit.id = room.unidade_id
     WHERE room.id = p_sala_id
       AND room.status IN ('disponivel', 'ativa')
       AND unit.status ILIKE 'ativ%'
       AND unit.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
     LIMIT 1;
    IF v_sala.id IS NULL THEN
      RAISE EXCEPTION 'Sala indisponível para agendamento.';
    END IF;
    SELECT unit.* INTO v_unidade
    FROM public.unidades AS unit
    WHERE unit.id = v_sala.unidade_id
    LIMIT 1;
    v_abertura := coalesce(v_unidade.horario_abertura, time '08:00');
    v_fechamento := coalesce(v_unidade.horario_fechamento, time '21:00');
    v_capacidade := CASE
      WHEN 'compartilhado' = ANY(coalesce(v_sala.categorias, '{}'::text[]))
        OR lower(coalesce(v_sala.tipo, '')) ~ 'comp|estac|coworking'
      THEN greatest(coalesce(v_sala.capacidade, 1), 1)
      ELSE 1
    END;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.client_requested_periods (
    data date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fim time NOT NULL,
    UNIQUE (data, hora_inicio, hora_fim)
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.client_requested_periods;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_periodos) LOOP
    BEGIN
      v_data := (v_item->>'data')::date;
      v_inicio := (v_item->>'hora_inicio')::time;
      v_fim := (v_item->>'hora_fim')::time;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Existe um período com data ou horário inválido.';
    END;

    IF v_data < current_date THEN RAISE EXCEPTION 'Escolha somente datas futuras.'; END IF;
    IF extract(isodow FROM v_data) = 7 THEN RAISE EXCEPTION 'Domingos não estão disponíveis para reserva.'; END IF;
    IF to_char(v_data, 'MM-DD') IN ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') THEN
      RAISE EXCEPTION 'Feriados nacionais não estão disponíveis para reserva.';
    END IF;
    IF v_inicio >= v_fim THEN RAISE EXCEPTION 'O horário final deve ser posterior ao inicial.'; END IF;
    IF extract(minute FROM v_inicio)::integer NOT IN (0, 30)
       OR extract(minute FROM v_fim)::integer NOT IN (0, 30) THEN
      RAISE EXCEPTION 'Os horários devem usar intervalos de 30 minutos.';
    END IF;

    IF p_sala_id IS NOT NULL THEN
      IF v_inicio < v_abertura OR v_fim > v_fechamento THEN
        RAISE EXCEPTION 'Escolha horários dentro do expediente disponível.';
      END IF;
      IF (
        SELECT count(*)
        FROM public.reservations AS existing
        WHERE existing.sala_id = p_sala_id
          AND existing.data::date = v_data
          AND coalesce(existing.status, '') <> 'cancelada'
          AND v_inicio < existing.hora_fim::time
          AND v_fim > existing.hora_inicio::time
      ) >= v_capacidade THEN
        RAISE EXCEPTION 'Um dos horários acabou de ficar indisponível. Revise a seleção.';
      END IF;
    ELSIF NOT EXISTS (
      SELECT 1
      FROM public.salas AS room
      JOIN public.unidades AS unit ON unit.id = room.unidade_id
      WHERE room.status IN ('disponivel', 'ativa')
        AND unit.status ILIKE 'ativ%'
        AND unit.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
        AND v_inicio >= coalesce(unit.horario_abertura, time '08:00')
        AND v_fim <= coalesce(unit.horario_fechamento, time '21:00')
        AND (
          SELECT count(*)
          FROM public.reservations AS existing
          WHERE existing.sala_id = room.id
            AND existing.data::date = v_data
            AND coalesce(existing.status, '') <> 'cancelada'
            AND v_inicio < existing.hora_fim::time
            AND v_fim > existing.hora_inicio::time
        ) < CASE
          WHEN 'compartilhado' = ANY(coalesce(room.categorias, '{}'::text[]))
            OR lower(coalesce(room.tipo, '')) ~ 'comp|estac|coworking'
          THEN greatest(coalesce(room.capacidade, 1), 1)
          ELSE 1
        END
    ) THEN
      RAISE EXCEPTION 'Não há uma sala livre em um dos períodos escolhidos.';
    END IF;

    BEGIN
      INSERT INTO pg_temp.client_requested_periods VALUES (v_data, v_inicio, v_fim);
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Há períodos repetidos na solicitação.';
    END;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.client_requested_periods AS a
    JOIN pg_temp.client_requested_periods AS b
      ON a.ctid <> b.ctid
     AND a.data = b.data
     AND a.hora_inicio < b.hora_fim
     AND a.hora_fim > b.hora_inicio
  ) THEN
    RAISE EXCEPTION 'Há períodos sobrepostos na solicitação.';
  END IF;

  v_ambiente := CASE
    WHEN p_sala_id IS NULL THEN 'sala_reuniao'
    WHEN 'compartilhado' = ANY(coalesce(v_sala.categorias, '{}'::text[])) THEN 'estacao'
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'privativ' THEN 'sala_privativa'
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'reuni|consult|audit' THEN 'sala_reuniao'
    ELSE 'estacao'
  END;

  FOR v_data, v_inicio, v_fim IN
    SELECT data, hora_inicio, hora_fim
    FROM pg_temp.client_requested_periods
    ORDER BY data, hora_inicio
  LOOP
    v_id := gen_random_uuid()::text;
    INSERT INTO public.reservations (
      id, nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
      status, origem, unidade_id, sala_id, cliente_corp_id, observacoes,
      created_at, updated_at, valor, valor_original, horas_reservadas,
      horas_cobertas_plano, horas_excedentes, calculo_justificativa
    ) VALUES (
      v_id,
      coalesce(nullif(v_cliente.responsavel_nome, ''), v_cliente.razao_social, 'Cliente'),
      coalesce(v_cliente.responsavel_email, ''),
      coalesce(v_cliente.responsavel_telefone, ''),
      v_ambiente, 'hora', v_data::text, v_inicio::text, v_fim::text,
      'pendente', 'Painel do cliente',
      CASE WHEN p_sala_id IS NULL THEN NULL ELSE v_sala.unidade_id::text END,
      p_sala_id, v_cliente.id,
      CASE WHEN p_sala_id IS NULL THEN 'Solicitação pelo painel; unidade/sala a definir.' ELSE 'Solicitação pelo painel do cliente.' END,
      now()::text, now()::text, '0', '0', extract(epoch FROM (v_fim - v_inicio)) / 3600,
      0, 0, 'Aguardando análise administrativa.'
    );
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.request_authenticated_reservations(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(jsonb, text) TO authenticated;

NOTIFY pgrst, 'reload schema';