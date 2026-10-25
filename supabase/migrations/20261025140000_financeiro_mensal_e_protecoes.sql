-- Etapa 6: controle financeiro manual (mensalidades, pacotes, horas adicionais e avulsas)
-- e correções de segurança/tabelas ausentes encontradas na revisão. Só acrescenta.

-- 1. Cobranças ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_corp_id text NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  contrato_id text REFERENCES public.cliente_planos(id) ON DELETE SET NULL,
  reservation_id text REFERENCES public.reservations(id) ON DELETE SET NULL,
  competencia date NOT NULL CHECK (competencia = date_trunc('month', competencia)::date),
  tipo text NOT NULL CHECK (tipo IN ('mensalidade','pacote','adicional','avulso','outro')),
  descricao text,
  valor numeric NOT NULL CHECK (valor >= 0),
  vencimento date,
  status text NOT NULL DEFAULT 'a_receber' CHECK (status IN ('a_receber','pago','cancelado')),
  pago_em date,
  forma_pagamento text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
-- Impede dois lançamentos do mesmo contrato no mesmo mês e duas cobranças da mesma reserva.
CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_contrato_mes_key ON public.cobrancas(contrato_id, competencia)
  WHERE contrato_id IS NOT NULL AND tipo IN ('mensalidade','pacote') AND status <> 'cancelado';
CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_reserva_key ON public.cobrancas(reservation_id)
  WHERE reservation_id IS NOT NULL AND status <> 'cancelado';
CREATE INDEX IF NOT EXISTS cobrancas_competencia_idx ON public.cobrancas(competencia);
CREATE INDEX IF NOT EXISTS cobrancas_cliente_idx ON public.cobrancas(cliente_corp_id);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.cobrancas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY client_read ON public.cobrancas FOR SELECT TO authenticated USING (public.is_own_client(cliente_corp_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas TO authenticated;
GRANT ALL ON public.cobrancas TO service_role;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cobrancas_touch ON public.cobrancas;
CREATE TRIGGER cobrancas_touch BEFORE UPDATE ON public.cobrancas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Gera os lançamentos de um mês: mensalidades dos contratos vigentes, pacotes no mês de início
-- e horas adicionais/avulsas das reservas do mês. Pode ser executada várias vezes sem duplicar.
CREATE OR REPLACE FUNCTION public.admin_gerar_cobrancas(p_competencia date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_mes date := date_trunc('month', p_competencia)::date;
  v_fim date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
  v_mensal integer := 0;
  v_pacote integer := 0;
  v_reservas integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores.' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.cobrancas (cliente_corp_id, contrato_id, competencia, tipo, descricao, valor, vencimento)
  SELECT cp.cliente_corp_id, cp.id, v_mes, 'mensalidade',
    'Mensalidade ' || p.nome || ' — ' || to_char(v_mes, 'MM/YYYY'),
    coalesce(cp.valor_combinado, p.preco, 0),
    make_date(extract(year FROM v_mes)::int, extract(month FROM v_mes)::int,
      least(coalesce(extract(day FROM cp.data_inicio)::int, 10), extract(day FROM v_fim)::int))
  FROM public.cliente_planos cp
  JOIN public.planos p ON p.id = cp.plano_id
  JOIN public.clientes_corp c ON c.id = cp.cliente_corp_id AND c.deleted_at IS NULL
  WHERE cp.status IN ('ativo','a_revisar')
    AND coalesce(p.cobranca, 'mensal') = 'mensal'
    AND coalesce(p.regra_uso, '') <> 'avulso'
    AND coalesce(cp.valor_combinado, p.preco, 0) > 0
    AND (cp.data_inicio IS NULL OR cp.data_inicio <= v_fim)
    AND (cp.data_fim IS NULL OR cp.data_fim >= v_mes)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_mensal = ROW_COUNT;

  INSERT INTO public.cobrancas (cliente_corp_id, contrato_id, competencia, tipo, descricao, valor, vencimento)
  SELECT cp.cliente_corp_id, cp.id, v_mes, 'pacote', 'Pacote ' || p.nome, coalesce(cp.valor_combinado, p.preco, 0), cp.data_inicio
  FROM public.cliente_planos cp
  JOIN public.planos p ON p.id = cp.plano_id
  JOIN public.clientes_corp c ON c.id = cp.cliente_corp_id AND c.deleted_at IS NULL
  WHERE cp.status IN ('ativo','a_revisar')
    AND p.cobranca = 'unico'
    AND cp.data_inicio BETWEEN v_mes AND v_fim
    AND coalesce(cp.valor_combinado, p.preco, 0) > 0
    AND NOT EXISTS (SELECT 1 FROM public.cobrancas x WHERE x.contrato_id = cp.id AND x.tipo = 'pacote' AND x.status <> 'cancelado')
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_pacote = ROW_COUNT;

  INSERT INTO public.cobrancas (cliente_corp_id, reservation_id, competencia, tipo, descricao, valor, vencimento)
  SELECT r.cliente_corp_id, r.id, v_mes, r.tipo_cobranca,
    CASE WHEN r.tipo_cobranca = 'adicional' THEN 'Hora adicional' ELSE 'Hora avulsa' END
      || ' — ' || to_char(r.data::date, 'DD/MM') || ' ' || left(r.hora_inicio, 5) || '–' || left(r.hora_fim, 5),
    nullif(r.valor, '')::numeric, r.data::date
  FROM public.reservations r
  WHERE r.cliente_corp_id IS NOT NULL
    AND r.tipo_cobranca IN ('adicional','avulso')
    AND coalesce(r.status, '') <> 'cancelada'
    AND r.data::date BETWEEN v_mes AND v_fim
    AND coalesce(nullif(r.valor, '')::numeric, 0) > 0
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_reservas = ROW_COUNT;

  RETURN jsonb_build_object('mensalidades', v_mensal, 'pacotes', v_pacote, 'reservas', v_reservas);
END $$;

REVOKE ALL ON FUNCTION public.admin_gerar_cobrancas(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_gerar_cobrancas(date) TO authenticated;

-- 2. O cliente edita os próprios dados, mas não plano, liberação, vínculo ou exclusão.
CREATE OR REPLACE FUNCTION public.protect_clientes_corp_admin_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.plano_id := OLD.plano_id;
    NEW.status_acesso := OLD.status_acesso;
    NEW.user_id := OLD.user_id;
    NEW.deleted_at := OLD.deleted_at;
    NEW.unidade_id := OLD.unidade_id;
    NEW.sala_id := OLD.sala_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clientes_corp_protect_admin_fields ON public.clientes_corp;
CREATE TRIGGER clientes_corp_protect_admin_fields BEFORE UPDATE ON public.clientes_corp
  FOR EACH ROW EXECUTE FUNCTION public.protect_clientes_corp_admin_fields();

-- 3. Tabelas usadas pelo admin que não existiam no banco.
CREATE TABLE IF NOT EXISTS public.woba_closings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  nivel_repasse numeric,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_repasse numeric NOT NULL DEFAULT 0,
  qtd_reservas integer NOT NULL DEFAULT 0,
  data_prevista date,
  data_pagamento date,
  status text NOT NULL DEFAULT 'a_receber',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, mes)
);
ALTER TABLE public.woba_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.woba_closings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woba_closings TO authenticated;
GRANT ALL ON public.woba_closings TO service_role;
DROP TRIGGER IF EXISTS woba_closings_touch ON public.woba_closings;
CREATE TRIGGER woba_closings_touch BEFORE UPDATE ON public.woba_closings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.waiting_list (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
  cliente_id text REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  min_metragem numeric,
  needs_window boolean NOT NULL DEFAULT false,
  needs_lavatory boolean NOT NULL DEFAULT false,
  outros_requisitos text,
  priority integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'aguardando',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.waiting_list FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waiting_list TO authenticated;
GRANT ALL ON public.waiting_list TO service_role;

NOTIFY pgrst, 'reload schema';
