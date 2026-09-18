CREATE OR REPLACE FUNCTION public.get_public_room_availability(p_start_date date, p_end_date date, p_sala_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(sala_id uuid, data date, hora_inicio time without time zone, hora_fim time without time zone, color_slot integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  IF p_end_date - p_start_date > 62 THEN
    RAISE EXCEPTION 'Consulte no máximo 63 dias por vez.';
  END IF;

  RETURN QUERY
  SELECT
    r.sala_id,
    r.data,
    r.hora_inicio,
    r.hora_fim,
    mod(abs(hashtext(lower(coalesce(nullif(r.email, ''), r.id::text)))), 6)::integer AS color_slot
  FROM public.reservations r
  JOIN public.salas s ON s.id = r.sala_id
  JOIN public.unidades u ON u.id = s.unidade_id
  WHERE r.sala_id IS NOT NULL
    AND r.data BETWEEN p_start_date AND p_end_date
    AND r.status <> 'cancelada'::public.reserva_status
    AND (p_sala_id IS NULL OR r.sala_id = p_sala_id)
    AND s.status IN ('disponivel', 'ativa')
    AND u.status ILIKE 'ativ%'
    AND u.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
  ORDER BY r.data, r.hora_inicio;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_authenticated_reservation(p_sala_id uuid, p_data date, p_hora_inicio time without time zone, p_hora_fim time without time zone)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente public.clientes_corp%ROWTYPE;
  v_sala public.salas%ROWTYPE;
  v_id uuid;
  v_ambiente public.ambiente_tipo;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para solicitar a reserva.'; END IF;
  IF p_data < current_date THEN RAISE EXCEPTION 'Escolha uma data futura.'; END IF;
  IF p_hora_inicio >= p_hora_fim THEN RAISE EXCEPTION 'O horário final deve ser posterior ao inicial.'; END IF;

  SELECT * INTO v_cliente FROM public.clientes_corp
  WHERE user_id = auth.uid() AND status_acesso = 'aprovado' AND deleted_at IS NULL
  LIMIT 1;
  IF v_cliente.id IS NULL THEN RAISE EXCEPTION 'Seu cadastro ainda não está autorizado.'; END IF;

  SELECT s.* INTO v_sala
  FROM public.salas s
  JOIN public.unidades u ON u.id = s.unidade_id
  WHERE s.id = p_sala_id
    AND s.status IN ('disponivel', 'ativa')
    AND u.status ILIKE 'ativ%'
    AND u.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
  LIMIT 1;
  IF v_sala.id IS NULL THEN RAISE EXCEPTION 'Sala indisponível para agendamento.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.sala_id = p_sala_id
      AND r.data = p_data
      AND r.status <> 'cancelada'::public.reserva_status
      AND p_hora_inicio < r.hora_fim
      AND p_hora_fim > r.hora_inicio
  ) THEN RAISE EXCEPTION 'Este horário acabou de ficar indisponível.'; END IF;

  v_ambiente := CASE
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'privativ' THEN 'sala_privativa'::public.ambiente_tipo
    WHEN lower(coalesce(v_sala.tipo, '')) ~ 'reuni|consult|audit' THEN 'sala_reuniao'::public.ambiente_tipo
    ELSE 'estacao'::public.ambiente_tipo
  END;

  INSERT INTO public.reservations (
    nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
    status, origem, unidade_id, sala_id, observacoes
  ) VALUES (
    coalesce(v_cliente.responsavel_nome, v_cliente.razao_social),
    v_cliente.responsavel_email,
    coalesce(v_cliente.responsavel_telefone, ''),
    v_ambiente, 'hora'::public.reserva_tipo, p_data, p_hora_inicio, p_hora_fim,
    'pendente'::public.reserva_status, 'Consulta pelo site', v_sala.unidade_id, v_sala.id,
    'Solicitação feita pelo cliente na agenda pública.'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_authenticated_reservation(uuid, date, time without time zone, time without time zone) TO authenticated;