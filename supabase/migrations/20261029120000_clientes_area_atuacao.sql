-- Cadastro do cliente: área de atuação e descrição das atividades (pedido do coworking).
ALTER TABLE public.clientes_corp
  ADD COLUMN IF NOT EXISTS area_atuacao text CHECK (area_atuacao IS NULL OR length(area_atuacao) <= 120),
  ADD COLUMN IF NOT EXISTS descricao_atividades text CHECK (descricao_atividades IS NULL OR length(descricao_atividades) <= 2000);
NOTIFY pgrst, 'reload schema';
