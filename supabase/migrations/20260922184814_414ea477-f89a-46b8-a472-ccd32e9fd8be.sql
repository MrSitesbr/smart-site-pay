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
  p_preco_avulso numeric,
  p_planos uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_categoria text;
  v_tipo_locacao text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem salvar salas.' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(coalesce(p_nome, ''))) < 2 THEN RAISE EXCEPTION 'Informe o nome da sala.'; END IF;
  IF p_unidade_id IS NULL THEN RAISE EXCEPTION 'Selecione a unidade da sala.'; END IF;
  IF coalesce(cardinality(p_categorias), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos uma categoria.'; END IF;
  IF coalesce(cardinality(p_modalidades), 0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos uma modalidade.'; END IF;
  IF NOT (p_categorias <@ ARRAY['privativa','compartilhado','consultorio_poltrona','consultorio_maca']::text[]) THEN RAISE EXCEPTION 'Existe uma categoria inválida.'; END IF;
  IF NOT (p_modalidades <@ ARRAY['avulso','mensal']::text[]) THEN RAISE EXCEPTION 'Existe uma modalidade inválida.'; END IF;

  v_categoria := p_categorias[1];
  v_tipo_locacao := CASE
    WHEN 'mensal' = ANY(p_modalidades) AND 'avulso' = ANY(p_modalidades) THEN 'locacao_periodo'
    WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_periodo'
    ELSE 'locacao_mensal'
  END;

  IF p_id IS NULL THEN
    INSERT INTO public.salas (
      unidade_id, nome, tipo, categoria, categorias, tipo_locacao, subtipo_periodo,
      modalidades_locacao, capacidade, descricao, foto_url, galeria, status, metadata,
      preco_locacao_mensal, preco_periodo_pacote_mensal, preco_periodo_locacao_avulsa
    ) VALUES (
      p_unidade_id, btrim(p_nome), p_tipo, v_categoria, p_categorias, v_tipo_locacao,
      CASE WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_avulsa' ELSE NULL END,
      p_modalidades, p_capacidade, nullif(btrim(coalesce(p_descricao, '')), ''),
      nullif(p_foto_url, ''), coalesce(p_galeria, '{}'::text[]), p_status,
      coalesce(p_metadata, '{}'::jsonb), CASE WHEN 'mensal' = ANY(p_modalidades) THEN p_preco_mensal ELSE NULL END,
      NULL, CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_avulso ELSE NULL END
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.salas SET
      unidade_id = p_unidade_id, nome = btrim(p_nome), tipo = p_tipo,
      categoria = v_categoria, categorias = p_categorias, tipo_locacao = v_tipo_locacao,
      subtipo_periodo = CASE WHEN 'avulso' = ANY(p_modalidades) THEN 'locacao_avulsa' ELSE NULL END,
      modalidades_locacao = p_modalidades, capacidade = p_capacidade,
      descricao = nullif(btrim(coalesce(p_descricao, '')), ''), foto_url = nullif(p_foto_url, ''),
      galeria = coalesce(p_galeria, '{}'::text[]), status = p_status,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      preco_locacao_mensal = CASE WHEN 'mensal' = ANY(p_modalidades) THEN p_preco_mensal ELSE NULL END,
      preco_periodo_pacote_mensal = NULL,
      preco_periodo_locacao_avulsa = CASE WHEN 'avulso' = ANY(p_modalidades) THEN p_preco_avulso ELSE NULL END
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Sala não encontrada.'; END IF;
  END IF;

  DELETE FROM public.sala_planos WHERE sala_id = v_id;
  INSERT INTO public.sala_planos(sala_id, plano_id)
  SELECT v_id, plano_id FROM unnest(coalesce(p_planos, '{}'::uuid[])) AS plano_id
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_admin_room(uuid, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_room(uuid, uuid, text, text, text[], text[], integer, text, text, text[], text, jsonb, numeric, numeric, uuid[]) TO authenticated;

DROP POLICY IF EXISTS "Bypass Mode" ON public.salas;
DROP POLICY IF EXISTS "Permissao Total Salas" ON public.salas;
DROP POLICY IF EXISTS "Bypass Mode" ON public.sala_planos;
DROP POLICY IF EXISTS "Bypass Mode" ON public.reservations;
DROP POLICY IF EXISTS "Bypass Mode" ON public.contract_requests;
DROP POLICY IF EXISTS "Permissao Total Contract Requests" ON public.contract_requests;
DROP POLICY IF EXISTS "Bypass Mode" ON public.clientes_corp;
DROP POLICY IF EXISTS "Bypass Mode" ON public.user_roles;