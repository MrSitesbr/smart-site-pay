-- Pedidos do cliente para cancelar ou alterar uma reserva (até 2h antes do início).
-- O admin vê os pedidos pendentes no calendário e resolve editando ou cancelando a reserva.
BEGIN;

CREATE TABLE IF NOT EXISTS public.reservation_change_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reservation_id text NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cliente_corp_id text,
  tipo text NOT NULL CHECK (tipo IN ('cancelamento', 'alteracao')),
  mensagem text,
  nova_data text,
  novo_inicio text,
  novo_fim text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvida', 'recusada')),
  admin_resposta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- No máximo um pedido em análise por reserva.
CREATE UNIQUE INDEX IF NOT EXISTS reservation_change_requests_one_pending
  ON public.reservation_change_requests (reservation_id) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS reservation_change_requests_cliente
  ON public.reservation_change_requests (cliente_corp_id);

ALTER TABLE public.reservation_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage reservation change requests" ON public.reservation_change_requests;
CREATE POLICY "Admins manage reservation change requests" ON public.reservation_change_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = auth.uid() AND role.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = auth.uid() AND role.role = 'admin'));

DROP POLICY IF EXISTS "Clients read own reservation change requests" ON public.reservation_change_requests;
CREATE POLICY "Clients read own reservation change requests" ON public.reservation_change_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clientes_corp AS client
     WHERE client.id = reservation_change_requests.cliente_corp_id
       AND client.user_id = auth.uid()::text
       AND client.deleted_at IS NULL
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_change_requests TO authenticated;

-- O cliente só cria pedidos por esta função, que confere dono, status e antecedência.
CREATE OR REPLACE FUNCTION public.request_reservation_change(
  p_reservation_id text,
  p_tipo text,
  p_mensagem text DEFAULT NULL,
  p_nova_data text DEFAULT NULL,
  p_novo_inicio text DEFAULT NULL,
  p_novo_fim text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reserva public.reservations%ROWTYPE;
  v_cliente_id text;
  v_inicio timestamptz;
  v_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para solicitar alterações.' USING ERRCODE = '42501';
  END IF;
  IF p_tipo NOT IN ('cancelamento', 'alteracao') THEN
    RAISE EXCEPTION 'Tipo de solicitação inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT c.id INTO v_cliente_id
    FROM public.reservations AS r
    JOIN public.clientes_corp AS c
      ON c.user_id = auth.uid()::text AND c.deleted_at IS NULL
     AND (r.cliente_corp_id = c.id OR lower(r.email) = lower(c.responsavel_email))
   WHERE r.id = p_reservation_id
   LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM public.reservations WHERE id = p_reservation_id;
  END IF;

  IF v_cliente_id IS NULL OR v_reserva.id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada na sua conta.' USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(v_reserva.status, '') IN ('cancelada', 'realizada') THEN
    RAISE EXCEPTION 'Esta reserva já foi %.', v_reserva.status USING ERRCODE = '22023';
  END IF;

  v_inicio := (v_reserva.data || ' ' || left(v_reserva.hora_inicio, 5))::timestamp AT TIME ZONE 'America/Sao_Paulo';
  IF v_inicio - now() < interval '2 hours' THEN
    RAISE EXCEPTION 'Solicitações de cancelamento ou alteração só podem ser feitas com pelo menos 2 horas de antecedência.' USING ERRCODE = '22023';
  END IF;

  IF p_tipo = 'alteracao' AND coalesce(btrim(p_mensagem), '') = '' AND p_nova_data IS NULL AND p_novo_inicio IS NULL THEN
    RAISE EXCEPTION 'Informe o novo horário ou descreva a alteração desejada.' USING ERRCODE = '22023';
  END IF;
  IF p_novo_inicio IS NOT NULL AND p_novo_fim IS NOT NULL AND p_novo_fim::time <= p_novo_inicio::time THEN
    RAISE EXCEPTION 'O novo horário final deve ser depois do inicial.' USING ERRCODE = '22007';
  END IF;
  IF length(coalesce(p_mensagem, '')) > 1000 THEN
    RAISE EXCEPTION 'Mensagem muito longa (máximo 1000 caracteres).' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reservation_change_requests WHERE reservation_id = v_reserva.id AND status = 'pendente') THEN
    RAISE EXCEPTION 'Já existe uma solicitação em análise para esta reserva.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.reservation_change_requests (reservation_id, cliente_corp_id, tipo, mensagem, nova_data, novo_inicio, novo_fim)
  VALUES (v_reserva.id, v_cliente_id, p_tipo, nullif(btrim(p_mensagem), ''), p_nova_data, left(p_novo_inicio, 5), left(p_novo_fim, 5))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_reservation_change(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_reservation_change(text, text, text, text, text, text) TO authenticated;

-- Quando o admin cancela a reserva, os pedidos de cancelamento pendentes ficam resolvidos.
CREATE OR REPLACE FUNCTION public.close_change_requests_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'cancelada' AND coalesce(OLD.status, '') <> 'cancelada' THEN
    UPDATE public.reservation_change_requests
       SET status = 'resolvida', resolved_at = now(),
           admin_resposta = coalesce(admin_resposta, 'Reserva cancelada.')
     WHERE reservation_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_close_change_requests ON public.reservations;
CREATE TRIGGER reservations_close_change_requests
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.close_change_requests_on_cancel();

COMMIT;

NOTIFY pgrst, 'reload schema';
