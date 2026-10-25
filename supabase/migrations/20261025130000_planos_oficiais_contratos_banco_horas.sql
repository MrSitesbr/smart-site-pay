-- Etapas 1 a 3: planos oficiais, contrato de cada cliente, número de cadastro e banco de horas.
-- Só acrescenta colunas, tabelas e funções. Reservas existentes não são recalculadas.

-- 1. Planos oficiais ---------------------------------------------------------------------------
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS regra_uso text,
  ADD COLUMN IF NOT EXISTS cobranca text,
  ADD COLUMN IF NOT EXISTS horas_semana numeric,
  ADD COLUMN IF NOT EXISTS bloco_unico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS horas_reuniao_mes numeric,
  ADD COLUMN IF NOT EXISTS estacao_livre boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duracao_meses integer,
  ADD COLUMN IF NOT EXISTS preco_hora_adicional numeric,
  ADD COLUMN IF NOT EXISTS beneficios text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subtitulo text,
  ADD COLUMN IF NOT EXISTS exibir_site boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 100;

CREATE UNIQUE INDEX IF NOT EXISTS planos_slug_key ON public.planos(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.planos DROP CONSTRAINT IF EXISTS planos_regra_uso_check;
ALTER TABLE public.planos ADD CONSTRAINT planos_regra_uso_check
  CHECK (regra_uso IS NULL OR regra_uso IN ('semanal','pacote','mensal_reuniao','sem_horas','avulso'));
ALTER TABLE public.planos DROP CONSTRAINT IF EXISTS planos_cobranca_check;
ALTER TABLE public.planos ADD CONSTRAINT planos_cobranca_check
  CHECK (cobranca IS NULL OR cobranca IN ('mensal','unico','hora'));

-- Planos já existentes (mesmo id, para manter clientes e reservas ligados).
-- Os campos antigos (quantidade_horas, horas_incluidas, periodo_apuracao) ficam como estão:
-- eles continuam valendo para contratos "a revisar" até o admin confirmar cada cliente.
UPDATE public.planos SET slug = 'harmonia-hora', nome = 'Harmonia Hora', categoria = 'harmonia', regra_uso = 'semanal',
  cobranca = 'mensal', preco = 120, horas_semana = 1, bloco_unico = false, duracao_meses = 6, preco_hora_adicional = 30, ordem = 10,
  subtitulo = '1 hora por semana',
  beneficios = ARRAY['1 hora por semana (segunda a sábado)','Hora não usada na semana não acumula','Contrato semestral sem multa','Hora adicional: R$ 30/h']
WHERE id = '0da4bf08-fdec-4eb4-a1c7-c4c20fc0297e';

UPDATE public.planos SET slug = 'tranquilidade', categoria = 'pacote', regra_uso = 'pacote', cobranca = 'unico', preco = 180,
  duracao_meses = 3, ordem = 40, subtitulo = '6 horas em até 3 meses',
  beneficios = ARRAY['6 horas livres, distribuídas como quiser','Válido por 3 meses ou até acabar as horas','Pagamento único']
WHERE id = '3d690819-02b9-4556-8b52-cb7122818853';

UPDATE public.planos SET slug = 'avulso', categoria = 'avulso', regra_uso = 'avulso', cobranca = 'hora', preco = 60, ordem = 120,
  subtitulo = 'R$ 60 por hora', beneficios = ARRAY['Sem mensalidade','Pague apenas as horas que usar']
WHERE id = '94e8bac2-7154-4a4f-af99-60bf1ec64980';

UPDATE public.planos SET slug = 'endereco-fiscal', categoria = 'endereco', regra_uso = 'sem_horas', cobranca = 'mensal', preco = 160, ordem = 50,
  subtitulo = 'Endereço para registro da empresa',
  beneficios = ARRAY['Endereço fiscal para abertura e registro da empresa','Recebimento e aviso de correspondências','Unidades Boqueirão (Praia Grande) e Centro (São Vicente)']
WHERE id = '5d8a598d-4c91-4315-a4fe-7272ab4deaa9';

UPDATE public.planos SET slug = 'endereco-fiscal-mei', categoria = 'endereco', regra_uso = 'sem_horas', cobranca = 'mensal', preco = 80, ordem = 70,
  subtitulo = 'Endereço fiscal para MEI',
  beneficios = ARRAY['Endereço fiscal para MEI','Recebimento e aviso de correspondências','Unidades Boqueirão (Praia Grande) e Centro (São Vicente)']
WHERE id = '066ac7f4-330a-4822-be3b-b2af3f2f1267';

UPDATE public.planos SET slug = 'endereco-comercial', categoria = 'endereco', regra_uso = 'sem_horas', cobranca = 'mensal', preco = 125, ordem = 90,
  subtitulo = 'Endereço comercial para sua empresa',
  beneficios = ARRAY['Endereço comercial para divulgação','Recebimento e aviso de correspondências','Unidades Boqueirão (Praia Grande) e Centro (São Vicente)']
WHERE id = '94abab34-770d-443f-96fb-9474790825c7';

-- Planos novos.
INSERT INTO public.planos (nome, slug, categoria, regra_uso, cobranca, preco, horas_semana, bloco_unico, horas_reuniao_mes,
  estacao_livre, duracao_meses, preco_hora_adicional, quantidade_horas, horas_incluidas, periodo_apuracao, validade_dias, ordem, subtitulo, beneficios, tipo)
SELECT v.nome, v.slug, v.categoria, v.regra_uso, v.cobranca, v.preco, v.horas_semana, v.bloco_unico, v.horas_reuniao_mes,
  v.estacao_livre, v.duracao_meses, v.preco_hora_adicional, v.qh, v.qh, 'mensal', 30, v.ordem, v.subtitulo, v.beneficios, v.tipo
FROM (VALUES
  ('Harmonia Período', 'harmonia-periodo', 'harmonia', 'semanal', 'mensal', 350::numeric, 4::numeric, true, NULL::numeric, false, 6, 30::numeric, 16, 20,
   '4 horas seguidas por semana', ARRAY['Um bloco de 4 horas seguidas por semana (segunda a sábado)','Horas não usadas na semana não acumulam','Contrato semestral sem multa','Hora adicional: R$ 30/h'], 'privativo'),
  ('Harmonia Diária', 'harmonia-diaria', 'harmonia', 'semanal', 'mensal', 400, 8, true, NULL, false, 6, 30, 32, 30,
   '8 horas seguidas por semana', ARRAY['Um bloco de 8 horas seguidas por semana (segunda a sábado)','Horas não usadas na semana não acumulam','Contrato semestral sem multa','Hora adicional: R$ 30/h'], 'privativo'),
  ('Endereço Fiscal Plus', 'endereco-fiscal-plus', 'endereco', 'mensal_reuniao', 'mensal', 180, NULL, false, 5, false, NULL, NULL, 5, 60,
   'Endereço fiscal + 5h de sala de reunião', ARRAY['Endereço fiscal para abertura e registro da empresa','5 horas de sala de reunião por mês (não acumulativas)','Recebimento e aviso de correspondências'], 'endereco'),
  ('Endereço Fiscal MEI Plus', 'endereco-fiscal-mei-plus', 'endereco', 'mensal_reuniao', 'mensal', 90, NULL, false, 5, false, NULL, NULL, 5, 80,
   'Endereço fiscal MEI + 5h de sala de reunião', ARRAY['Endereço fiscal para MEI','5 horas de sala de reunião por mês (não acumulativas)','Recebimento e aviso de correspondências'], 'endereco'),
  ('Endereço Comercial Plus', 'endereco-comercial-plus', 'endereco', 'mensal_reuniao', 'mensal', 135, NULL, false, 5, false, NULL, NULL, 5, 100,
   'Endereço comercial + 5h de sala de reunião', ARRAY['Endereço comercial para divulgação','5 horas de sala de reunião por mês (não acumulativas)','Recebimento e aviso de correspondências'], 'endereco'),
  ('Compartilhado', 'compartilhado', 'compartilhado', 'mensal_reuniao', 'mensal', 300, NULL, false, 5, true, NULL, NULL, 5, 110,
   'Estação compartilhada + 5h de reunião', ARRAY['Uso livre da estação compartilhada, de segunda a sábado, das 8h às 20h','5 horas de sala de reunião por mês (não acumulativas)'], 'compartilhado')
) AS v(nome, slug, categoria, regra_uso, cobranca, preco, horas_semana, bloco_unico, horas_reuniao_mes, estacao_livre, duracao_meses,
       preco_hora_adicional, qh, ordem, subtitulo, beneficios, tipo)
WHERE NOT EXISTS (SELECT 1 FROM public.planos p WHERE p.slug = v.slug);

-- Unidades: Harmonia, Tranquilidade, Compartilhado e Avulso nas unidades de sala (02 e 03);
-- Endereço Fiscal/Comercial no Boqueirão (Unidade 01 - R. Jaú) e no Centro de São Vicente (Unidade 04).
INSERT INTO public.plano_unidades (plano_id, unidade_id)
SELECT p.id, u.id::uuid
FROM public.planos p
CROSS JOIN (VALUES ('7eccfbf5-a0fc-41cd-a6ad-bda50cfb9da5'), ('96fa0d88-6fe5-465a-87ee-9d173bf7f208')) AS u(id)
WHERE p.slug IN ('harmonia-periodo','harmonia-diaria','compartilhado')
  AND NOT EXISTS (SELECT 1 FROM public.plano_unidades x WHERE x.plano_id = p.id AND x.unidade_id = u.id::uuid);
INSERT INTO public.plano_unidades (plano_id, unidade_id)
SELECT p.id, u.id::uuid
FROM public.planos p
CROSS JOIN (VALUES ('66a610f6-1f6b-4673-903d-80aa57657982'), ('40840fbd-f575-4ff7-9e6d-1e9231985ce6')) AS u(id)
WHERE p.categoria = 'endereco'
  AND NOT EXISTS (SELECT 1 FROM public.plano_unidades x WHERE x.plano_id = p.id AND x.unidade_id = u.id::uuid);

-- Salas liberadas para Harmonia Período/Diária = as mesmas do Harmonia Hora.
INSERT INTO public.sala_planos (sala_id, plano_id)
SELECT sp.sala_id, novo.id
FROM public.sala_planos sp
JOIN public.planos hora ON hora.id = sp.plano_id AND hora.slug = 'harmonia-hora'
CROSS JOIN public.planos novo
WHERE novo.slug IN ('harmonia-periodo','harmonia-diaria')
  AND NOT EXISTS (SELECT 1 FROM public.sala_planos x WHERE x.sala_id = sp.sala_id AND x.plano_id = novo.id);

-- 2. Número de cadastro do cliente --------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.clientes_corp_numero_cadastro_seq;
ALTER TABLE public.clientes_corp ADD COLUMN IF NOT EXISTS numero_cadastro integer;
WITH ordenados AS (
  SELECT id, row_number() OVER (ORDER BY created_at::timestamptz NULLS LAST, id) AS n
  FROM public.clientes_corp
)
UPDATE public.clientes_corp c SET numero_cadastro = o.n
FROM ordenados o WHERE o.id = c.id AND c.numero_cadastro IS NULL;
SELECT setval('public.clientes_corp_numero_cadastro_seq', greatest((SELECT coalesce(max(numero_cadastro), 0) FROM public.clientes_corp), 1),
  (SELECT count(*) > 0 FROM public.clientes_corp));
ALTER TABLE public.clientes_corp ALTER COLUMN numero_cadastro SET DEFAULT nextval('public.clientes_corp_numero_cadastro_seq');
ALTER SEQUENCE public.clientes_corp_numero_cadastro_seq OWNED BY public.clientes_corp.numero_cadastro;
ALTER TABLE public.clientes_corp ALTER COLUMN numero_cadastro SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clientes_corp_numero_cadastro_key ON public.clientes_corp(numero_cadastro);

-- O número nunca muda depois de criado.
CREATE OR REPLACE FUNCTION public.keep_numero_cadastro()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.numero_cadastro := OLD.numero_cadastro;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clientes_corp_keep_numero_cadastro ON public.clientes_corp;
CREATE TRIGGER clientes_corp_keep_numero_cadastro BEFORE UPDATE OF numero_cadastro ON public.clientes_corp
  FOR EACH ROW EXECUTE FUNCTION public.keep_numero_cadastro();

-- 3. Contrato de cada cliente e histórico ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_planos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_corp_id text NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  plano_id text NOT NULL REFERENCES public.planos(id),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('a_revisar','ativo','encerrado')),
  data_inicio date,
  data_fim date,
  data_sugerida boolean NOT NULL DEFAULT false,
  valor_combinado numeric CHECK (valor_combinado IS NULL OR valor_combinado >= 0),
  horas_combinadas numeric CHECK (horas_combinadas IS NULL OR horas_combinadas >= 0),
  observacoes text,
  motivo_encerramento text,
  encerrado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio)
);
CREATE UNIQUE INDEX IF NOT EXISTS cliente_planos_um_aberto ON public.cliente_planos(cliente_corp_id) WHERE status <> 'encerrado';
CREATE INDEX IF NOT EXISTS cliente_planos_plano_idx ON public.cliente_planos(plano_id);

CREATE TABLE IF NOT EXISTS public.cliente_plano_eventos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contrato_id text REFERENCES public.cliente_planos(id) ON DELETE CASCADE,
  cliente_corp_id text NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  acao text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS cliente_plano_eventos_cliente_idx ON public.cliente_plano_eventos(cliente_corp_id, created_at DESC);

ALTER TABLE public.cliente_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_plano_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.cliente_planos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY client_read ON public.cliente_planos FOR SELECT TO authenticated USING (public.is_own_client(cliente_corp_id));
CREATE POLICY admin_manage ON public.cliente_plano_eventos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY client_read ON public.cliente_plano_eventos FOR SELECT TO authenticated USING (public.is_own_client(cliente_corp_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_planos, public.cliente_plano_eventos TO authenticated;
GRANT ALL ON public.cliente_planos, public.cliente_plano_eventos TO service_role;

-- Mantém clientes_corp.plano_id (usado pelas telas atuais) igual ao contrato em aberto e grava o histórico.
CREATE OR REPLACE FUNCTION public.sync_cliente_plano()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.status = 'encerrado' AND OLD.status <> 'encerrado' THEN
    NEW.encerrado_em := coalesce(NEW.encerrado_em, now());
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_cliente_plano_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_acao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := CASE NEW.status WHEN 'a_revisar' THEN 'importado_para_revisao' ELSE 'contratado' END;
  ELSIF NEW.status = 'encerrado' AND OLD.status <> 'encerrado' THEN
    v_acao := 'encerrado';
  ELSIF OLD.status = 'a_revisar' AND NEW.status = 'ativo' THEN
    v_acao := 'revisado';
  ELSE
    v_acao := 'alterado';
  END IF;

  INSERT INTO public.cliente_plano_eventos (contrato_id, cliente_corp_id, acao, detalhes)
  VALUES (NEW.id, NEW.cliente_corp_id, v_acao, jsonb_strip_nulls(jsonb_build_object(
    'plano_id', NEW.plano_id,
    'plano_nome', (SELECT nome FROM public.planos WHERE id = NEW.plano_id),
    'status', NEW.status,
    'data_inicio', NEW.data_inicio,
    'data_fim', NEW.data_fim,
    'valor_combinado', NEW.valor_combinado,
    'horas_combinadas', NEW.horas_combinadas,
    'motivo', NEW.motivo_encerramento,
    'anterior', CASE WHEN TG_OP = 'UPDATE' THEN jsonb_strip_nulls(jsonb_build_object(
      'plano_id', OLD.plano_id, 'status', OLD.status, 'data_inicio', OLD.data_inicio, 'data_fim', OLD.data_fim,
      'valor_combinado', OLD.valor_combinado, 'horas_combinadas', OLD.horas_combinadas)) END
  )));

  UPDATE public.clientes_corp c
  SET plano_id = (SELECT cp.plano_id FROM public.cliente_planos cp
                  WHERE cp.cliente_corp_id = NEW.cliente_corp_id AND cp.status <> 'encerrado' LIMIT 1)
  WHERE c.id = NEW.cliente_corp_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS cliente_planos_sync ON public.cliente_planos;
CREATE TRIGGER cliente_planos_sync BEFORE INSERT OR UPDATE ON public.cliente_planos
  FOR EACH ROW EXECUTE FUNCTION public.sync_cliente_plano();
DROP TRIGGER IF EXISTS cliente_planos_sync_after ON public.cliente_planos;
CREATE TRIGGER cliente_planos_sync_after AFTER INSERT OR UPDATE ON public.cliente_planos
  FOR EACH ROW EXECUTE FUNCTION public.sync_cliente_plano_after();

-- Clientes atuais com plano: contrato "a revisar" com data de início sugerida
-- (primeira reserva do cliente; se não houver, a data do cadastro). Não vence nem bloqueia.
INSERT INTO public.cliente_planos (cliente_corp_id, plano_id, status, data_inicio, data_fim, data_sugerida, valor_combinado, observacoes)
SELECT c.id, c.plano_id, 'a_revisar', s.inicio,
  CASE WHEN p.duracao_meses IS NOT NULL THEN (s.inicio + make_interval(months => p.duracao_meses) - interval '1 day')::date END,
  true, p.preco,
  'Importado automaticamente: confirme o plano e a data de início.'
FROM public.clientes_corp c
JOIN public.planos p ON p.id = c.plano_id
CROSS JOIN LATERAL (
  SELECT coalesce((SELECT min(r.data::date) FROM public.reservations r WHERE r.cliente_corp_id = c.id), c.created_at::timestamptz::date) AS inicio
) s
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.cliente_planos x WHERE x.cliente_corp_id = c.id);

-- 4. Banco de horas -----------------------------------------------------------------------------
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS tipo_cobranca text;
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_tipo_cobranca_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_tipo_cobranca_check
  CHECK (tipo_cobranca IS NULL OR tipo_cobranca IN ('plano','estacao','adicional','avulso'));

-- Horas de uma reserva que consumiram o plano. Reservas antigas (sem tipo_cobranca) ligadas a um
-- plano contam pelas horas reservadas menos as excedentes, sem alterar o registro.
CREATE OR REPLACE FUNCTION public.reserva_horas_plano(r public.reservations)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN r.tipo_cobranca IN ('plano','adicional','avulso') THEN coalesce(r.horas_cobertas_plano, 0)
    WHEN r.tipo_cobranca IS NULL AND r.plano_id IS NOT NULL THEN greatest(0,
      coalesce(nullif(r.horas_reservadas, 0), extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600)
      - coalesce(r.horas_excedentes, 0))
    ELSE 0
  END
$$;

-- Calcula quanto de uma reserva o plano do cliente cobre, seguindo as regras de cada plano.
-- p_extra: horas já separadas na mesma simulação, por início da janela ({"2026-10-26": 1}).
CREATE OR REPLACE FUNCTION public.plano_cobertura(
  p_cliente_corp_id text,
  p_data date,
  p_horas numeric DEFAULT 0,
  p_sala_id text DEFAULT NULL,
  p_hora_inicio time DEFAULT NULL,
  p_ignorar_reserva text DEFAULT NULL,
  p_extra jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
      -- Mesma regra usada até hoje: horas de reservas confirmadas/realizadas no mês.
      SELECT coalesce(sum(CASE
               WHEN r.tipo_cobranca IS NOT NULL THEN public.reserva_horas_plano(r)
               WHEN r.status IN ('confirmada','realizada') THEN extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600
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
    'excedentes', round(greatest(0, v_horas - v_cobertas), 2),
    'estacao', v_estacao,
    'sala_fora_do_plano', v_sala_fora,
    'permite_adicional', v_status IN ('ativo','a_revisar') AND coalesce(p.preco_hora_adicional, 0) > 0,
    'preco_adicional', p.preco_hora_adicional,
    'preco_avulso', v_preco_avulso,
    'motivo', v_motivo
  );
END $$;

REVOKE ALL ON FUNCTION public.plano_cobertura(text, date, numeric, text, time, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plano_cobertura(text, date, numeric, text, time, text, jsonb) TO authenticated, service_role;

-- Simula uma lista de períodos em ordem, separando as horas do plano entre eles (não grava nada).
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
    v_out := v_out || jsonb_build_array(v_cov || jsonb_build_object('data', v_item->>'data', 'hora_inicio', v_item->>'hora_inicio', 'hora_fim', v_item->>'hora_fim'));
  END LOOP;
  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public.plano_simular(text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plano_simular(text, jsonb, text) TO authenticated, service_role;

-- Resumo do plano para o painel do cliente e para o admin, com avisos.
CREATE OR REPLACE FUNCTION public.cliente_plano_resumo(p_cliente_corp_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_cov jsonb;
  v_avisos jsonb := '[]'::jsonb;
  v_status text;
  v_regra text;
  v_cota numeric;
  v_saldo numeric;
  v_dias integer;
BEGIN
  v_cov := public.plano_cobertura(p_cliente_corp_id, current_date, 0, NULL, NULL, NULL, '{}'::jsonb);
  v_status := v_cov->>'status';
  v_regra := v_cov->>'regra';
  v_cota := coalesce((v_cov->>'cota')::numeric, 0);
  v_saldo := coalesce((v_cov->>'saldo')::numeric, 0);
  v_dias := (v_cov->>'dias_restantes')::integer;

  IF v_status = 'vencido' THEN
    v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'plano_vencido', 'nivel', 'erro',
      'mensagem', 'Seu plano venceu. Novas reservas são cobradas como avulso até a renovação.'));
  ELSIF v_status = 'ativo' THEN
    IF v_dias IS NOT NULL AND v_dias BETWEEN 0 AND 7 THEN
      v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'contrato_vence_7', 'nivel', 'alerta',
        'mensagem', format('Seu contrato vence em %s dia(s).', v_dias)));
    ELSIF v_dias IS NOT NULL AND v_dias BETWEEN 8 AND 15 THEN
      v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'contrato_vence_15', 'nivel', 'info',
        'mensagem', format('Seu contrato vence em %s dias.', v_dias)));
    END IF;
    IF v_cota > 0 AND v_saldo = 0 THEN
      v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', CASE WHEN v_regra = 'semanal' THEN 'cota_semana_usada' ELSE 'horas_esgotadas' END,
        'nivel', 'alerta',
        'mensagem', CASE WHEN v_regra = 'semanal' THEN 'Você já usou a cota desta semana. Novas horas: adicional ou avulso.'
                         WHEN v_regra = 'pacote' THEN 'Suas horas do pacote acabaram. Novas horas são cobradas como avulso.'
                         ELSE 'Você já usou as horas de reunião deste mês.' END));
    ELSIF v_cota > 0 AND v_saldo <= v_cota * 0.25 THEN
      v_avisos := v_avisos || jsonb_build_array(jsonb_build_object('tipo', 'horas_acabando', 'nivel', 'info',
        'mensagem', format('Restam %sh do seu plano neste período.', trim(to_char(v_saldo, 'FM999990.##')))));
    END IF;
  END IF;

  RETURN v_cov || jsonb_build_object('avisos', v_avisos);
END $$;

REVOKE ALL ON FUNCTION public.cliente_plano_resumo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_plano_resumo(text) TO authenticated, service_role;

-- Visão de todos os clientes para o admin (uso dos planos, alertas e fila de revisão).
CREATE OR REPLACE FUNCTION public.admin_planos_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501';
  END IF;
  FOR r IN
    SELECT c.id, c.numero_cadastro, coalesce(nullif(c.razao_social, ''), c.responsavel_nome) AS nome,
           c.responsavel_email, c.unidade_id, u.nome AS unidade_nome
    FROM public.clientes_corp c
    LEFT JOIN public.unidades u ON u.id = c.unidade_id
    WHERE c.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM public.cliente_planos cp WHERE cp.cliente_corp_id = c.id AND cp.status <> 'encerrado')
    ORDER BY c.numero_cadastro
  LOOP
    v_out := v_out || jsonb_build_array(public.cliente_plano_resumo(r.id) || jsonb_build_object(
      'cliente_corp_id', r.id, 'numero_cadastro', r.numero_cadastro, 'nome', r.nome,
      'email', r.responsavel_email, 'unidade_id', r.unidade_id, 'unidade_nome', r.unidade_nome));
  END LOOP;
  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public.admin_planos_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_planos_overview() TO authenticated;

-- Ações do admin sobre o contrato (cada uma é aplicada inteira ou desfeita).
CREATE OR REPLACE FUNCTION public.admin_salvar_contrato(
  p_cliente_corp_id text,
  p_plano_id text,
  p_data_inicio date,
  p_data_fim date DEFAULT NULL,
  p_valor numeric DEFAULT NULL,
  p_horas numeric DEFAULT NULL,
  p_observacoes text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_atual public.cliente_planos%ROWTYPE;
  v_plano public.planos%ROWTYPE;
  v_fim date;
  v_id text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_plano FROM public.planos WHERE id = p_plano_id AND deleted_at IS NULL;
  IF v_plano.id IS NULL THEN RAISE EXCEPTION 'Escolha um plano válido.'; END IF;
  IF p_data_inicio IS NULL THEN RAISE EXCEPTION 'Informe a data de início.'; END IF;
  v_fim := coalesce(p_data_fim, CASE WHEN v_plano.duracao_meses IS NOT NULL
    THEN (p_data_inicio + make_interval(months => v_plano.duracao_meses) - interval '1 day')::date END);
  IF v_fim IS NOT NULL AND v_fim < p_data_inicio THEN RAISE EXCEPTION 'O vencimento deve ser depois do início.'; END IF;

  SELECT * INTO v_atual FROM public.cliente_planos
  WHERE cliente_corp_id = p_cliente_corp_id AND status <> 'encerrado' LIMIT 1 FOR UPDATE;

  IF v_atual.id IS NOT NULL AND (v_atual.status = 'a_revisar' OR v_atual.plano_id = p_plano_id) THEN
    -- Revisão do contrato importado ou ajuste do contrato atual.
    UPDATE public.cliente_planos SET
      plano_id = p_plano_id, status = 'ativo', data_inicio = p_data_inicio, data_fim = v_fim, data_sugerida = false,
      valor_combinado = coalesce(p_valor, v_plano.preco), horas_combinadas = p_horas,
      observacoes = coalesce(p_observacoes, observacoes)
    WHERE id = v_atual.id
    RETURNING id INTO v_id;
  ELSE
    -- Troca de plano: encerra o atual e abre um novo.
    IF v_atual.id IS NOT NULL THEN
      UPDATE public.cliente_planos SET status = 'encerrado', motivo_encerramento = 'Troca de plano'
      WHERE id = v_atual.id;
    END IF;
    INSERT INTO public.cliente_planos (cliente_corp_id, plano_id, status, data_inicio, data_fim, valor_combinado, horas_combinadas, observacoes)
    VALUES (p_cliente_corp_id, p_plano_id, 'ativo', p_data_inicio, v_fim, coalesce(p_valor, v_plano.preco), p_horas, p_observacoes)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_renovar_contrato(p_contrato_id text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_atual public.cliente_planos%ROWTYPE;
  v_plano public.planos%ROWTYPE;
  v_inicio date;
  v_id text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_atual FROM public.cliente_planos WHERE id = p_contrato_id AND status <> 'encerrado' FOR UPDATE;
  IF v_atual.id IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado ou já encerrado.'; END IF;
  SELECT * INTO v_plano FROM public.planos WHERE id = v_atual.plano_id;
  -- Novo período começa no dia seguinte ao vencimento (ou hoje, se já venceu há mais tempo).
  v_inicio := CASE WHEN v_atual.data_fim IS NULL OR v_atual.data_fim < current_date THEN current_date ELSE v_atual.data_fim + 1 END;
  UPDATE public.cliente_planos SET status = 'encerrado', motivo_encerramento = 'Renovado' WHERE id = v_atual.id;
  INSERT INTO public.cliente_planos (cliente_corp_id, plano_id, status, data_inicio, data_fim, valor_combinado, horas_combinadas, observacoes)
  VALUES (v_atual.cliente_corp_id, v_atual.plano_id, 'ativo', v_inicio,
    CASE WHEN v_plano.duracao_meses IS NOT NULL THEN (v_inicio + make_interval(months => v_plano.duracao_meses) - interval '1 day')::date END,
    v_atual.valor_combinado, v_atual.horas_combinadas, 'Renovação')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_encerrar_contrato(p_contrato_id text, p_motivo text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;
  UPDATE public.cliente_planos SET status = 'encerrado', motivo_encerramento = coalesce(nullif(btrim(p_motivo), ''), 'Encerrado pelo admin')
  WHERE id = p_contrato_id AND status <> 'encerrado';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado ou já encerrado.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_salvar_contrato(text, text, date, date, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_salvar_contrato(text, text, date, date, numeric, numeric, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_renovar_contrato(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_renovar_contrato(text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_encerrar_contrato(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_encerrar_contrato(text, text) TO authenticated;

-- 5. Solicitação de reserva pelo painel com banco de horas (Plano / Adicional / Avulso).
DROP FUNCTION IF EXISTS public.request_authenticated_reservations(jsonb, text);
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
    v_horas := extract(epoch FROM (v_fim - v_inicio)) / 3600;
    -- Reservas anteriores deste mesmo pedido já foram gravadas e entram no consumo.
    v_cov := public.plano_cobertura(v_cliente.id, v_data, v_horas, p_sala_id, v_inicio, NULL, '{}'::jsonb);
    v_cob := (v_cov->>'cobertas')::numeric;
    v_exc := (v_cov->>'excedentes')::numeric;
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

REVOKE ALL ON FUNCTION public.request_authenticated_reservations(jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(jsonb, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
