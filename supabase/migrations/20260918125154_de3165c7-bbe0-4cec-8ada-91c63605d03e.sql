ALTER TABLE public.contract_requests ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_public_consultation(
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_tipo_negocio text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF length(trim(coalesce(p_nome, ''))) < 2 THEN RAISE EXCEPTION 'Informe seu nome.'; END IF;
  IF trim(coalesce(p_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'Informe um e-mail válido.'; END IF;
  IF length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'Informe um WhatsApp válido.'; END IF;
  IF length(trim(coalesce(p_tipo_negocio, ''))) < 2 THEN RAISE EXCEPTION 'Informe o tipo de negócio.'; END IF;

  INSERT INTO public.contract_requests (
    user_id, nome, email, telefone, ambiente, plano_tipo, preco,
    dias_selecionados, observacoes, status, nicho, origem
  ) VALUES (
    NULL, trim(p_nome), lower(trim(p_email)), trim(p_whatsapp),
    'estacao'::public.ambiente_tipo, 'consulta', 0,
    '[]'::jsonb, 'Consulta de disponibilidade pelo site.', 'pendente',
    trim(p_tipo_negocio), 'Consulta pelo site'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_consultation(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_room_availability(
  p_start_date date,
  p_end_date date,
  p_sala_id uuid DEFAULT NULL
)
RETURNS TABLE (
  sala_id uuid,
  data date,
  hora_inicio time,
  hora_fim time
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.sala_id, r.data, r.hora_inicio, r.hora_fim
  FROM public.reservations r
  JOIN public.salas s ON s.id = r.sala_id
  WHERE r.sala_id IS NOT NULL
    AND r.data BETWEEN p_start_date AND p_end_date
    AND r.status <> 'cancelada'::public.reserva_status
    AND (p_sala_id IS NULL OR r.sala_id = p_sala_id)
    AND s.status IN ('disponivel', 'ativa')
  ORDER BY r.data, r.hora_inicio;
$$;

REVOKE ALL ON FUNCTION public.get_public_room_availability(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_authenticated_reservation(
  p_sala_id uuid,
  p_data date,
  p_hora_inicio time,
  p_hora_fim time
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT * INTO v_sala FROM public.salas
  WHERE id = p_sala_id AND status IN ('disponivel', 'ativa')
  LIMIT 1;
  IF v_sala.id IS NULL THEN RAISE EXCEPTION 'Sala indisponível.'; END IF;

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
$$;

REVOKE ALL ON FUNCTION public.request_authenticated_reservation(uuid, date, time, time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservation(uuid, date, time, time) TO authenticated;