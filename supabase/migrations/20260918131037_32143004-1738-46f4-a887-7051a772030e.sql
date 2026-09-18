CREATE OR REPLACE FUNCTION public.submit_public_consultation(
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_tipo_negocio text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF length(trim(coalesce(p_nome, ''))) < 2 THEN RAISE EXCEPTION 'Informe seu nome.'; END IF;
  IF trim(coalesce(p_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN RAISE EXCEPTION 'Informe um e-mail válido.'; END IF;
  IF length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'Informe um WhatsApp válido.'; END IF;
  IF length(trim(coalesce(p_tipo_negocio, ''))) < 2 THEN RAISE EXCEPTION 'Informe o tipo de negócio.'; END IF;

  INSERT INTO public.contract_requests (
    user_id, nome, email, telefone, ambiente, plano_tipo, preco,
    dias_selecionados, observacoes, status, nicho, origem
  ) VALUES (
    auth.uid(), trim(p_nome), lower(trim(p_email)), trim(p_whatsapp),
    'estacao'::public.ambiente_tipo, 'hora', 0,
    '[]'::jsonb, 'Consulta de disponibilidade pelo site.', 'pendente',
    trim(p_tipo_negocio), 'Consulta pelo site'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_consultation(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) TO anon, authenticated;