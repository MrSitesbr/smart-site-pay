-- Etapa 0: restaura ligações entre tabelas, a função de salvar salas e as regras de acesso
-- perdidas na importação do banco. Nenhum dado é apagado: só tipos de colunas de referência
-- são alinhados (todos os valores atuais já são válidos) e chaves estrangeiras são recriadas.

-- 1. Verificação de papel usada pelas políticas, RPCs e Edge Functions.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_own_client(_cliente_corp_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes_corp
    WHERE id = _cliente_corp_id AND user_id = auth.uid()::text AND deleted_at IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_own_client(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_client(text) TO authenticated, service_role;

-- 2. Alinha o tipo das colunas de referência com a chave da tabela apontada.
ALTER TABLE public.clientes_corp ALTER COLUMN unidade_id TYPE uuid USING nullif(btrim(unidade_id), '')::uuid;
ALTER TABLE public.reservations ALTER COLUMN unidade_id TYPE uuid USING nullif(btrim(unidade_id), '')::uuid;
ALTER TABLE public.reservations ALTER COLUMN plano_id TYPE text USING plano_id::text;
ALTER TABLE public.planos ALTER COLUMN unidade_id TYPE uuid USING nullif(btrim(unidade_id), '')::uuid;
ALTER TABLE public.plano_unidades ALTER COLUMN unidade_id TYPE uuid USING nullif(btrim(unidade_id), '')::uuid;
ALTER TABLE public.navigation_items ALTER COLUMN menu_id TYPE uuid USING nullif(btrim(menu_id), '')::uuid;
ALTER TABLE public.navigation_items ALTER COLUMN parent_id TYPE uuid USING nullif(btrim(parent_id), '')::uuid;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.support_tickets;
ALTER TABLE public.support_tickets ALTER COLUMN cliente_corp_id TYPE text USING cliente_corp_id::text;

-- 3. Chaves estrangeiras (usadas pelo frontend para buscar dados relacionados).
ALTER TABLE public.clientes_corp
  ADD CONSTRAINT clientes_corp_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE SET NULL,
  ADD CONSTRAINT clientes_corp_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL,
  ADD CONSTRAINT clientes_corp_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON DELETE SET NULL;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE SET NULL,
  ADD CONSTRAINT reservations_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;
ALTER TABLE public.planos
  ADD CONSTRAINT planos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.plano_unidades
  ADD CONSTRAINT plano_unidades_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE CASCADE,
  ADD CONSTRAINT plano_unidades_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.sala_planos
  ADD CONSTRAINT sala_planos_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON DELETE CASCADE,
  ADD CONSTRAINT sala_planos_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE CASCADE;
ALTER TABLE public.navigation_items
  ADD CONSTRAINT navigation_items_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.navigation_menus(id) ON DELETE CASCADE,
  ADD CONSTRAINT navigation_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.navigation_items(id) ON DELETE CASCADE;
ALTER TABLE public.contratos_ativos
  ADD CONSTRAINT contratos_ativos_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  ADD CONSTRAINT contratos_ativos_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON DELETE SET NULL;
ALTER TABLE public.funcionarios_cliente
  ADD CONSTRAINT funcionarios_cliente_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE CASCADE;
ALTER TABLE public.plano_solicitacoes
  ADD CONSTRAINT plano_solicitacoes_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  ADD CONSTRAINT plano_solicitacoes_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;
ALTER TABLE public.cliente_documento
  ADD CONSTRAINT cliente_documento_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE CASCADE;
ALTER TABLE public.reservation_change_requests
  ADD CONSTRAINT reservation_change_requests_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_cliente_corp_id_fkey FOREIGN KEY (cliente_corp_id) REFERENCES public.clientes_corp(id) ON DELETE SET NULL;
ALTER TABLE public.site_pages
  ADD CONSTRAINT site_pages_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_unidade_id_idx ON public.reservations(unidade_id);
CREATE INDEX IF NOT EXISTS reservations_plano_id_idx ON public.reservations(plano_id);
CREATE INDEX IF NOT EXISTS reservations_cliente_corp_id_idx ON public.reservations(cliente_corp_id);
CREATE INDEX IF NOT EXISTS navigation_items_menu_id_idx ON public.navigation_items(menu_id);
CREATE INDEX IF NOT EXISTS sala_planos_sala_id_idx ON public.sala_planos(sala_id);

-- 4. Salvar sala pelo admin (função perdida no banco), com os tipos atuais das chaves.
CREATE OR REPLACE FUNCTION public.save_admin_room(
  p_id text,
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
  p_planos text[]
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
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
  INSERT INTO public.sala_planos (sala_id, plano_id)
  SELECT DISTINCT v_id, selected.plano_id FROM unnest(coalesce(p_planos, '{}'::text[])) AS selected(plano_id);

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_admin_room(text, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_room(text, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, numeric, text[]) TO authenticated;

-- 5. Solicitação de reserva pelo painel: grava a unidade com o tipo uuid da coluna.
CREATE OR REPLACE FUNCTION public.request_authenticated_reservations(p_periodos jsonb, p_sala_id text DEFAULT NULL::text)
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
BEGIN
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
    INSERT INTO public.reservations (
      id, nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
      status, origem, unidade_id, sala_id, cliente_corp_id, observacoes,
      created_at, updated_at, valor, valor_original, horas_reservadas,
      horas_cobertas_plano, horas_excedentes, calculo_justificativa
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
      now()::text, now()::text, '0', '0', extract(epoch FROM (v_fim - v_inicio)) / 3600,
      0, 0, 'Aguardando análise administrativa.'
    );
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN v_ids;
END;
$function$
;

-- 6. Regras de acesso.
DO $$
DECLARE
  t text;
BEGIN
  -- Catálogo e CMS: leitura pública, escrita só do admin.
  FOREACH t IN ARRAY ARRAY['planos','plano_unidades','sala_planos','salas','unidades','navigation_menus',
                           'navigation_items','media_library','servicos','site_pages','site_sections','site_articles']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS import_public_access ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_manage ON public.%I', t);
    EXECUTE format('CREATE POLICY public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY admin_manage ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;

  -- Dados internos: admin com acesso total (políticas do cliente abaixo).
  FOREACH t IN ARRAY ARRAY['app_settings','pendencias','client_colors','contract_requests','contratos_ativos',
                           'funcionarios_cliente','plano_solicitacoes','cliente_documento','support_tickets']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS import_public_access ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_manage ON public.%I', t);
    EXECUTE format('CREATE POLICY admin_manage ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- Leads e pedidos de contratação: formulário público cria; cliente vê os próprios.
CREATE POLICY contract_requests_public_insert ON public.contract_requests FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() IS NULL OR user_id = auth.uid()::text);
CREATE POLICY contract_requests_client_read ON public.contract_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- Painel do cliente: somente registros da própria empresa.
CREATE POLICY funcionarios_cliente_client_manage ON public.funcionarios_cliente FOR ALL TO authenticated
  USING (public.is_own_client(cliente_corp_id)) WITH CHECK (public.is_own_client(cliente_corp_id));
CREATE POLICY plano_solicitacoes_client_read ON public.plano_solicitacoes FOR SELECT TO authenticated
  USING (public.is_own_client(cliente_corp_id));
CREATE POLICY plano_solicitacoes_client_insert ON public.plano_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_own_client(cliente_corp_id));
CREATE POLICY contratos_ativos_client_read ON public.contratos_ativos FOR SELECT TO authenticated
  USING (public.is_own_client(cliente_corp_id));
CREATE POLICY cliente_documento_client_read ON public.cliente_documento FOR SELECT TO authenticated
  USING (public.is_own_client(cliente_corp_id) AND coalesce(visivel_cliente, 'true') <> 'false');
CREATE POLICY support_tickets_client_manage ON public.support_tickets FOR ALL TO authenticated
  USING (public.is_own_client(cliente_corp_id) OR user_id = auth.uid())
  WITH CHECK (public.is_own_client(cliente_corp_id) OR user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
