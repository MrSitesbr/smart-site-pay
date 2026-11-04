-- Horário de atendimento por dia da semana em cada unidade e recursos das salas (janela, ar, pia...).
-- Domingo começa fechado, mas o admin pode abrir; feriados nacionais continuam bloqueados.

-- 1. Horários por dia da semana ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unidade_horarios (
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1 = segunda ... 7 = domingo
  abre time NOT NULL DEFAULT time '08:00',
  fecha time NOT NULL DEFAULT time '21:00',
  fechado boolean NOT NULL DEFAULT false,
  PRIMARY KEY (unidade_id, dia_semana),
  CHECK (abre >= time '08:00' AND fecha <= time '23:00' AND abre < fecha),
  CHECK (extract(minute FROM abre)::int IN (0, 30) AND extract(minute FROM fecha)::int IN (0, 30))
);
ALTER TABLE public.unidade_horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.unidade_horarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_manage ON public.unidade_horarios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.unidade_horarios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unidade_horarios TO authenticated;
GRANT ALL ON public.unidade_horarios TO service_role;

-- Unidades atuais: segunda a sábado com o horário geral; domingo fechado.
INSERT INTO public.unidade_horarios (unidade_id, dia_semana, abre, fecha, fechado)
SELECT u.id, d, coalesce(u.horario_abertura, time '08:00'), coalesce(u.horario_fechamento, time '21:00'), d = 7
FROM public.unidades u CROSS JOIN generate_series(1, 7) d
ON CONFLICT DO NOTHING;

-- Unidades novas já nascem com os 7 dias.
CREATE OR REPLACE FUNCTION public.criar_horarios_unidade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.unidade_horarios (unidade_id, dia_semana, abre, fecha, fechado)
  SELECT NEW.id, d, coalesce(NEW.horario_abertura, time '08:00'), coalesce(NEW.horario_fechamento, time '21:00'), d = 7
  FROM generate_series(1, 7) d
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS unidades_criar_horarios ON public.unidades;
CREATE TRIGGER unidades_criar_horarios AFTER INSERT ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.criar_horarios_unidade();

-- Horário de uma unidade numa data (feriado nacional = fechado; sem cadastro = horário geral).
CREATE OR REPLACE FUNCTION public.unidade_horario_dia(p_unidade uuid, p_data date)
RETURNS TABLE(abre time, fecha time, fechado boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(uh.abre, u.horario_abertura, time '08:00'),
         coalesce(uh.fecha, u.horario_fechamento, time '21:00'),
         CASE WHEN to_char(p_data, 'MM-DD') IN ('01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25') THEN true
              ELSE coalesce(uh.fechado, extract(isodow FROM p_data) = 7) END
  FROM public.unidades u
  LEFT JOIN public.unidade_horarios uh ON uh.unidade_id = u.id AND uh.dia_semana = extract(isodow FROM p_data)::int
  WHERE u.id = p_unidade
$$;
GRANT EXECUTE ON FUNCTION public.unidade_horario_dia(uuid, date) TO anon, authenticated, service_role;

-- 2. Recursos das salas -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sala_recursos (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_]{2,40}$'),
  nome text NOT NULL CHECK (length(nome) BETWEEN 2 AND 60),
  icone text NOT NULL DEFAULT 'check',
  ordem integer NOT NULL DEFAULT 100,
  ativo boolean NOT NULL DEFAULT true,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sala_recursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.sala_recursos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY admin_manage ON public.sala_recursos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.sala_recursos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sala_recursos TO authenticated;
GRANT ALL ON public.sala_recursos TO service_role;

INSERT INTO public.sala_recursos (id, nome, icone, ordem, padrao) VALUES
  ('ar_condicionado', 'Ar-condicionado', 'snowflake', 10, true),
  ('wifi', 'Wi-Fi', 'wifi', 20, true),
  ('mesa', 'Mesa', 'table', 30, true),
  ('cadeira', 'Cadeira', 'armchair', 40, true),
  ('janela', 'Janela', 'app-window', 50, false),
  ('pia', 'Pia', 'droplets', 60, false),
  ('maca', 'Maca', 'bed', 70, false),
  ('poltrona', 'Poltrona', 'sofa', 80, false),
  ('tv_monitor', 'TV / monitor', 'monitor', 90, false),
  ('quadro_branco', 'Quadro branco', 'presentation', 100, false),
  ('banheiro_privativo', 'Banheiro privativo', 'bath', 110, false),
  ('acessibilidade', 'Acessibilidade', 'accessibility', 120, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.salas ADD COLUMN IF NOT EXISTS recursos text[] NOT NULL DEFAULT '{}';
-- Salas atuais: recursos padrão + o que já estava marcado (janela e lavatório/pia).
UPDATE public.salas s SET recursos = (
  SELECT array_agg(DISTINCT x) FROM unnest(
    ARRAY['ar_condicionado','wifi','mesa','cadeira']
    || CASE WHEN coalesce((s.metadata->>'tem_janela')::boolean, false) THEN ARRAY['janela'] ELSE '{}'::text[] END
    || CASE WHEN coalesce((s.metadata->>'tem_lavatorio')::boolean, false) THEN ARRAY['pia'] ELSE '{}'::text[] END
    || coalesce(s.recursos, '{}'::text[])
  ) x
)
WHERE coalesce(array_length(s.recursos, 1), 0) = 0;

DROP FUNCTION IF EXISTS public.save_admin_room(text, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, text[]);
CREATE OR REPLACE FUNCTION public.save_admin_room(p_id text, p_unidade_id uuid, p_nome text, p_tipo text, p_categorias text[], p_modalidades text[], p_capacidade integer, p_descricao text, p_foto_url text, p_galeria text[], p_status text, p_metadata jsonb, p_preco_mensal numeric, p_preco_hora numeric, p_preco_diaria numeric, p_planos text[], p_recursos text[] DEFAULT NULL::text[])
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id text;
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
    SELECT 1 FROM unnest(coalesce(p_planos, '{}'::text[])) AS selected(plano_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.planos p WHERE p.id = selected.plano_id AND p.deleted_at IS NULL
    )
  ) THEN RAISE EXCEPTION 'Existe um plano inválido ou inativo na seleção.'; END IF;

  v_categoria := p_categorias[1];
  v_tipo_locacao := CASE WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_periodo' ELSE 'locacao_mensal' END;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    INSERT INTO public.salas (
      unidade_id, nome, tipo, categoria, categorias, tipo_locacao, subtipo_periodo,
      modalidades_locacao, capacidade, descricao, foto_url, galeria, status, metadata,
      preco_locacao_mensal, preco_periodo_pacote_mensal, preco_periodo_locacao_avulsa,
      preco_hora_avulsa, preco_diaria, recursos
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
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_diaria ELSE NULL END,
      coalesce(p_recursos, (SELECT coalesce(array_agg(id ORDER BY ordem), '{}'::text[]) FROM public.sala_recursos WHERE padrao AND ativo))
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
      recursos = coalesce(p_recursos, recursos),
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
  INSERT INTO public.sala_planos (sala_id, plano_id)
  SELECT DISTINCT v_id, selected.plano_id FROM unnest(coalesce(p_planos, '{}'::text[])) AS selected(plano_id);

  RETURN v_id;
END;
$function$
;
REVOKE ALL ON FUNCTION public.save_admin_room(text, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_room(text, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, text[], text[]) TO authenticated;

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
$function$
;

NOTIFY pgrst, 'reload schema';
