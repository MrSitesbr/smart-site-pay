-- Assistentes virtuais: visitante (site), cliente (painel) e admin (painel administrativo).
-- Configuração só o admin lê/edita; o navegador recebe apenas o que é público (nome, avatar, mensagem inicial).

CREATE TABLE IF NOT EXISTS public.chatbot_config (
  agente text PRIMARY KEY CHECK (agente IN ('visitante','cliente','admin')),
  ativo boolean NOT NULL DEFAULT false,
  nome text NOT NULL DEFAULT 'Assistente' CHECK (length(nome) BETWEEN 2 AND 40),
  avatar_url text CHECK (avatar_url IS NULL OR length(avatar_url) <= 200000),
  mensagem_inicial text NOT NULL DEFAULT 'Olá! Como posso ajudar?' CHECK (length(mensagem_inicial) <= 500),
  diretrizes text NOT NULL DEFAULT '' CHECK (length(diretrizes) <= 6000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);

-- Contatos de atendimento humano (só aparecem se preenchidos).
CREATE TABLE IF NOT EXISTS public.chatbot_contatos (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp text CHECK (whatsapp IS NULL OR length(whatsapp) <= 30),
  telefone text CHECK (telefone IS NULL OR length(telefone) <= 30),
  email text CHECK (email IS NULL OR length(email) <= 120),
  horario_atendimento text CHECK (horario_atendimento IS NULL OR length(horario_atendimento) <= 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.chatbot_config (agente, ativo, nome, mensagem_inicial, diretrizes) VALUES
  ('visitante', false, 'Ana', 'Olá! Sou a assistente virtual do Coworking 013. Como posso ajudar?',
   'Atenda visitantes do site com informações públicas sobre unidades, salas, planos, preços e serviços. Incentive o cadastro ou o agendamento quando fizer sentido.'),
  ('cliente', false, 'Ana', 'Olá! Posso ajudar com suas reservas, saldo de horas e dúvidas sobre o seu plano. Como posso ajudar?',
   'Atenda clientes logados. Ajude a consultar saldo e reservas, reservar salas e pedir cancelamento ou alteração, sempre dentro das regras do plano.'),
  ('admin', false, 'Assistente da equipe', 'Olá! O que você precisa fazer no painel hoje?',
   'Ajude a equipe a operar o painel: agenda, reservas, clientes, planos, créditos, financeiro e artigos. Seja direto e confirme dados antes de alterar.')
ON CONFLICT (agente) DO NOTHING;
INSERT INTO public.chatbot_contatos (id, whatsapp) VALUES (1, '5513988050358') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.chatbot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_manage ON public.chatbot_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_manage ON public.chatbot_contatos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE ON public.chatbot_config, public.chatbot_contatos TO authenticated;
GRANT ALL ON public.chatbot_config, public.chatbot_contatos TO service_role;

-- O que o navegador pode saber para exibir o chat (sem diretrizes internas).
CREATE OR REPLACE FUNCTION public.chatbot_publico()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(jsonb_object_agg(agente, jsonb_build_object(
    'ativo', ativo, 'nome', nome, 'avatar_url', avatar_url, 'mensagem_inicial', mensagem_inicial)), '{}'::jsonb)
  FROM public.chatbot_config
$$;
GRANT EXECUTE ON FUNCTION public.chatbot_publico() TO anon, authenticated;

-- Ações propostas pelo assistente que aguardam o clique em "Confirmar". Só o servidor acessa.
CREATE TABLE IF NOT EXISTS public.chat_acoes_pendentes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL,
  agente text NOT NULL,
  acao text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}',
  resumo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','executada','recusada','expirada','erro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
ALTER TABLE public.chat_acoes_pendentes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.chat_acoes_pendentes TO service_role;

-- Controle de abuso: contagem de mensagens por chave (usuário ou IP anonimizado) e janela.
CREATE TABLE IF NOT EXISTS public.chat_uso (
  chave text NOT NULL,
  janela timestamptz NOT NULL,
  total integer NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela)
);
ALTER TABLE public.chat_uso ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.chat_uso TO service_role;

-- Incrementa e devolve o total da janela (atômico).
CREATE OR REPLACE FUNCTION public.chat_registrar_uso(p_chave text, p_janela timestamptz)
RETURNS integer LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
  INSERT INTO public.chat_uso (chave, janela, total) VALUES (p_chave, p_janela, 1)
  ON CONFLICT (chave, janela) DO UPDATE SET total = public.chat_uso.total + 1
  RETURNING total
$$;
REVOKE ALL ON FUNCTION public.chat_registrar_uso(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_registrar_uso(text, timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
