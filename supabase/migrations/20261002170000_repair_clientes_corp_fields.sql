CREATE OR REPLACE FUNCTION public._clientes_corp_documentos_json_to_array(value text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL THEN NULL
    ELSE ARRAY(
      SELECT item
      FROM jsonb_array_elements_text(value::jsonb) AS items(item)
    )
  END;
$$;

ALTER TABLE public.clientes_corp
  ALTER COLUMN documentos TYPE text[]
  USING public._clientes_corp_documentos_json_to_array(documentos);

DROP FUNCTION public._clientes_corp_documentos_json_to_array(text);

ALTER TABLE public.clientes_corp
  ALTER COLUMN created_at SET DEFAULT now()::text,
  ALTER COLUMN status_acesso SET DEFAULT 'pendente';

UPDATE public.clientes_corp
SET created_at = now()::text
WHERE created_at IS NULL;

UPDATE public.clientes_corp
SET status_acesso = 'aprovado'
WHERE status_acesso IS NULL;