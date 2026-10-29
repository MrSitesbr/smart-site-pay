-- Registro de erros que acontecem no navegador do usuário (tela branca, falha de carregamento).
-- Qualquer visitante pode gravar um erro; só o admin lê.
CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  origem text NOT NULL CHECK (length(origem) <= 40),
  mensagem text NOT NULL CHECK (length(mensagem) <= 2000),
  detalhe text CHECK (detalhe IS NULL OR length(detalhe) <= 8000),
  url text CHECK (url IS NULL OR length(url) <= 1000),
  user_agent text CHECK (user_agent IS NULL OR length(user_agent) <= 500),
  user_id uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS client_error_logs_created_idx ON public.client_error_logs(created_at DESC);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_insert ON public.client_error_logs FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY admin_read ON public.client_error_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_delete ON public.client_error_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT INSERT ON public.client_error_logs TO anon, authenticated;
GRANT SELECT, DELETE ON public.client_error_logs TO authenticated;
GRANT ALL ON public.client_error_logs TO service_role;

NOTIFY pgrst, 'reload schema';
