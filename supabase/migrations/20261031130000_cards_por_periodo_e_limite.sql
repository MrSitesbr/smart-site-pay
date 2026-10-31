-- Banco de horas: créditos extras (admin insere, cliente solicita), consumo depois da cota do plano,
-- regra anterior contando reservas pendentes e cards por período com excedentes separados.
-- Créditos extras (banco de horas): o admin insere (compra ou bônus) e as reservas consomem
-- depois da cota do plano, começando pelo crédito que vence antes.
CREATE TABLE IF NOT EXISTS public.cliente_creditos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_corp_id text NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(titulo) BETWEEN 2 AND 120),
  tipo text NOT NULL DEFAULT 'compra' CHECK (tipo IN ('compra','bonus')),
  horas numeric NOT NULL CHECK (horas > 0 AND horas <= 1000),
  valor numeric CHECK (valor IS NULL OR valor >= 0),
  data_inicio date NOT NULL DEFAULT current_date,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','cancelado')),
  observacoes text,
  solicitacao_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
CREATE INDEX IF NOT EXISTS cliente_creditos_cliente_idx ON public.cliente_creditos(cliente_corp_id);

CREATE TABLE IF NOT EXISTS public.credito_usos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  credito_id text NOT NULL REFERENCES public.cliente_creditos(id) ON DELETE CASCADE,
  reservation_id text NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  horas numeric NOT NULL CHECK (horas > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credito_usos_credito_idx ON public.credito_usos(credito_id);
CREATE INDEX IF NOT EXISTS credito_usos_reserva_idx ON public.credito_usos(reservation_id);

ALTER TABLE public.cliente_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_usos ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.cliente_creditos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY client_read ON public.cliente_creditos FOR SELECT TO authenticated USING (public.is_own_client(cliente_corp_id));
CREATE POLICY admin_manage ON public.credito_usos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY client_read ON public.credito_usos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cliente_creditos cc WHERE cc.id = credito_id AND public.is_own_client(cc.cliente_corp_id)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_creditos, public.credito_usos TO authenticated;
GRANT ALL ON public.cliente_creditos, public.credito_usos TO service_role;

-- Cobrança de crédito comprado.
ALTER TABLE public.cobrancas DROP CONSTRAINT IF EXISTS cobrancas_tipo_check;
ALTER TABLE public.cobrancas ADD CONSTRAINT cobrancas_tipo_check CHECK (tipo IN ('mensalidade','pacote','adicional','avulso','credito','outro'));
ALTER TABLE public.cobrancas ADD COLUMN IF NOT EXISTS credito_id text REFERENCES public.cliente_creditos(id) ON DELETE SET NULL;

-- Solicitação do cliente: troca de plano ou compra de créditos.
ALTER TABLE public.plano_solicitacoes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'plano';
ALTER TABLE public.plano_solicitacoes ADD COLUMN IF NOT EXISTS horas numeric;
ALTER TABLE public.plano_solicitacoes DROP CONSTRAINT IF EXISTS plano_solicitacoes_tipo_check;
ALTER TABLE public.plano_solicitacoes ADD CONSTRAINT plano_solicitacoes_tipo_check CHECK (tipo IN ('plano','creditos'));

-- Desconta dos créditos a parte da reserva que não ficou no plano nem foi cobrada à parte.
-- Roda sozinho ao gravar ou alterar a reserva; reserva cancelada devolve as horas.
CREATE OR REPLACE FUNCTION public.alocar_creditos_reserva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    WHERE u.credito_id = cc.id AND coalesce(rr.status, '') <> 'cancelada';
    v_usar := least(greatest(coalesce(v_saldo, cc.horas), 0), v_resto);
    IF v_usar > 0 THEN
      INSERT INTO public.credito_usos (credito_id, reservation_id, horas) VALUES (cc.id, NEW.id, v_usar);
      v_resto := v_resto - v_usar;
    END IF;
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS reservations_alocar_creditos ON public.reservations;
CREATE TRIGGER reservations_alocar_creditos AFTER INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.alocar_creditos_reserva();

-- Simulação de vários períodos também separa os créditos entre eles.
CREATE OR REPLACE FUNCTION public.plano_simular(p_cliente_corp_id text, p_periodos jsonb, p_sala_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_item jsonb;
  v_cov jsonb;
  v_extra jsonb := '{}'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_inicio time;
  v_fim time;
  v_key text;
BEGIN
  IF p_periodos IS NULL OR jsonb_typeof(p_periodos) <> 'array' THEN RETURN '[]'::jsonb; END IF;
  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_periodos) ORDER BY value->>'data', value->>'hora_inicio'
  LOOP
    v_inicio := (v_item->>'hora_inicio')::time;
    v_fim := (v_item->>'hora_fim')::time;
    v_cov := public.plano_cobertura(p_cliente_corp_id, (v_item->>'data')::date,
      extract(epoch FROM (v_fim - v_inicio)) / 3600, coalesce(v_item->>'sala_id', p_sala_id), v_inicio, NULL, v_extra);
    v_key := v_cov->>'janela_inicio';
    IF v_key IS NOT NULL AND (v_cov->>'cobertas')::numeric > 0 AND NOT (v_cov->>'estacao')::boolean THEN
      v_extra := jsonb_set(v_extra, ARRAY[v_key], to_jsonb(coalesce((v_extra->>v_key)::numeric, 0) + (v_cov->>'cobertas')::numeric));
    END IF;
    IF coalesce((v_cov->>'cobertas_credito')::numeric, 0) > 0 THEN
      v_extra := jsonb_set(v_extra, ARRAY['__creditos'], to_jsonb(coalesce((v_extra->>'__creditos')::numeric, 0) + (v_cov->>'cobertas_credito')::numeric));
    END IF;
    v_out := v_out || jsonb_build_array(v_cov || jsonb_build_object('data', v_item->>'data', 'hora_inicio', v_item->>'hora_inicio', 'hora_fim', v_item->>'hora_fim'));
  END LOOP;
  RETURN v_out;
END $$;

-- Admin insere créditos; compra com valor gera cobrança "a receber".
CREATE OR REPLACE FUNCTION public.admin_adicionar_creditos(
  p_cliente_corp_id text, p_titulo text, p_horas numeric, p_tipo text DEFAULT 'compra',
  p_valor numeric DEFAULT NULL, p_validade_dias integer DEFAULT NULL, p_observacoes text DEFAULT NULL,
  p_solicitacao_id text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_id text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;
  IF p_horas IS NULL OR p_horas <= 0 THEN RAISE EXCEPTION 'Informe a quantidade de horas.'; END IF;
  IF p_tipo NOT IN ('compra','bonus') THEN RAISE EXCEPTION 'Tipo de crédito inválido.'; END IF;
  INSERT INTO public.cliente_creditos (cliente_corp_id, titulo, tipo, horas, valor, data_fim, observacoes, solicitacao_id)
  VALUES (p_cliente_corp_id, coalesce(nullif(btrim(p_titulo), ''), 'Créditos extras'), p_tipo, p_horas,
    CASE WHEN p_tipo = 'bonus' THEN 0 ELSE p_valor END,
    CASE WHEN p_validade_dias IS NOT NULL AND p_validade_dias > 0 THEN current_date + p_validade_dias - 1 END,
    nullif(btrim(coalesce(p_observacoes, '')), ''), p_solicitacao_id)
  RETURNING id INTO v_id;

  IF p_tipo = 'compra' AND coalesce(p_valor, 0) > 0 THEN
    INSERT INTO public.cobrancas (cliente_corp_id, credito_id, competencia, tipo, descricao, valor, vencimento)
    VALUES (p_cliente_corp_id, v_id, date_trunc('month', current_date)::date, 'credito',
      'Créditos: ' || coalesce(nullif(btrim(p_titulo), ''), 'Créditos extras') || ' (' || trim(to_char(p_horas, 'FM9990.##')) || 'h)',
      p_valor, current_date);
  END IF;

  IF p_solicitacao_id IS NOT NULL THEN
    UPDATE public.plano_solicitacoes SET status = 'aprovada', updated_at = now()::text WHERE id = p_solicitacao_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancelar_credito(p_credito_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;
  UPDATE public.cliente_creditos SET status = 'cancelado' WHERE id = p_credito_id AND status = 'ativo';
  IF NOT FOUND THEN RAISE EXCEPTION 'Crédito não encontrado ou já cancelado.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_adicionar_creditos(text, text, numeric, text, numeric, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adicionar_creditos(text, text, numeric, text, numeric, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_cancelar_credito(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancelar_credito(text) TO authenticated;

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
         AND coalesce(r.status, '') <> 'cancelada'
         AND r.data::date BETWEEN v_ini AND v_fim
         AND r.id IS DISTINCT FROM p_ignorar_reserva;
    ELSE
      SELECT coalesce(sum(public.reserva_horas_plano(r)), 0),
             coalesce(bool_or(public.reserva_horas_plano(r) > 0), false)
        INTO v_usado, v_bloco_usado
        FROM public.reservations r
       WHERE r.cliente_corp_id = p_cliente_corp_id
         AND coalesce(r.status, '') <> 'cancelada'
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
             WHERE u.credito_id = cc.id AND coalesce(rr.status, '') <> 'cancelada'
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

-- Cards por período: cada mês do plano (ou o pacote inteiro) é um card com o limite de horas.
-- As reservas são distribuídas em ordem: o que cabe no limite consome o plano; o que passa vira
-- um card separado de "Horas excedentes". Período com o limite atingido é considerado finalizado.
DROP FUNCTION IF EXISTS public.cliente_plano_cards(text);
CREATE FUNCTION public.cliente_plano_cards(p_cliente_corp_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
        AND coalesce(res.status, '') <> 'cancelada'
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
          'status', r.status, 'horas', v_cob)));
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
                WHERE u.credito_id = cc.id AND coalesce(rr.status, '') <> 'cancelada'), 0) AS usadas,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id', rr.id, 'data', rr.data, 'hora_inicio', left(rr.hora_inicio, 5),
                  'hora_fim', left(rr.hora_fim, 5), 'sala', s.nome, 'status', rr.status, 'horas', u.horas) ORDER BY rr.data, rr.hora_inicio)
                FROM public.credito_usos u JOIN public.reservations rr ON rr.id = u.reservation_id LEFT JOIN public.salas s ON s.id = rr.sala_id
                WHERE u.credito_id = cc.id AND coalesce(rr.status, '') <> 'cancelada'), '[]'::jsonb) AS extrato
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
END $$;

REVOKE ALL ON FUNCTION public.cliente_plano_cards(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_plano_cards(text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
