-- Cancelamento com motivo obrigatório (2 a 180 caracteres) e estorno inteligente de horas:
-- cancelamento pedido pelo cliente com 24h ou mais de antecedência devolve as horas ao plano/créditos;
-- com menos de 24h as horas ficam consumidas. Cancelamento feito pelo admin sempre devolve.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cancel_consome_creditos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelado_por text;

-- Reserva que conta no banco de horas: ativa, ou cancelada tarde (horas consumidas).
CREATE OR REPLACE FUNCTION public.reserva_consome(p_status text, p_consome boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(p_status, '') <> 'cancelada' OR coalesce(p_consome, false)
$$;

CREATE OR REPLACE FUNCTION public.registrar_cancelamento_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_inicio timestamptz;
  v_req public.reservation_change_requests%ROWTYPE;
  v_motivo text;
BEGIN
  IF NEW.status = 'cancelada' AND coalesce(OLD.status, '') <> 'cancelada' THEN
    v_inicio := (NEW.data::date + NEW.hora_inicio::time) AT TIME ZONE 'America/Sao_Paulo';
    SELECT * INTO v_req FROM public.reservation_change_requests
     WHERE reservation_id = NEW.id AND tipo = 'cancelamento' AND status = 'pendente'
     ORDER BY created_at DESC LIMIT 1;

    v_motivo := btrim(coalesce(NEW.cancel_motivo, ''));
    IF length(v_motivo) < 2 AND v_req.id IS NOT NULL THEN v_motivo := btrim(coalesce(v_req.mensagem, '')); END IF;
    IF length(v_motivo) < 2 AND auth.uid() IS NULL THEN v_motivo := 'Cancelado pelo sistema'; END IF;
    IF length(v_motivo) < 2 OR length(v_motivo) > 180 THEN
      RAISE EXCEPTION 'Informe o motivo do cancelamento (de 2 a 180 caracteres).' USING ERRCODE = '22023';
    END IF;
    NEW.cancel_motivo := v_motivo;
    NEW.cancelled_at := coalesce(NEW.cancelled_at, now()::text);

    IF v_req.id IS NOT NULL THEN
      -- Pedido do cliente: vale o momento em que ele pediu.
      NEW.cancelado_por := 'cliente';
      NEW.cancel_consome_creditos := v_req.created_at > v_inicio - interval '24 hours';
    ELSIF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
      NEW.cancelado_por := 'admin';
      NEW.cancel_consome_creditos := false;
    ELSIF auth.uid() IS NULL THEN
      NEW.cancelado_por := 'sistema';
      NEW.cancel_consome_creditos := false;
    ELSE
      NEW.cancelado_por := 'cliente';
      NEW.cancel_consome_creditos := now() > v_inicio - interval '24 hours';
    END IF;
  ELSIF coalesce(NEW.status, '') <> 'cancelada' AND OLD.status = 'cancelada' THEN
    -- Reserva reativada: volta a contar normalmente.
    NEW.cancel_consome_creditos := false;
    NEW.cancelado_por := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reservations_registrar_cancelamento ON public.reservations;
CREATE TRIGGER reservations_registrar_cancelamento BEFORE UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cancelamento_reserva();

-- Admin informa o motivo ao cancelar pelo status.
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(text, text);
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(p_reservation_id text, p_status text, p_motivo text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS role
     WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem atualizar o status da reserva.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pendente', 'confirmada', 'realizada', 'cancelada') THEN
    RAISE EXCEPTION 'Status inválido.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reservations
     SET status = p_status,
         cancel_motivo = CASE WHEN p_status = 'cancelada' AND p_motivo IS NOT NULL THEN btrim(p_motivo) ELSE cancel_motivo END,
         cancelled_at = CASE WHEN p_status = 'cancelada' THEN coalesce(cancelled_at, now()::text) ELSE cancelled_at END
   WHERE id = p_reservation_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$function$
;
REVOKE ALL ON FUNCTION public.admin_update_reservation_status(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.cancel_reservation_series(text, date);
CREATE OR REPLACE FUNCTION public.cancel_reservation_series(p_serie_id text, p_from date, p_motivo text DEFAULT NULL::text)
 RETURNS TABLE(id text, google_event_id text, google_calendar_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
           cancel_motivo = coalesce(nullif(btrim(p_motivo), ''), 'Cancelamento da recorrência a partir de ' || to_char(v_inicio, 'DD/MM/YYYY')),
           google_event_id = NULL
      FROM alvo
     WHERE reservation.id = alvo.rid
    RETURNING alvo.rid, alvo.gid, alvo.cid
  )
  SELECT cancelados.rid::text, cancelados.gid, cancelados.cid FROM cancelados;
END;
$function$
;
REVOKE ALL ON FUNCTION public.cancel_reservation_series(text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_reservation_series(text, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_reservation_change(p_reservation_id text, p_tipo text, p_mensagem text DEFAULT NULL::text, p_nova_data text DEFAULT NULL::text, p_novo_inicio text DEFAULT NULL::text, p_novo_fim text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_reserva public.reservations%ROWTYPE;
  v_cliente_id text;
  v_inicio timestamptz;
  v_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para solicitar alterações.' USING ERRCODE = '42501';
  END IF;
  IF p_tipo NOT IN ('cancelamento', 'alteracao') THEN
    RAISE EXCEPTION 'Tipo de solicitação inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT c.id INTO v_cliente_id
    FROM public.reservations AS r
    JOIN public.clientes_corp AS c
      ON c.user_id = auth.uid()::text AND c.deleted_at IS NULL
     AND (r.cliente_corp_id = c.id OR lower(r.email) = lower(c.responsavel_email))
   WHERE r.id = p_reservation_id
   LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM public.reservations WHERE id = p_reservation_id;
  END IF;

  IF v_cliente_id IS NULL OR v_reserva.id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada na sua conta.' USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(v_reserva.status, '') IN ('cancelada', 'realizada') THEN
    RAISE EXCEPTION 'Esta reserva já foi %.', v_reserva.status USING ERRCODE = '22023';
  END IF;

  v_inicio := (v_reserva.data || ' ' || left(v_reserva.hora_inicio, 5))::timestamp AT TIME ZONE 'America/Sao_Paulo';
  IF v_inicio - now() < interval '2 hours' THEN
    RAISE EXCEPTION 'Solicitações de cancelamento ou alteração só podem ser feitas com pelo menos 2 horas de antecedência.' USING ERRCODE = '22023';
  END IF;

  IF p_tipo = 'alteracao' AND coalesce(btrim(p_mensagem), '') = '' AND p_nova_data IS NULL AND p_novo_inicio IS NULL THEN
    RAISE EXCEPTION 'Informe o novo horário ou descreva a alteração desejada.' USING ERRCODE = '22023';
  END IF;
  IF p_novo_inicio IS NOT NULL AND p_novo_fim IS NOT NULL AND p_novo_fim::time <= p_novo_inicio::time THEN
    RAISE EXCEPTION 'O novo horário final deve ser depois do inicial.' USING ERRCODE = '22007';
  END IF;
  IF p_tipo = 'cancelamento' AND length(btrim(coalesce(p_mensagem, ''))) NOT BETWEEN 2 AND 180 THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento (de 2 a 180 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_mensagem, '')) > 1000 THEN
    RAISE EXCEPTION 'Mensagem muito longa (máximo 1000 caracteres).' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reservation_change_requests WHERE reservation_id = v_reserva.id AND status = 'pendente') THEN
    RAISE EXCEPTION 'Já existe uma solicitação em análise para esta reserva.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.reservation_change_requests (reservation_id, cliente_corp_id, tipo, mensagem, nova_data, novo_inicio, novo_fim)
  VALUES (v_reserva.id, v_cliente_id, p_tipo, nullif(btrim(p_mensagem), ''), p_nova_data, left(p_novo_inicio, 5), left(p_novo_fim, 5))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;

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
         AND r.id IS DISTINCT FROM p_ignorar_reserva;
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

CREATE OR REPLACE FUNCTION public.alocar_creditos_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resto numeric;
  cc record;
  v_saldo numeric;
  v_usar numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.horas_reservadas IS NOT DISTINCT FROM OLD.horas_reservadas
     AND NEW.horas_cobertas_plano IS NOT DISTINCT FROM OLD.horas_cobertas_plano
     AND NEW.horas_excedentes IS NOT DISTINCT FROM OLD.horas_excedentes
     AND NEW.data IS NOT DISTINCT FROM OLD.data THEN
    RETURN NULL;
  END IF;
  DELETE FROM public.credito_usos WHERE reservation_id = NEW.id;
  IF NEW.cliente_corp_id IS NULL OR NEW.tipo_cobranca IS NULL OR coalesce(NEW.status, '') = 'cancelada' THEN
    RETURN NULL;
  END IF;
  v_resto := round(coalesce(NEW.horas_reservadas, 0) - coalesce(NEW.horas_cobertas_plano, 0) - coalesce(NEW.horas_excedentes, 0), 2);
  IF NEW.tipo_cobranca = 'estacao' OR v_resto <= 0 THEN RETURN NULL; END IF;

  FOR cc IN
    SELECT c.* FROM public.cliente_creditos c
    WHERE c.cliente_corp_id = NEW.cliente_corp_id AND c.status = 'ativo'
      AND c.data_inicio <= NEW.data::date AND (c.data_fim IS NULL OR c.data_fim >= NEW.data::date)
    ORDER BY c.data_fim NULLS LAST, c.created_at
  LOOP
    EXIT WHEN v_resto <= 0;
    SELECT cc.horas - coalesce(sum(u.horas), 0) INTO v_saldo
    FROM public.credito_usos u JOIN public.reservations rr ON rr.id = u.reservation_id
    WHERE u.credito_id = cc.id AND public.reserva_consome(rr.status, rr.cancel_consome_creditos);
    v_usar := least(greatest(coalesce(v_saldo, cc.horas), 0), v_resto);
    IF v_usar > 0 THEN
      INSERT INTO public.credito_usos (credito_id, reservation_id, horas) VALUES (cc.id, NEW.id, v_usar);
      v_resto := v_resto - v_usar;
    END IF;
  END LOOP;
  RETURN NULL;
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
        AND res.data::date BETWEEN v_ini AND v_fim
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

NOTIFY pgrst, 'reload schema';
