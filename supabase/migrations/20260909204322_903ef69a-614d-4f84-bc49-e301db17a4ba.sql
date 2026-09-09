
-- 1. Planos: horas e período de apuração
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS horas_incluidas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS periodo_apuracao text NOT NULL DEFAULT 'mensal';

UPDATE public.planos SET horas_incluidas = COALESCE(quantidade_horas, 0) WHERE horas_incluidas = 0;

-- 2. Helper: cliente do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clientes_corp WHERE user_id = auth.uid() LIMIT 1
$$;

-- 3. Documentos por cliente
CREATE TABLE IF NOT EXISTS public.cliente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_corp_id uuid NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  visivel_cliente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_documentos TO authenticated, anon;
GRANT ALL ON public.cliente_documentos TO service_role;
ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente ve seus documentos" ON public.cliente_documentos
  FOR SELECT TO authenticated
  USING (visivel_cliente AND cliente_corp_id = public.current_cliente_id());
CREATE POLICY "admin gerencia documentos" ON public.cliente_documentos
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);
CREATE TRIGGER cliente_documentos_updated_at BEFORE UPDATE ON public.cliente_documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Solicitações de plano
CREATE TABLE IF NOT EXISTS public.plano_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_corp_id uuid NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  plano_id uuid REFERENCES public.planos(id),
  mensagem text,
  status text NOT NULL DEFAULT 'pendente',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_solicitacoes TO authenticated, anon;
GRANT ALL ON public.plano_solicitacoes TO service_role;
ALTER TABLE public.plano_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente ve suas solicitacoes" ON public.plano_solicitacoes
  FOR SELECT TO authenticated USING (cliente_corp_id = public.current_cliente_id());
CREATE POLICY "cliente cria solicitacoes" ON public.plano_solicitacoes
  FOR INSERT TO authenticated WITH CHECK (cliente_corp_id = public.current_cliente_id());
CREATE POLICY "admin gerencia solicitacoes" ON public.plano_solicitacoes
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);
CREATE TRIGGER plano_solicitacoes_updated_at BEFORE UPDATE ON public.plano_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_corp_id uuid NOT NULL REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  assunto text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  prioridade text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated, anon;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente ve seus tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (cliente_corp_id = public.current_cliente_id());
CREATE POLICY "cliente cria tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (cliente_corp_id = public.current_cliente_id());
CREATE POLICY "cliente atualiza seus tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (cliente_corp_id = public.current_cliente_id())
  WITH CHECK (cliente_corp_id = public.current_cliente_id());
CREATE POLICY "admin gerencia tickets" ON public.support_tickets
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  autor_tipo text NOT NULL DEFAULT 'cliente',
  autor_nome text,
  corpo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated, anon;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente ve mensagens dos seus tickets" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.cliente_corp_id = public.current_cliente_id())
  );
CREATE POLICY "cliente escreve nos seus tickets" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    autor_tipo = 'cliente' AND
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.cliente_corp_id = public.current_cliente_id())
  );
CREATE POLICY "admin gerencia mensagens" ON public.support_messages
  FOR ALL TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);

-- 6. Cliente edita o próprio cadastro e seus colaboradores/visitantes
DROP POLICY IF EXISTS "cliente atualiza proprio cadastro" ON public.clientes_corp;
CREATE POLICY "cliente atualiza proprio cadastro" ON public.clientes_corp
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cliente gerencia seus funcionarios" ON public.funcionarios_cliente;
CREATE POLICY "cliente gerencia seus funcionarios" ON public.funcionarios_cliente
  FOR ALL TO authenticated
  USING (cliente_corp_id = public.current_cliente_id())
  WITH CHECK (cliente_corp_id = public.current_cliente_id());

DROP POLICY IF EXISTS "cliente gerencia seus visitantes" ON public.visitantes;
CREATE POLICY "cliente gerencia seus visitantes" ON public.visitantes
  FOR ALL TO authenticated
  USING (cliente_corp_id = public.current_cliente_id())
  WITH CHECK (cliente_corp_id = public.current_cliente_id());
