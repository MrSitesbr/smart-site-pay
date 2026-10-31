-- Cards de planos do cliente (admin e painel): cada contrato com horas contratadas no período,
-- horas usadas e o extrato de reservas que consumiram o plano. Somente leitura.
-- Contratos "a revisar" seguem a regra anterior: contam as reservas confirmadas/realizadas.
CREATE OR REPLACE FUNCTION public.cliente_plano_cards(p_cliente_corp_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_out jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_own_client(p_cliente_corp_id) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  WITH contratos AS (
    SELECT cp.*, p.nome AS plano_nome, p.categoria, p.regra_uso, p.cobranca, p.preco, p.horas_semana,
           p.horas_reuniao_mes, p.quantidade_horas, p.horas_incluidas, p.bloco_unico, p.preco_hora_adicional,
           -- Fim efetivo do período: vencimento, encerramento ou hoje (contratos sem prazo).
           least(coalesce(cp.data_fim, current_date), coalesce(cp.encerrado_em::date, cp.data_fim, current_date)) AS fim_efetivo
    FROM public.cliente_planos cp
    JOIN public.planos p ON p.id = cp.plano_id
    WHERE cp.cliente_corp_id = p_cliente_corp_id
  ), base AS (
    SELECT c.*,
      CASE
        WHEN c.status = 'a_revisar' THEN NULL
        WHEN c.regra_uso = 'semanal' THEN coalesce(c.horas_combinadas, c.horas_semana, 0)
          * greatest(1, ceil(((coalesce(c.data_fim, c.fim_efetivo) - coalesce(c.data_inicio, c.fim_efetivo)) + 1) / 7.0))
        WHEN c.regra_uso = 'mensal_reuniao' THEN coalesce(c.horas_combinadas, c.horas_reuniao_mes, 0)
          * greatest(1, (extract(year FROM age(date_trunc('month', coalesce(c.data_fim, c.fim_efetivo)), date_trunc('month', coalesce(c.data_inicio, c.fim_efetivo)))) * 12
                        + extract(month FROM age(date_trunc('month', coalesce(c.data_fim, c.fim_efetivo)), date_trunc('month', coalesce(c.data_inicio, c.fim_efetivo)))) + 1)::int)
        WHEN c.regra_uso = 'pacote' THEN coalesce(c.horas_combinadas, c.quantidade_horas, 0)
        ELSE 0
      END AS horas_periodo
    FROM contratos c
  )
  SELECT coalesce(jsonb_agg(card ORDER BY ordem, criado DESC), '[]'::jsonb) INTO v_out
  FROM (
    SELECT
      CASE WHEN b.status = 'encerrado' OR (b.status = 'ativo' AND b.data_fim < current_date) THEN 1 ELSE 0 END AS ordem,
      b.created_at AS criado,
      jsonb_build_object(
        'id', b.id,
        'status', CASE WHEN b.status = 'ativo' AND b.data_fim < current_date THEN 'vencido' ELSE b.status END,
        'vigente', b.status <> 'encerrado' AND NOT (b.status = 'ativo' AND b.data_fim < current_date),
        'plano_id', b.plano_id,
        'plano_nome', b.plano_nome,
        'categoria', b.categoria,
        'regra', CASE WHEN b.status = 'a_revisar' THEN 'legado' ELSE b.regra_uso END,
        'cobranca', b.cobranca,
        'valor', coalesce(b.valor_combinado, b.preco),
        'preco_hora_adicional', b.preco_hora_adicional,
        'data_inicio', b.data_inicio,
        'data_fim', b.data_fim,
        'encerrado_em', b.encerrado_em,
        'motivo_encerramento', b.motivo_encerramento,
        'horas_periodo', b.horas_periodo,
        'horas_usadas', coalesce(u.usadas, 0),
        'horas_extras', coalesce(u.extras, 0),
        'extrato', coalesce(u.extrato, '[]'::jsonb)
      ) AS card
    FROM base b
    LEFT JOIN LATERAL (
      SELECT
        round(sum((CASE WHEN b.status = 'a_revisar' AND r.tipo_cobranca IS NULL THEN CASE WHEN r.status IN ('confirmada','realizada') THEN extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600 ELSE 0 END ELSE public.reserva_horas_plano(r) END)), 2) AS usadas,
        round(sum(CASE WHEN r.tipo_cobranca IN ('adicional','avulso') THEN coalesce(r.horas_excedentes, 0) ELSE 0 END), 2) AS extras,
        jsonb_agg(jsonb_build_object(
          'id', r.id, 'data', r.data, 'hora_inicio', left(r.hora_inicio, 5), 'hora_fim', left(r.hora_fim, 5),
          'sala', s.nome, 'status', r.status, 'tipo_cobranca', r.tipo_cobranca,
          'horas_plano', round((CASE WHEN b.status = 'a_revisar' AND r.tipo_cobranca IS NULL THEN CASE WHEN r.status IN ('confirmada','realizada') THEN extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600 ELSE 0 END ELSE public.reserva_horas_plano(r) END), 2),
          'horas_extras', CASE WHEN r.tipo_cobranca IN ('adicional','avulso') THEN coalesce(r.horas_excedentes, 0) ELSE 0 END,
          'valor', nullif(r.valor, '')
        ) ORDER BY r.data, r.hora_inicio) AS extrato
      FROM public.reservations r
      LEFT JOIN public.salas s ON s.id = r.sala_id
      WHERE r.cliente_corp_id = p_cliente_corp_id
        AND coalesce(r.status, '') <> 'cancelada'
        AND b.data_inicio IS NOT NULL
        AND r.data::date BETWEEN b.data_inicio AND greatest(b.fim_efetivo, coalesce(b.data_fim, b.fim_efetivo))
        AND ((CASE WHEN b.status = 'a_revisar' AND r.tipo_cobranca IS NULL THEN CASE WHEN r.status IN ('confirmada','realizada') THEN extract(epoch FROM (r.hora_fim::time - r.hora_inicio::time)) / 3600 ELSE 0 END ELSE public.reserva_horas_plano(r) END) > 0 OR r.tipo_cobranca IN ('adicional','avulso'))
    ) u ON true
  ) x;

  RETURN v_out;
END $$;

REVOKE ALL ON FUNCTION public.cliente_plano_cards(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_plano_cards(text) TO authenticated, service_role;
