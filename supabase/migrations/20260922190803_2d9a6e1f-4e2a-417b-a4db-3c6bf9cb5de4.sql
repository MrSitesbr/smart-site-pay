ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS preco_hora_avulsa numeric,
  ADD COLUMN IF NOT EXISTS preco_diaria numeric;

UPDATE public.salas
SET preco_hora_avulsa = preco_periodo_locacao_avulsa
WHERE preco_hora_avulsa IS NULL
  AND preco_periodo_locacao_avulsa IS NOT NULL;

ALTER TABLE public.salas DROP CONSTRAINT IF EXISTS salas_precos_nao_negativos_check;
ALTER TABLE public.salas ADD CONSTRAINT salas_precos_nao_negativos_check CHECK (
  (preco_hora_avulsa IS NULL OR preco_hora_avulsa >= 0)
  AND (preco_diaria IS NULL OR preco_diaria >= 0)
  AND (preco_locacao_mensal IS NULL OR preco_locacao_mensal >= 0)
);

ALTER TABLE public.contract_requests
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS contract_requests_active_status_idx
  ON public.contract_requests(status, created_at DESC)
  WHERE archived_at IS NULL;

DROP FUNCTION IF EXISTS public.save_admin_room(uuid, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, uuid[]);

CREATE OR REPLACE FUNCTION public.save_admin_room(
  p_id uuid,
  p_unidade_id uuid,
  p_nome text,
  p_tipo text,
  p_categorias text[],
  p_modalidades text[],
  p_capacidade integer,
  p_descricao text,
  p_foto_url text,
  p_galeria text[],
  p_status text,
  p_metadata jsonb,
  p_preco_mensal numeric,
  p_preco_hora numeric,
  p_preco_diaria numeric,
  p_planos uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_categoria text;
  v_tipo_locacao text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem salvar salas.' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(coalesce(p_nome, ''))) < 2 OR length(btrim(p_nome)) > 120 THEN
    RAISE EXCEPTION 'Informe um nome de sala entre 2 e 120 caracteres.';
  END IF;
  IF p_unidade_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.unidades WHERE id = p_unidade_id) THEN
    RAISE EXCEPTION 'Selecione uma unidade válida.';
  END IF;
  IF coalesce(cardinality(p_categorias), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos uma categoria.'; END IF;
  IF coalesce(cardinality(p_modalidades), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos uma modalidade.'; END IF;
  IF NOT (p_categorias <@ ARRAY['privativa','compartilhado','consultorio_poltrona','consultorio_maca']::text[]) THEN RAISE EXCEPTION 'Existe uma categoria inválida.'; END IF;
  IF NOT (p_modalidades <@ ARRAY['avulso','mensal']::text[]) THEN RAISE EXCEPTION 'Existe uma modalidade inválida.'; END IF;
  IF p_capacidade IS NOT NULL AND p_capacidade < 1 THEN RAISE EXCEPTION 'A capacidade deve ser maior que zero.'; END IF;
  IF length(coalesce(p_descricao, '')) > 2000 THEN RAISE EXCEPTION 'A descrição deve ter no máximo 2000 caracteres.'; END IF;
  IF p_preco_mensal < 0 OR p_preco_hora < 0 OR p_preco_diaria < 0 THEN RAISE EXCEPTION 'Os preços não podem ser negativos.'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_planos, '{}'::uuid[])) plano_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.planos p WHERE p.id = plano_id AND p.deleted_at IS NULL
    )
  ) THEN RAISE EXCEPTION 'Existe um plano inválido ou inativo na seleção.'; END IF;

  v_categoria := p_categorias[1];
  v_tipo_locacao := CASE
    WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_periodo'
    ELSE 'locacao_mensal'
  END;

  IF p_id IS NULL THEN
    INSERT INTO public.salas (
      unidade_id, nome, tipo, categoria, categorias, tipo_locacao, subtipo_periodo,
      modalidades_locacao, capacidade, descricao, foto_url, galeria, status, metadata,
      preco_locacao_mensal, preco_periodo_pacote_mensal, preco_periodo_locacao_avulsa,
      preco_hora_avulsa, preco_diaria
    ) VALUES (
      p_unidade_id, btrim(p_nome), p_tipo, v_categoria, p_categorias, v_tipo_locacao,
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_avulsa' ELSE NULL END,
      p_modalidades, p_capacidade, nullif(btrim(coalesce(p_descricao, '')), ''),
      nullif(p_foto_url, ''), coalesce(p_galeria, '{}'::text[]), p_status,
      coalesce(p_metadata, '{}'::jsonb),
      CASE WHEN 'mensal' = ANY(p_modalidades) THEN p_preco_mensal ELSE NULL END,
      NULL,
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_hora ELSE NULL END,
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_hora ELSE NULL END,
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_diaria ELSE NULL END
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.salas SET
      unidade_id = p_unidade_id,
      nome = btrim(p_nome),
      tipo = p_tipo,
      categoria = v_categoria,
      categorias = p_categorias,
      tipo_locacao = v_tipo_locacao,
      subtipo_periodo = CASE WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_avulsa' ELSE NULL END,
      modalidades_locacao = p_modalidades,
      capacidade = p_capacidade,
      descricao = nullif(btrim(coalesce(p_descricao, '')), ''),
      foto_url = nullif(p_foto_url, ''),
      galeria = coalesce(p_galeria, '{}'::text[]),
      status = p_status,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      preco_locacao_mensal = CASE WHEN 'mensal' = ANY(p_modalidades) THEN p_preco_mensal ELSE NULL END,
      preco_periodo_pacote_mensal = NULL,
      preco_periodo_locacao_avulsa = CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_hora ELSE NULL END,
      preco_hora_avulsa = CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_hora ELSE NULL END,
      preco_diaria = CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_diaria ELSE NULL END
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Sala não encontrada.'; END IF;
  END IF;

  DELETE FROM public.sala_planos WHERE sala_id = v_id;
  INSERT INTO public.sala_planos(sala_id, plano_id)
  SELECT v_id, plano_id
  FROM unnest(coalesce(p_planos, '{}'::uuid[])) AS plano_id
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_admin_room(uuid, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_room(uuid, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_authenticated_reservations(
  p_sala_id uuid,
  p_periodos jsonb,
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_tipo_negocio text
) RETURNS uuid[]
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
  v_abertura time without time zone;
  v_fechamento time without time zone;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_count integer;
  v_mmdd text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para solicitar a reserva.'; END IF;
  IF length(trim(coalesce(p_nome, ''))) < 2 OR length(trim(p_nome)) > 100 THEN RAISE EXCEPTION 'Informe um nome válido de até 100 caracteres.'; END IF;
  IF length(trim(coalesce(p_email, ''))) > 255 OR trim(coalesce(p_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'Informe um e-mail válido.'; END IF;
  IF length(trim(coalesce(p_whatsapp, ''))) > 30 OR length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'Informe um WhatsApp válido.'; END IF;
  IF length(trim(coalesce(p_tipo_negocio, ''))) < 2 OR length(trim(p_tipo_negocio)) > 120 THEN RAISE EXCEPTION 'Informe um tipo de negócio válido de até 120 caracteres.'; END IF;
  IF p_periodos IS NULL OR jsonb_typeof(p_periodos) <> 'array' THEN RAISE EXCEPTION 'Informe uma lista válida de períodos.'; END IF;

  v_count := jsonb_array_length(p_periodos);
  IF v_count < 1 OR v_count > 20 THEN RAISE EXCEPTION 'Escolha entre 1 e 20 períodos.'; END IF;

  SELECT * INTO v_cliente FROM public.clientes_corp
  WHERE user_id = auth.uid() AND status_acesso = 'aprovado' AND deleted_at IS NULL LIMIT 1;
  IF v_cliente.id IS NULL THEN RAISE EXCEPTION 'Seu cadastro ainda não está autorizado.'; END IF;

  IF p_sala_id IS NOT NULL THEN
    SELECT s.* INTO v_sala
    FROM public.salas s
    JOIN public.unidades u ON u.id = s.unidade_id
    WHERE s.id = p_sala_id
      AND s.status IN ('disponivel', 'ativa')
      AND u.status ILIKE 'ativ%'
      AND u.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
    LIMIT 1;
    IF v_sala.id IS NULL THEN RAISE EXCEPTION 'Sala indisponível para agendamento.'; END IF;
    SELECT u.horario_abertura, u.horario_fechamento INTO v_abertura, v_fechamento FROM public.unidades u WHERE u.id = v_sala.unidade_id;
    v_abertura := coalesce(v_abertura, time '08:00');
    v_fechamento := coalesce(v_fechamento, time '20:00');
  ELSE
    v_abertura := time '08:00';
    v_fechamento := time '20:00';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.periodos_solicitados (
    data date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    UNIQUE (data, hora_inicio, hora_fim)
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.periodos_solicitados;

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
    v_mmdd := to_char(v_data, 'MM-DD');
    IF v_mmdd IN ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') THEN RAISE EXCEPTION 'Feriados nacionais não estão disponíveis para reserva.'; END IF;
    IF v_inicio < v_abertura OR v_fim > v_fechamento OR v_inicio >= v_fim THEN RAISE EXCEPTION 'Escolha horários dentro do expediente disponível.'; END IF;
    IF extract(minute FROM v_inicio)::integer NOT IN (0, 30) OR extract(minute FROM v_fim)::integer NOT IN (0, 30) THEN RAISE EXCEPTION 'Os horários devem usar intervalos de 30 minutos.'; END IF;

    BEGIN
      INSERT INTO pg_temp.periodos_solicitados VALUES (v_data, v_inicio, v_fim);
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Há períodos repetidos na solicitação.';
    END;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_temp.periodos_solicitados a
    JOIN pg_temp.periodos_solicitados b
      ON a.ctid <> b.ctid AND a.data = b.data
     AND a.hora_inicio < b.hora_fim AND a.hora_fim > b.hora_inicio
  ) THEN RAISE EXCEPTION 'Há períodos sobrepostos na solicitação.'; END IF;

  IF p_sala_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_temp.periodos_solicitados p
      JOIN public.reservations r
        ON r.sala_id = p_sala_id AND r.data = p.data
       AND r.status <> 'cancelada'::public.reserva_status
       AND p.hora_inicio < r.hora_fim AND p.hora_fim > r.hora_inicio
    ) THEN RAISE EXCEPTION 'Um dos horários acabou de ficar indisponível. Revise a seleção.'; END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM pg_temp.periodos_solicitados p
      WHERE NOT EXISTS (
        SELECT 1 FROM public.salas s
        JOIN public.unidades u ON u.id = s.unidade_id
        WHERE s.status IN ('disponivel', 'ativa')
          AND u.status ILIKE 'ativ%'
          AND u.id NOT IN ('66a610f6-1f6b-4673-903d-80aa57657982'::uuid, '40840fbd-f575-4ff7-9e6d-1e9231985ce6'::uuid)
          AND p.hora_inicio >= coalesce(u.horario_abertura, time '08:00')
          AND p.hora_fim <= coalesce(u.horario_fechamento, time '20:00')
          AND NOT EXISTS (
            SELECT 1 FROM public.reservations r
            WHERE r.sala_id = s.id AND r.data = p.data
              AND r.status <> 'cancelada'::public.reserva_status
              AND p.hora_inicio < r.hora_fim AND p.hora_fim > r.hora_inicio
          )
      )
    ) THEN RAISE EXCEPTION 'Não há uma sala livre em um dos períodos escolhidos.'; END IF;
  END IF;

  v_ambiente := CASE
    WHEN p_sala_id IS NULL THEN 'sala_reuniao'::public.ambiente_tipo
    WHEN 'compartilhado' = ANY(coalesce(v_sala.categorias, '{}'::text[])) THEN 'estacao'::public.ambiente_tipo
    WHEN EXISTS (SELECT 1 FROM unnest(coalesce(v_sala.categorias, '{}'::text[])) c WHERE c LIKE 'consultorio%') THEN 'sala_reuniao'::public.ambiente_tipo
    ELSE 'sala_privativa'::public.ambiente_tipo
  END;

  FOR v_data, v_inicio, v_fim IN
    SELECT data, hora_inicio, hora_fim FROM pg_temp.periodos_solicitados ORDER BY data, hora_inicio
  LOOP
    INSERT INTO public.reservations (
      nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
      status, origem, unidade_id, sala_id, observacoes
    ) VALUES (
      trim(p_nome), lower(trim(p_email)), trim(p_whatsapp), v_ambiente,
      'hora'::public.reserva_tipo, v_data, v_inicio, v_fim,
      'pendente'::public.reserva_status, 'Consulta pelo site',
      CASE WHEN p_sala_id IS NULL THEN NULL ELSE v_sala.unidade_id END,
      CASE WHEN p_sala_id IS NULL THEN NULL ELSE v_sala.id END,
      CASE WHEN p_sala_id IS NULL
        THEN 'Qualquer sala disponível — unidade e sala serão definidas pelo administrador. Tipo de negócio: ' || trim(p_tipo_negocio)
        ELSE 'Solicitação múltipla pelo cliente. Tipo de negócio: ' || trim(p_tipo_negocio)
      END
    ) RETURNING id INTO v_id;
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_authenticated_reservations(uuid, jsonb, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb, text, text, text, text) TO authenticated;