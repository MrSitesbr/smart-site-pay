-- Unifica cadastro: a consulta de reserva passa a exigir cliente logado.
-- 1) Leads anônimos já gravados passam a ser vinculados ao cliente do mesmo e-mail.
-- 2) O pré-cadastro de lead para consulta deixa de existir para visitors anonimos.

-- Backfill: contract_requests sem user_id (leads do formulário público) são
-- vinculados ao clientes_corp que já existe com o mesmo e-mail.
UPDATE public.contract_requests AS cr
SET user_id = cc.user_id
FROM public.clientes_corp AS cc
WHERE cr.user_id IS NULL
  AND cc.user_id IS NOT NULL
  AND cr.email IS NOT NULL
  AND lower(trim(cr.email)) = lower(trim(cc.responsavel_email));

-- Registros que não têm cliente correspondente seguem como lead no funil
-- comercial (origem preservada) para a equipe tratar manualmente.

-- A consulta de reservas exige sessão: remove o acesso anônimo à RPC de lead.
REVOKE EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) TO authenticated;
