-- Opção do admin: bloquear reservas e solicitações de clientes sem saldo (plano ou créditos).
-- A mensagem de bloqueio mostra quanto o cliente já usou e quanto falta.

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('bloquear_sem_saldo', '{"enabled": false}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- Lido pelo painel do cliente para avisar antes de enviar (a regra vale de verdade no servidor).
CREATE OR REPLACE FUNCTION public.reservas_bloqueio_sem_saldo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key = 'bloquear_sem_saldo'), false);
$$;
REVOKE ALL ON FUNCTION public.reservas_bloqueio_sem_saldo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reservas_bloqueio_sem_saldo() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fmt_horas(p numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(trim(to_char(coalesce(p, 0), 'FM999990.##')), '.', ',') || 'h';
$$;

-- Texto do saldo a partir do resultado de plano_cobertura.
CREATE OR REPLACE FUNCTION public.saldo_cliente_texto(p_cov jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_status text := coalesce(p_cov->>'status', 'sem_plano');
  v_cred numeric := coalesce((p_cov->>'creditos_disponiveis')::numeric, 0);
  v_txt text;
BEGIN
  IF v_status IN ('sem_plano', 'nao_iniciado') OR p_cov->>'plano_nome' IS NULL THEN
    v_txt := 'Você não tem plano ativo';
  ELSIF v_status = 'vencido' THEN
    v_txt := 'Seu plano ' || (p_cov->>'plano_nome') || ' está vencido';
  ELSE
    v_txt := 'Plano ' || (p_cov->>'plano_nome') || ': usou ' || public.fmt_horas((p_cov->>'usado')::numeric)
      || ' de ' || public.fmt_horas((p_cov->>'cota')::numeric) || ', restam ' || public.fmt_horas(greatest((p_cov->>'saldo')::numeric, 0));
  END IF;
  v_txt := v_txt || '; créditos extras: ' || public.fmt_horas(v_cred) || '.';
  RETURN v_txt || ' Fale com a equipe para contratar um plano ou comprar créditos.';
END;
$$;

CREATE OR REPLACE FUNCTION public.request_authenticated_reservations(p_periodos jsonb, p_sala_id text DEFAULT NULL::text, p_modalidade text DEFAULT NULL::text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_h_abre time;
  v_h_fecha time;
  v_h_fechado boolean;
  v_capacidade integer;
  v_ids text[] := ARRAY[]::text[];
  v_id text;
  v_count integer;
  v_cov jsonb;
  v_horas numeric;
  v_cob numeric;
  v_exc numeric;
  v_tipo text;
  v_valor numeric;
  v_just text;
  v_bloquear boolean := public.reservas_bloqueio_sem_saldo();
BEGIN
  IF p_modalidade IS NOT NULL AND p_modalidade NOT IN ('adicional', 'avulso') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida.';
  END IF;

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
    IF to_char(v_data, 'MM-DD') IN ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') THEN
      RAISE EXCEPTION 'Feriados nacionais não estão disponíveis para reserva.';
    END IF;
    IF v_inicio >= v_fim THEN RAISE EXCEPTION 'O horário final deve ser posterior ao inicial.'; END IF;
    IF extract(minute FROM v_inicio)::integer NOT IN (0, 30)
       OR extract(minute FROM v_fim)::integer NOT IN (0, 30) THEN
      RAISE EXCEPTION 'Os horários devem usar intervalos de 30 minutos.';
    END IF;

    IF p_sala_id IS NOT NULL THEN
      SELECT h.abre, h.fecha, h.fechado INTO v_h_abre, v_h_fecha, v_h_fechado
        FROM public.unidade_horario_dia(v_sala.unidade_id, v_data) h;
      IF coalesce(v_h_fechado, false) THEN
        RAISE EXCEPTION 'A unidade não funciona em %.', to_char(v_data, 'DD/MM/YYYY');
      END IF;
      IF v_inicio < coalesce(v_h_abre, v_abertura) OR v_fim > coalesce(v_h_fecha, v_fechamento) THEN
        RAISE EXCEPTION 'Escolha horários dentro do expediente da unidade (% às %).', to_char(coalesce(v_h_abre, v_abertura), 'HH24:MI'), to_char(coalesce(v_h_fecha, v_fechamento), 'HH24:MI');
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
        AND EXISTS (SELECT 1 FROM public.unidade_horario_dia(unit.id, v_data) h WHERE NOT h.fechado AND v_inicio >= h.abre AND v_fim <= h.fecha)
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
    v_horas := extract(epoch FROM (v_fim - v_inicio)) / 3600;
    -- Reservas anteriores deste mesmo pedido já foram gravadas e entram no consumo.
    v_cov := public.plano_cobertura(v_cliente.id, v_data, v_horas, p_sala_id, v_inicio, NULL, '{}'::jsonb);
    v_cob := (v_cov->>'cobertas')::numeric;
    v_exc := (v_cov->>'excedentes')::numeric;
    -- Opção do admin: sem saldo de plano ou créditos, a reserva não é aceita.
    IF v_bloquear AND v_exc > 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente para %: faltam %. %',
        to_char(v_data, 'DD/MM/YYYY'), public.fmt_horas(v_exc), public.saldo_cliente_texto(v_cov) USING ERRCODE = 'P0001';
    END IF;
    IF v_exc <= 0 THEN
      v_tipo := CASE WHEN (v_cov->>'estacao')::boolean THEN 'estacao' ELSE 'plano' END;
      v_valor := 0;
      v_just := CASE WHEN v_tipo = 'estacao' THEN 'Estação compartilhada incluída no plano ' || (v_cov->>'plano_nome') || '.'
                     ELSE trim(to_char(v_cob, 'FM999990.##')) || 'h cobertas pelo plano ' || (v_cov->>'plano_nome') || '.' END;
    ELSE
      IF (v_cov->>'permite_adicional')::boolean THEN
        IF p_modalidade IS NULL THEN
          RAISE EXCEPTION 'O saldo do plano não cobre todo o horário de %. Escolha entre hora adicional e avulso. Se esta opção não aparecer, atualize a página (F5).',
            to_char(v_data, 'DD/MM/YYYY') USING ERRCODE = 'P0001';
        END IF;
        v_tipo := p_modalidade;
      ELSE
        IF p_modalidade = 'adicional' THEN
          RAISE EXCEPTION 'Hora adicional só está disponível para os planos Harmonia.';
        END IF;
        v_tipo := 'avulso';
      END IF;
      v_valor := round(v_exc * CASE WHEN v_tipo = 'adicional' THEN (v_cov->>'preco_adicional')::numeric ELSE (v_cov->>'preco_avulso')::numeric END, 2);
      v_just := CASE WHEN v_cob > 0 THEN trim(to_char(v_cob, 'FM999990.##')) || 'h cobertas pelo plano ' || (v_cov->>'plano_nome') || '; ' ELSE '' END
        || trim(to_char(v_exc, 'FM999990.##')) || 'h ' || CASE WHEN v_tipo = 'adicional' THEN 'adicionais' ELSE 'avulsas' END
        || ' (R$ ' || replace(trim(to_char(v_valor, 'FM999990.00')), '.', ',') || ').';
    END IF;
    INSERT INTO public.reservations (
      id, nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
      status, origem, unidade_id, sala_id, cliente_corp_id, observacoes,
      created_at, updated_at, valor, valor_original, horas_reservadas,
      horas_cobertas_plano, horas_excedentes, calculo_justificativa, plano_id, tipo_cobranca
    ) VALUES (
      v_id,
      coalesce(nullif(v_cliente.responsavel_nome, ''), v_cliente.razao_social, 'Cliente'),
      coalesce(v_cliente.responsavel_email, ''),
      coalesce(v_cliente.responsavel_telefone, ''),
      v_ambiente, 'hora', v_data::text, v_inicio::text, v_fim::text,
      'pendente', 'Painel do cliente',
      CASE WHEN p_sala_id IS NULL THEN NULL ELSE v_sala.unidade_id END,
      p_sala_id, v_cliente.id,
      CASE WHEN p_sala_id IS NULL THEN 'Solicitação pelo painel; unidade/sala a definir.' ELSE 'Solicitação pelo painel do cliente.' END,
      now()::text, now()::text, v_valor::text, v_valor::text, v_horas,
      v_cob, v_exc, v_just,
      CASE WHEN v_cob > 0 OR v_tipo = 'adicional' THEN v_cov->>'plano_id' END, v_tipo
    );
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END;
$function$;

-- Alteração de horário também respeita a opção (cancelamento continua sempre liberado).
CREATE OR REPLACE FUNCTION public.validar_saldo_alteracao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  v_data date;
  v_ini time;
  v_fim time;
  v_cov jsonb;
BEGIN
  IF NEW.tipo <> 'alteracao' OR NOT public.reservas_bloqueio_sem_saldo() THEN RETURN NEW; END IF;
  IF NEW.nova_data IS NULL AND NEW.novo_inicio IS NULL AND NEW.novo_fim IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.reservations WHERE id = NEW.reservation_id;
  IF r.id IS NULL OR r.cliente_corp_id IS NULL THEN RETURN NEW; END IF;
  v_data := coalesce(NEW.nova_data, r.data)::date;
  v_ini := coalesce(NEW.novo_inicio, left(r.hora_inicio, 5))::time;
  v_fim := coalesce(NEW.novo_fim, left(r.hora_fim, 5))::time;
  IF v_fim <= v_ini THEN RETURN NEW; END IF;
  v_cov := public.plano_cobertura(r.cliente_corp_id, v_data, extract(epoch FROM (v_fim - v_ini)) / 3600, r.sala_id, v_ini, r.id, '{}'::jsonb);
  IF coalesce((v_cov->>'excedentes')::numeric, 0) > 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente para o novo horário: faltam %. %',
      public.fmt_horas((v_cov->>'excedentes')::numeric), public.saldo_cliente_texto(v_cov) USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_saldo_alteracao ON public.reservation_change_requests;
CREATE TRIGGER trg_validar_saldo_alteracao
  BEFORE INSERT ON public.reservation_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_alteracao();

NOTIFY pgrst, 'reload schema';
