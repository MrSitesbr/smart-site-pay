-- 1) Pacote de horas renovado creditava menos horas (ex.: Tranquilidade 6h mostrando 1h).
--    O saldo do pacote somava toda reserva com data dentro do período do contrato novo, inclusive
--    as que já tinham sido descontadas do pacote anterior. Agora cada reserva guarda o contrato
--    que estava ativo quando ela foi feita/recalculada, e o pacote só desconta as suas.
-- 2) Cliente altera e cancela a própria reserva direto pelo painel, sem pedido para a equipe.
--    Valem as mesmas regras: 2h de antecedência, expediente da unidade, sala livre e saldo.

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS contrato_id text;
CREATE INDEX IF NOT EXISTS reservations_contrato_idx ON public.reservations(contrato_id);

-- Reservas existentes: contrato do cliente vigente quando a reserva foi criada.
-- Reservas anteriores a qualquer contrato ficam sem contrato e seguem a regra antiga (por data).
WITH alvo AS (
  SELECT r.id, (
    SELECT cp.id FROM public.cliente_planos AS cp
     WHERE cp.cliente_corp_id = r.cliente_corp_id
       AND cp.created_at <= CASE WHEN r.created_at::text ~ '^\d{4}-\d{2}-\d{2}' THEN r.created_at::text::timestamptz END
     ORDER BY cp.created_at DESC
     LIMIT 1) AS contrato
  FROM public.reservations AS r
  WHERE r.contrato_id IS NULL AND r.cliente_corp_id IS NOT NULL
)
UPDATE public.reservations AS r
   SET contrato_id = alvo.contrato
  FROM alvo
 WHERE r.id = alvo.id AND alvo.contrato IS NOT NULL;

-- Novas reservas e recálculos (data, horário ou cobrança) ficam com o contrato aberto no momento.
CREATE OR REPLACE FUNCTION public.definir_contrato_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.cliente_corp_id IS DISTINCT FROM OLD.cliente_corp_id
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim
     OR NEW.horas_reservadas IS DISTINCT FROM OLD.horas_reservadas
     OR NEW.horas_cobertas_plano IS DISTINCT FROM OLD.horas_cobertas_plano
     OR NEW.tipo_cobranca IS DISTINCT FROM OLD.tipo_cobranca THEN
    NEW.contrato_id := CASE WHEN NEW.cliente_corp_id IS NULL THEN NULL ELSE (
      SELECT cp.id FROM public.cliente_planos AS cp
       WHERE cp.cliente_corp_id = NEW.cliente_corp_id AND cp.status <> 'encerrado'
       ORDER BY cp.created_at DESC
       LIMIT 1) END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_definir_contrato ON public.reservations;
CREATE TRIGGER reservations_definir_contrato
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.definir_contrato_reserva();

CREATE OR REPLACE FUNCTION public.plano_cobertura(p_cliente_corp_id text, p_data date, p_horas numeric DEFAULT 0, p_sala_id text DEFAULT NULL::text, p_hora_inicio time without time zone DEFAULT NULL::time without time zone, p_ignorar_reserva text DEFAULT NULL::text, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.cliente_planos%ROWTYPE;
  p public.planos%ROWTYPE;
  v_cli public.clientes_corp%ROWTYPE;
  v_sala public.salas%ROWTYPE;
  v_status text;
  v_regra text;
  v_ini date;
  v_fim date;
  v_cota numeric := 0;
  v_usado numeric := 0;
  v_saldo numeric := 0;
  v_cobertas numeric := 0;
  v_horas numeric := greatest(coalesce(p_horas, 0), 0);
  v_bloco_usado boolean := false;
  v_estacao boolean := false;
  v_sala_fora boolean := false;
  v_motivo text;
  v_preco_avulso numeric;
  v_extra numeric := 0;
  v_creditos numeric := 0;
  v_cob_credito numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_own_client(p_cliente_corp_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cli FROM public.clientes_corp WHERE id = p_cliente_corp_id;
  IF p_sala_id IS NOT NULL THEN SELECT * INTO v_sala FROM public.salas WHERE id = p_sala_id; END IF;
  v_preco_avulso := coalesce(nullif(v_sala.preco_hora_avulsa, 0),
    (SELECT preco FROM public.planos WHERE slug = 'avulso' AND deleted_at IS NULL LIMIT 1), 60);

  IF p_cliente_corp_id IS NOT NULL THEN
    SELECT * INTO c FROM public.cliente_planos
    WHERE cliente_corp_id = p_cliente_corp_id AND status <> 'encerrado'
    ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF c.id IS NOT NULL THEN SELECT * INTO p FROM public.planos WHERE id = c.plano_id; END IF;

  IF c.id IS NULL OR p.id IS NULL THEN
    v_status := 'sem_plano'; v_regra := 'avulso';
  ELSIF c.status = 'a_revisar' THEN
    v_status := 'a_revisar'; v_regra := 'legado';
  ELSE
    v_status := 'ativo'; v_regra := coalesce(p.regra_uso, 'avulso');
    IF c.data_inicio IS NOT NULL AND p_data < c.data_inicio THEN v_status := 'nao_iniciado'; END IF;
    IF c.data_fim IS NOT NULL AND p_data > c.data_fim THEN v_status := 'vencido'; END IF;
  END IF;

  -- Janela de apuração e cota.
  IF v_regra = 'legado' THEN
    v_ini := date_trunc('month', p_data)::date;
    v_fim := (date_trunc('month', p_data) + interval '1 month - 1 day')::date;
    v_cota := CASE WHEN p.regra_uso IN ('avulso', 'sem_horas') THEN 0
                   ELSE coalesce(c.horas_combinadas, p.horas_incluidas, p.quantidade_horas, 0) END;
  ELSIF v_regra = 'semanal' THEN
    v_ini := p_data - (extract(isodow FROM p_data)::integer - 1);
    v_fim := v_ini + 5;
    v_cota := coalesce(c.horas_combinadas, p.horas_semana, 0);
  ELSIF v_regra = 'pacote' THEN
    v_ini := c.data_inicio;
    v_fim := c.data_fim;
    v_cota := coalesce(c.horas_combinadas, p.quantidade_horas, 0);
  ELSIF v_regra = 'mensal_reuniao' THEN
    v_ini := date_trunc('month', p_data)::date;
    v_fim := (date_trunc('month', p_data) + interval '1 month - 1 day')::date;
    v_cota := coalesce(c.horas_combinadas, p.horas_reuniao_mes, 0);
  END IF;

  IF v_status IN ('vencido', 'nao_iniciado') THEN v_cota := 0; END IF;
  IF v_status = 'vencido' THEN v_motivo := 'Plano vencido: novas horas são cobradas como avulso.'; END IF;
  IF v_status = 'nao_iniciado' THEN v_motivo := 'O plano ainda não começou nesta data.'; END IF;

  -- Sala fora do plano (quando o plano tem salas definidas).
  IF p.id IS NOT NULL AND p_sala_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.sala_planos WHERE plano_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM public.sala_planos WHERE plano_id = p.id AND sala_id = p_sala_id)
     AND NOT (p.estacao_livre AND v_regra = 'mensal_reuniao') THEN
    v_sala_fora := true;
    v_cota := 0;
    v_motivo := coalesce(v_motivo, 'Esta sala não faz parte do plano.');
  END IF;

  -- Estação compartilhada incluída (Compartilhado), segunda a sábado das 8h às 20h.
  IF v_status = 'ativo' AND p.estacao_livre AND p_sala_id IS NOT NULL
     AND ('compartilhado' = ANY(coalesce(v_sala.categorias, '{}'::text[])) OR lower(coalesce(v_sala.tipo, '')) ~ 'comp|estac|coworking')
     AND extract(isodow FROM p_data) <= 6
     AND (p_hora_inicio IS NULL OR (p_hora_inicio >= time '08:00'
          AND p_hora_inicio + make_interval(mins => (v_horas * 60)::integer) <= time '20:00')) THEN
    v_estacao := true;
  END IF;

  IF v_ini IS NOT NULL AND v_fim IS NOT NULL AND p_cliente_corp_id IS NOT NULL THEN
    IF v_regra = 'legado' THEN
      -- Regra anterior (4h/mês etc.): conta todas as reservas não canceladas do mês, inclusive pendentes.
      SELECT coalesce(sum(CASE
               WHEN r.tipo_cobranca IS NOT NULL THEN public.reserva_horas_plano(r)
               WHEN true THEN extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600
               ELSE 0 END), 0)
        INTO v_usado
        FROM public.reservations r
       WHERE (r.cliente_corp_id = p_cliente_corp_id
              OR (v_cli.responsavel_email IS NOT NULL AND lower(r.email) = lower(v_cli.responsavel_email)))
         AND public.reserva_consome(r.status, r.cancel_consome_creditos)
         AND r.data::date BETWEEN v_ini AND v_fim
         AND r.id IS DISTINCT FROM p_ignorar_reserva;
    ELSE
      SELECT coalesce(sum(public.reserva_horas_plano(r)), 0),
             coalesce(bool_or(public.reserva_horas_plano(r) > 0), false)
        INTO v_usado, v_bloco_usado
        FROM public.reservations r
       WHERE r.cliente_corp_id = p_cliente_corp_id
         AND public.reserva_consome(r.status, r.cancel_consome_creditos)
         AND r.data::date BETWEEN v_ini AND v_fim
         AND r.id IS DISTINCT FROM p_ignorar_reserva
         -- Pacote: só conta o que foi reservado com este contrato (horas de pacotes anteriores não descontam de novo).
         AND (v_regra <> 'pacote' OR coalesce(r.contrato_id, c.id) = c.id);
    END IF;
    v_extra := coalesce((p_extra ->> v_ini::text)::numeric, 0);
    v_usado := v_usado + v_extra;
    IF v_extra > 0 THEN v_bloco_usado := true; END IF;
  END IF;

  v_saldo := greatest(0, v_cota - v_usado);
  IF p.bloco_unico AND v_regra = 'semanal' AND v_bloco_usado THEN
    v_saldo := 0;
    v_motivo := coalesce(v_motivo, 'O bloco desta semana já foi usado.');
  END IF;

  IF v_estacao THEN
    v_cobertas := v_horas;
    v_motivo := 'Estação compartilhada incluída no plano.';
  ELSE
    v_cobertas := least(v_saldo, v_horas);
  END IF;

  -- Créditos extras (comprados ou bônus) válidos na data: usados depois da cota do plano.
  IF p_cliente_corp_id IS NOT NULL THEN
    SELECT coalesce(sum(greatest(cc.horas - coalesce((
             SELECT sum(u.horas) FROM public.credito_usos u
             JOIN public.reservations rr ON rr.id = u.reservation_id
             WHERE u.credito_id = cc.id AND public.reserva_consome(rr.status, rr.cancel_consome_creditos)
               AND rr.id IS DISTINCT FROM p_ignorar_reserva), 0), 0)), 0)
      INTO v_creditos
      FROM public.cliente_creditos cc
     WHERE cc.cliente_corp_id = p_cliente_corp_id AND cc.status = 'ativo'
       AND cc.data_inicio <= p_data AND (cc.data_fim IS NULL OR cc.data_fim >= p_data);
    v_creditos := greatest(0, v_creditos - coalesce((p_extra ->> '__creditos')::numeric, 0));
  END IF;
  v_cob_credito := CASE WHEN v_estacao THEN 0 ELSE least(v_creditos, greatest(0, v_horas - v_cobertas)) END;

  RETURN jsonb_build_object(
    'status', v_status,
    'regra', v_regra,
    'contrato_id', c.id,
    'contrato_status', c.status,
    'plano_id', p.id,
    'plano_nome', p.nome,
    'plano_slug', p.slug,
    'categoria', p.categoria,
    'bloco_unico', coalesce(p.bloco_unico, false),
    'data_inicio', c.data_inicio,
    'data_fim', c.data_fim,
    'data_sugerida', coalesce(c.data_sugerida, false),
    'dias_restantes', CASE WHEN c.data_fim IS NOT NULL THEN c.data_fim - current_date END,
    'janela_inicio', v_ini,
    'janela_fim', v_fim,
    'cota', v_cota,
    'usado', round(v_usado, 2),
    'saldo', round(v_saldo, 2),
    'horas', round(v_horas, 2),
    'cobertas', round(v_cobertas, 2),
    'excedentes', round(greatest(0, v_horas - v_cobertas - v_cob_credito), 2),
    'creditos_disponiveis', round(v_creditos, 2),
    'cobertas_credito', round(v_cob_credito, 2),
    'estacao', v_estacao,
    'sala_fora_do_plano', v_sala_fora,
    'permite_adicional', v_status IN ('ativo','a_revisar') AND coalesce(p.preco_hora_adicional, 0) > 0,
    'preco_adicional', p.preco_hora_adicional,
    'preco_avulso', v_preco_avulso,
    'motivo', v_motivo
  );
END $function$
;

CREATE OR REPLACE FUNCTION public.cliente_plano_cards(p_cliente_corp_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  r record;
  v_cards jsonb := '[]'::jsonb;
  v_regra text;
  v_ini date;
  v_fim date;
  v_cota numeric;
  v_janela jsonb;
  v_per jsonb;
  v_wkey text;
  v_pkey text;
  v_h numeric;
  v_cob numeric;
  v_exc numeric;
  v_usado_janela numeric;
  v_mes date;
  v_ultimo date;
  v_total numeric;
  v_usadas numeric;
  v_extras numeric;
  v_status text;
  v_aberto boolean;
  v_semanas integer;
  v_per_ini date;
  v_per_fim date;
  v_meses text[] := ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  v_rotulo text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_own_client(p_cliente_corp_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  FOR c IN
    SELECT cp.*, p.nome AS plano_nome, p.categoria, p.regra_uso, p.cobranca, p.preco, p.horas_semana, p.horas_reuniao_mes,
           p.quantidade_horas, p.horas_incluidas, p.bloco_unico, p.preco_hora_adicional
    FROM public.cliente_planos cp JOIN public.planos p ON p.id = cp.plano_id
    WHERE cp.cliente_corp_id = p_cliente_corp_id
    ORDER BY cp.created_at
  LOOP
    v_regra := CASE WHEN c.status = 'a_revisar' THEN 'legado' ELSE coalesce(c.regra_uso, 'avulso') END;
    v_ini := coalesce(c.data_inicio, c.created_at::date);
    v_fim := least(coalesce(c.data_fim, date '2100-01-01'), coalesce(c.encerrado_em::date, date '2100-01-01'));
    v_aberto := c.status <> 'encerrado' AND NOT (c.status = 'ativo' AND c.data_fim < current_date);
    v_cota := CASE v_regra
      WHEN 'legado' THEN CASE WHEN c.regra_uso IN ('avulso','sem_horas') THEN 0 ELSE coalesce(c.horas_combinadas, c.horas_incluidas, c.quantidade_horas, 0) END
      WHEN 'semanal' THEN coalesce(c.horas_combinadas, c.horas_semana, 0)
      WHEN 'mensal_reuniao' THEN coalesce(c.horas_combinadas, c.horas_reuniao_mes, 0)
      WHEN 'pacote' THEN coalesce(c.horas_combinadas, c.quantidade_horas, 0)
      ELSE 0 END;
    v_janela := '{}'::jsonb;
    v_per := '{}'::jsonb;
    v_ultimo := v_ini;

    -- Distribui as reservas do período do contrato, em ordem, dentro do limite de cada janela.
    FOR r IN
      SELECT res.*, s.nome AS sala_nome
      FROM public.reservations res LEFT JOIN public.salas s ON s.id = res.sala_id
      WHERE res.cliente_corp_id = p_cliente_corp_id
        AND public.reserva_consome(res.status, res.cancel_consome_creditos)
        AND CASE WHEN v_regra = 'pacote' AND res.contrato_id IS NOT NULL
                 THEN res.contrato_id = c.id          -- pacote: reservas feitas com este contrato
                 ELSE res.data::date BETWEEN v_ini AND v_fim END
        AND coalesce(res.tipo_cobranca, '') <> 'estacao'
      ORDER BY res.data, res.hora_inicio
    LOOP
      v_h := round(extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600, 2);
      IF v_h <= 0 THEN CONTINUE; END IF;
      v_wkey := CASE v_regra
        WHEN 'semanal' THEN (r.data::date - (extract(isodow FROM r.data::date)::int - 1))::text
        WHEN 'pacote' THEN 'pacote'
        ELSE to_char(r.data::date, 'YYYY-MM') END;
      v_pkey := CASE WHEN v_regra = 'pacote' THEN 'pacote' ELSE to_char(r.data::date, 'YYYY-MM') END;
      v_usado_janela := coalesce((v_janela ->> v_wkey)::numeric, 0);

      IF r.tipo_cobranca IN ('plano','adicional','avulso') THEN
        -- Reserva feita no sistema novo: respeita o que foi registrado na hora da reserva.
        v_cob := least(coalesce(r.horas_cobertas_plano, 0), v_h);
      ELSIF v_cota <= 0 OR (c.bloco_unico AND v_regra = 'semanal' AND v_usado_janela > 0) THEN
        v_cob := 0;
      ELSE
        v_cob := least(greatest(v_cota - v_usado_janela, 0), v_h);
      END IF;
      -- Reserva registrada no sistema novo: o excedente é o que foi cobrado à parte (o resto saiu dos créditos).
      v_exc := CASE WHEN r.tipo_cobranca IN ('plano','adicional','avulso') THEN least(coalesce(r.horas_excedentes, v_h - v_cob), v_h - v_cob) ELSE v_h - v_cob END;
      v_janela := jsonb_set(v_janela, ARRAY[v_wkey], to_jsonb(v_usado_janela + v_cob));
      v_ultimo := greatest(v_ultimo, r.data::date);

      v_per := jsonb_set(v_per, ARRAY[v_pkey], coalesce(v_per -> v_pkey, '{"usadas":0,"extras":0,"extrato":[],"extrato_extra":[]}'::jsonb));
      v_per := jsonb_set(v_per, ARRAY[v_pkey, 'usadas'], to_jsonb((v_per #>> ARRAY[v_pkey,'usadas'])::numeric + v_cob));
      v_per := jsonb_set(v_per, ARRAY[v_pkey, 'extras'], to_jsonb((v_per #>> ARRAY[v_pkey,'extras'])::numeric + v_exc));
      IF v_cob > 0 THEN
        v_per := jsonb_set(v_per, ARRAY[v_pkey, 'extrato'], (v_per #> ARRAY[v_pkey,'extrato']) || jsonb_build_array(jsonb_build_object(
          'id', r.id, 'data', r.data, 'hora_inicio', left(r.hora_inicio, 5), 'hora_fim', left(r.hora_fim, 5), 'sala', r.sala_nome,
          'status', r.status, 'horas', v_cob, 'motivo', r.cancel_motivo, 'cancelado_por', r.cancelado_por)));
      END IF;
      IF v_exc > 0 THEN
        v_per := jsonb_set(v_per, ARRAY[v_pkey, 'extrato_extra'], (v_per #> ARRAY[v_pkey,'extrato_extra']) || jsonb_build_array(jsonb_build_object(
          'id', r.id, 'data', r.data, 'hora_inicio', left(r.hora_inicio, 5), 'hora_fim', left(r.hora_fim, 5), 'sala', r.sala_nome,
          'status', r.status, 'horas', v_exc, 'tipo_cobranca', coalesce(r.tipo_cobranca, 'nao_cobrado'), 'valor', nullif(r.valor, ''))));
      END IF;
    END LOOP;

    -- Monta os períodos: o pacote inteiro, ou um card por mês do contrato até hoje / última reserva.
    IF v_regra = 'pacote' THEN
      v_per_ini := v_ini; v_per_fim := least(v_fim, coalesce(c.data_fim, v_fim));
      v_mes := NULL;
    ELSE
      v_mes := date_trunc('month', v_ini)::date;
    END IF;

    LOOP
      IF v_regra = 'pacote' THEN
        v_pkey := 'pacote';
        v_rotulo := c.plano_nome;
      ELSE
        EXIT WHEN v_mes > date_trunc('month', least(greatest(current_date, v_ultimo), v_fim))::date;
        v_per_ini := greatest(v_mes, v_ini);
        v_per_fim := least((v_mes + interval '1 month - 1 day')::date, v_fim);
        v_pkey := to_char(v_mes, 'YYYY-MM');
        v_rotulo := c.plano_nome || ' (' || v_meses[extract(month FROM v_mes)::int] || '/' || to_char(v_mes, 'YY') || ')';
      END IF;

      IF v_regra = 'semanal' THEN
        SELECT count(DISTINCT (d::date - (extract(isodow FROM d)::int - 1))) INTO v_semanas
        FROM generate_series(v_per_ini, v_per_fim, interval '1 day') d WHERE extract(isodow FROM d) <= 6;
        v_total := v_cota * greatest(v_semanas, 0);
      ELSE
        v_total := v_cota;
      END IF;
      v_usadas := coalesce((v_per #>> ARRAY[v_pkey,'usadas'])::numeric, 0);
      v_extras := coalesce((v_per #>> ARRAY[v_pkey,'extras'])::numeric, 0);

      v_status := CASE
        WHEN v_total > 0 AND v_usadas >= v_total THEN 'esgotado'
        WHEN NOT v_aberto OR v_per_fim < current_date THEN 'encerrado'
        WHEN v_per_ini > current_date THEN 'futuro'
        ELSE 'vigente' END;

      IF v_total > 0 OR v_usadas > 0 OR v_regra IN ('sem_horas','avulso') THEN
        v_cards := v_cards || jsonb_build_array(jsonb_build_object(
          'id', c.id || ':' || v_pkey, 'contrato_id', c.id, 'tipo', CASE WHEN v_total > 0 THEN 'plano' ELSE 'sem_horas' END,
          'titulo', v_rotulo, 'plano_nome', c.plano_nome, 'categoria', c.categoria, 'regra', v_regra,
          'contrato_status', c.status, 'cobranca', c.cobranca, 'valor', coalesce(c.valor_combinado, c.preco),
          'preco_hora_adicional', c.preco_hora_adicional, 'periodo_inicio', v_per_ini, 'periodo_fim', v_per_fim,
          'contrato_fim', c.data_fim, 'horas_total', v_total, 'horas_usadas', round(v_usadas, 2), 'status', v_status,
          'vigente', v_status IN ('vigente','futuro'),
          'extrato', coalesce(v_per #> ARRAY[v_pkey,'extrato'], '[]'::jsonb)));
      END IF;

      IF v_extras > 0 THEN
        v_cards := v_cards || jsonb_build_array(jsonb_build_object(
          'id', c.id || ':' || v_pkey || ':extra', 'contrato_id', c.id, 'tipo', 'excedente',
          'titulo', 'Horas excedentes' || CASE WHEN v_regra = 'pacote' THEN ' — ' || c.plano_nome ELSE ' (' || v_meses[extract(month FROM v_mes)::int] || '/' || to_char(v_mes, 'YY') || ')' END,
          'plano_nome', c.plano_nome, 'categoria', c.categoria, 'regra', v_regra, 'contrato_status', c.status,
          'cobranca', NULL, 'valor', NULL, 'preco_hora_adicional', c.preco_hora_adicional,
          'periodo_inicio', v_per_ini, 'periodo_fim', v_per_fim, 'contrato_fim', c.data_fim,
          'horas_total', round(v_extras, 2), 'horas_usadas', round(v_extras, 2), 'status', 'esgotado', 'vigente', false,
          'extrato', coalesce(v_per #> ARRAY[v_pkey,'extrato_extra'], '[]'::jsonb)));
      END IF;

      EXIT WHEN v_regra = 'pacote';
      v_mes := (v_mes + interval '1 month')::date;
    END LOOP;
  END LOOP;

  -- Créditos extras (comprados ou bônus): um card cada, com o extrato de uso.
  FOR c IN
    SELECT cc.*,
      coalesce((SELECT sum(u.horas) FROM public.credito_usos u JOIN public.reservations rr ON rr.id = u.reservation_id
                WHERE u.credito_id = cc.id AND public.reserva_consome(rr.status, rr.cancel_consome_creditos)), 0) AS usadas,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id', rr.id, 'data', rr.data, 'hora_inicio', left(rr.hora_inicio, 5),
                  'hora_fim', left(rr.hora_fim, 5), 'sala', s.nome, 'status', rr.status, 'horas', u.horas, 'motivo', rr.cancel_motivo, 'cancelado_por', rr.cancelado_por, 'estornado', NOT public.reserva_consome(rr.status, rr.cancel_consome_creditos)) ORDER BY rr.data, rr.hora_inicio)
                FROM public.credito_usos u JOIN public.reservations rr ON rr.id = u.reservation_id LEFT JOIN public.salas s ON s.id = rr.sala_id
                WHERE u.credito_id = cc.id), '[]'::jsonb) AS extrato
    FROM public.cliente_creditos cc
    WHERE cc.cliente_corp_id = p_cliente_corp_id
    ORDER BY cc.created_at
  LOOP
    v_status := CASE
      WHEN c.status = 'cancelado' THEN 'encerrado'
      WHEN c.usadas >= c.horas THEN 'esgotado'
      WHEN c.data_fim < current_date THEN 'encerrado'
      WHEN c.data_inicio > current_date THEN 'futuro'
      ELSE 'vigente' END;
    v_cards := v_cards || jsonb_build_array(jsonb_build_object(
      'id', 'credito:' || c.id, 'credito_id', c.id, 'contrato_id', NULL, 'tipo', CASE WHEN c.tipo = 'bonus' THEN 'bonus' ELSE 'credito' END,
      'titulo', c.titulo, 'plano_nome', c.titulo, 'categoria', NULL, 'regra', 'credito', 'contrato_status', c.status,
      'cobranca', 'unico', 'valor', c.valor, 'preco_hora_adicional', NULL,
      'periodo_inicio', c.data_inicio, 'periodo_fim', c.data_fim, 'contrato_fim', c.data_fim,
      'horas_total', c.horas, 'horas_usadas', round(c.usadas, 2), 'status', v_status,
      'vigente', v_status IN ('vigente','futuro'), 'cancelado', c.status = 'cancelado', 'extrato', c.extrato));
  END LOOP;

  RETURN v_cards;
END $function$
;

-- Reserva do cliente logado (por cadastro ou e-mail do responsável), bloqueada para edição.
CREATE OR REPLACE FUNCTION public.cliente_reserva_propria(p_reservation_id text)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reserva public.reservations%ROWTYPE;
  v_inicio timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para alterar suas reservas.' USING ERRCODE = '42501';
  END IF;

  SELECT r.* INTO v_reserva
    FROM public.reservations AS r
    JOIN public.clientes_corp AS c
      ON c.user_id = auth.uid()::text AND c.deleted_at IS NULL
     AND (r.cliente_corp_id = c.id OR lower(r.email) = lower(c.responsavel_email))
   WHERE r.id = p_reservation_id
   LIMIT 1
   FOR UPDATE OF r;

  IF v_reserva.id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada na sua conta.' USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(v_reserva.status::text, '') IN ('cancelada', 'realizada') THEN
    RAISE EXCEPTION 'Esta reserva já foi %.', v_reserva.status USING ERRCODE = '22023';
  END IF;

  v_inicio := (v_reserva.data::date + left(v_reserva.hora_inicio::text, 5)::time) AT TIME ZONE 'America/Sao_Paulo';
  IF v_inicio - now() < interval '2 hours' THEN
    RAISE EXCEPTION 'Alterações e cancelamentos só podem ser feitos com pelo menos 2 horas de antecedência. Para mudanças de última hora, fale com a recepção.' USING ERRCODE = '22023';
  END IF;

  RETURN v_reserva;
END;
$$;
REVOKE ALL ON FUNCTION public.cliente_reserva_propria(text) FROM PUBLIC, anon, authenticated;

-- Cliente muda data/horário da própria reserva (mesma sala). Expediente e sala livre são
-- conferidos pelos gatilhos da tabela; aqui recalcula o saldo e a cobrança.
CREATE OR REPLACE FUNCTION public.cliente_alterar_reserva(p_reservation_id text, p_nova_data date, p_novo_inicio time, p_novo_fim time)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reserva public.reservations%ROWTYPE;
  v_horas numeric;
  v_cov jsonb;
  v_cob numeric;
  v_exc numeric;
  v_tipo text;
  v_just text;
  v_antes text;
BEGIN
  v_reserva := public.cliente_reserva_propria(p_reservation_id);

  IF p_nova_data IS NULL OR p_novo_inicio IS NULL OR p_novo_fim IS NULL THEN
    RAISE EXCEPTION 'Informe a nova data, o início e o término.' USING ERRCODE = '22023';
  END IF;
  IF p_novo_fim <= p_novo_inicio THEN
    RAISE EXCEPTION 'O horário final deve ser depois do inicial.' USING ERRCODE = '22007';
  END IF;
  IF extract(minute FROM p_novo_inicio)::int NOT IN (0, 30) OR extract(minute FROM p_novo_fim)::int NOT IN (0, 30)
     OR extract(second FROM p_novo_inicio) <> 0 OR extract(second FROM p_novo_fim) <> 0 THEN
    RAISE EXCEPTION 'Os horários devem usar intervalos de 30 minutos.' USING ERRCODE = '22023';
  END IF;
  IF (p_nova_data + p_novo_inicio) AT TIME ZONE 'America/Sao_Paulo' < now() + interval '30 minutes' THEN
    RAISE EXCEPTION 'Escolha um novo horário que ainda não começou.' USING ERRCODE = '22023';
  END IF;
  IF p_nova_data = v_reserva.data::date
     AND p_novo_inicio = left(v_reserva.hora_inicio::text, 5)::time
     AND p_novo_fim = left(v_reserva.hora_fim::text, 5)::time THEN
    RAISE EXCEPTION 'Escolha uma data ou horário diferente do atual.' USING ERRCODE = '22023';
  END IF;

  v_horas := extract(epoch FROM (p_novo_fim - p_novo_inicio)) / 3600;
  IF v_reserva.cliente_corp_id IS NOT NULL THEN
    v_cov := public.plano_cobertura(v_reserva.cliente_corp_id, p_nova_data, v_horas, v_reserva.sala_id, p_novo_inicio, v_reserva.id, '{}'::jsonb);
    v_cob := coalesce((v_cov->>'cobertas')::numeric, 0);
    v_exc := coalesce((v_cov->>'excedentes')::numeric, 0);
    IF v_exc > 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente para o novo horário: faltam %. %',
        public.fmt_horas(v_exc), public.saldo_cliente_texto(v_cov) USING ERRCODE = 'P0001';
    END IF;
    v_tipo := CASE WHEN (v_cov->>'estacao')::boolean THEN 'estacao' ELSE 'plano' END;
    v_just := CASE WHEN v_tipo = 'estacao' THEN 'Estação compartilhada incluída no plano ' || (v_cov->>'plano_nome') || '.'
                   WHEN v_cob > 0 THEN trim(to_char(v_cob, 'FM999990.##')) || 'h cobertas pelo plano ' || (v_cov->>'plano_nome')
                     || CASE WHEN v_horas > v_cob THEN '; ' || trim(to_char(v_horas - v_cob, 'FM999990.##')) || 'h dos créditos extras.' ELSE '.' END
                   ELSE trim(to_char(v_horas, 'FM999990.##')) || 'h dos créditos extras.' END;
  END IF;

  v_antes := to_char(v_reserva.data::date, 'DD/MM/YYYY') || ' ' || left(v_reserva.hora_inicio::text, 5) || '–' || left(v_reserva.hora_fim::text, 5);

  UPDATE public.reservations SET
    data = p_nova_data::text,
    hora_inicio = p_novo_inicio::text,
    hora_fim = p_novo_fim::text,
    horas_reservadas = v_horas,
    horas_cobertas_plano = CASE WHEN v_cov IS NULL THEN horas_cobertas_plano ELSE v_cob END,
    horas_excedentes = CASE WHEN v_cov IS NULL THEN horas_excedentes ELSE 0 END,
    tipo_cobranca = coalesce(v_tipo, tipo_cobranca),
    valor = CASE WHEN v_cov IS NULL THEN valor ELSE '0' END,
    valor_original = CASE WHEN v_cov IS NULL THEN valor_original ELSE '0' END,
    plano_id = CASE WHEN v_cov IS NULL THEN plano_id WHEN v_cob > 0 THEN v_cov->>'plano_id' END,
    calculo_justificativa = coalesce(v_just, calculo_justificativa),
    observacoes = concat_ws(E'\n', nullif(btrim(coalesce(observacoes, '')), ''),
      'Alterada pelo cliente em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' (antes: ' || v_antes || ').'),
    updated_at = now()::text
  WHERE id = v_reserva.id;

  -- Pedidos antigos em aberto para esta reserva deixam de valer.
  UPDATE public.reservation_change_requests
     SET status = 'resolvida', resolved_at = now(), admin_resposta = coalesce(admin_resposta, 'Alterada pelo próprio cliente.')
   WHERE reservation_id = v_reserva.id AND status = 'pendente';

  RETURN v_reserva.id;
END;
$$;
REVOKE ALL ON FUNCTION public.cliente_alterar_reserva(text, date, time, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_alterar_reserva(text, date, time, time) TO authenticated;

-- Cliente cancela a própria reserva. O gatilho de cancelamento decide o estorno
-- (24h ou mais de antecedência devolve as horas; menos de 24h ficam consumidas).
CREATE OR REPLACE FUNCTION public.cliente_cancelar_reserva(p_reservation_id text, p_motivo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reserva public.reservations%ROWTYPE;
  v_motivo text := btrim(coalesce(p_motivo, ''));
BEGIN
  IF length(v_motivo) NOT BETWEEN 2 AND 180 THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento (de 2 a 180 caracteres).' USING ERRCODE = '22023';
  END IF;
  v_reserva := public.cliente_reserva_propria(p_reservation_id);

  UPDATE public.reservations
     SET status = 'cancelada', cancel_motivo = v_motivo, cancelled_at = now()::text
   WHERE id = v_reserva.id;

  RETURN v_reserva.id;
END;
$$;
REVOKE ALL ON FUNCTION public.cliente_cancelar_reserva(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_cancelar_reserva(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
