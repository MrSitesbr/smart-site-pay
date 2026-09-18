CREATE OR REPLACE FUNCTION public.request_authenticated_reservations(
  p_sala_id uuid,
  p_periodos jsonb
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente public.clientes_corp%ROWTYPE;
  v_sala public.salas%ROWTYPE;
  v_ambiente public.ambiente_tipo;
  v_item jsonb;
  v_data date;
  v_inicio time without time zone;
  v_fim time without time zone;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_count integer;
  v_mmdd text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para solicitar a reserva.';
  END IF;

  IF p_periodos IS NULL OR jsonb_typeof(p_periodos) <> 'array' THEN
    RAISE EXCEPTION 'Informe uma lista válida de períodos.';
  END IF;

  v_count := jsonb_array_length(p_periodos);
  IF v_count < 1 OR v_count > 20 THEN
    RAISE EXCEPTION 'Escolha entre 1 e 20 períodos.';
  END IF;

  SELECT * INTO v_cliente
  FROM public.clientes_corp
  WHERE user_id = auth.uid()
    AND status_acesso = 'aprovado'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_cliente.id IS NULL THEN
    RAISE EXCEPTION 'Seu cadastro ainda não está autorizado.';
  END IF;

  SELECT s.* INTO v_sala
  FROM public.salas s
  JOIN public.unidades u ON u.id = s.unidade_id
  WHERE s.id = p_sala_id
    AND s.status IN ('disponivel', 'ativa')
    AND u.status ILIKE 'ativ%'
    AND u.id NOT IN (
      '66a610f6-1f6b-4673-903d-80aa57657982'::uuid,
      '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid
    )
  LIMIT 1;

  IF v_sala.id IS NULL THEN
    RAISE EXCEPTION 'Sala indisponível para agendamento.';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.periodos_solicitados (
    data date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    UNIQUE (data, hora_inicio, hora_fim)
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.periodos_solicitados;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_periodos)
  LOOP
    BEGIN
      v_data := (v_item->>'data')::date;
      v_inicio := (v_item->>'hora_inicio')::time;
      v_fim := (v_item->>'hora_fim')::time;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Existe um período com data ou horário inválido.';
    END;

    IF v_data < current_date THEN
      RAISE EXCEPTION 'Escolha somente datas futuras.';
    END IF;
    IF extract(isodow FROM v_data) = 7 THEN
      RAISE EXCEPTION 'Domingos não estão disponíveis para reserva.';
    END IF;
    v_mmdd := to_char(v_data, 'MM-DD');
    IF v_mmdd IN ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') THEN
      RAISE EXCEPTION 'Feriados nacionais não estão disponíveis para reserva.';
    END IF;
    IF v_inicio < time '08:00' OR v_fim > time '18:00' OR v_inicio >= v_fim THEN
      RAISE EXCEPTION 'Escolha horários válidos entre 08:00 e 18:00.';
    END IF;
    IF extract(minute FROM v_inicio)::integer NOT IN (0, 30)
       OR extract(minute FROM v_fim)::integer NOT IN (0, 30) THEN
      RAISE EXCEPTION 'Os horários devem usar intervalos de 30 minutos.';
    END IF;

    BEGIN
      INSERT INTO pg_temp.periodos_solicitados(data, hora_inicio, hora_fim)
      VALUES (v_data, v_inicio, v_fim);
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Há períodos repetidos na solicitação.';
    END;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.periodos_solicitados a
    JOIN pg_temp.periodos_solicitados b
      ON a.ctid <> b.ctid
     AND a.data = b.data
     AND a.hora_inicio < b.hora_fim
     AND a.hora_fim > b.hora_inicio
  ) THEN
    RAISE EXCEPTION 'Há períodos sobrepostos na solicitação.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.periodos_solicitados p
    JOIN public.reservations r
      ON r.sala_id = p_sala_id
     AND r.data = p.data
     AND r.status <> 'cancelada'::public.reserva_status
     AND p.hora_inicio < r.hora_fim
     AND p.hora_fim > r.hora_inicio
  ) THEN
    RAISE EXCEPTION 'Um dos horários acabou de ficar indisponível. Revise a seleção.';
  END IF;

  v_ambiente := CASE
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'privativ' THEN 'sala_privativa'::public.ambiente_tipo
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'reuni|consult|audit' THEN 'sala_reuniao'::public.ambiente_tipo
    ELSE 'estacao'::public.ambiente_tipo
  END;

  FOR v_data, v_inicio, v_fim IN
    SELECT data, hora_inicio, hora_fim
    FROM pg_temp.periodos_solicitados
    ORDER BY data, hora_inicio
  LOOP
    INSERT INTO public.reservations (
      nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
      status, origem, unidade_id, sala_id, observacoes
    ) VALUES (
      coalesce(v_cliente.responsavel_nome, v_cliente.razao_social),
      v_cliente.responsavel_email,
      coalesce(v_cliente.responsavel_telefone, ''),
      v_ambiente, 'hora'::public.reserva_tipo, v_data, v_inicio, v_fim,
      'pendente'::public.reserva_status, 'Consulta pelo site', v_sala.unidade_id, v_sala.id,
      'Solicitação múltipla feita pelo cliente na agenda pública.'
    ) RETURNING id INTO v_id;
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_authenticated_reservations(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb) TO authenticated;