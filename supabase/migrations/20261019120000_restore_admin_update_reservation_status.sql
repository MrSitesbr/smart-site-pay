-- Recria a função usada pelo admin para trocar só o status da reserva.
-- Ela sumiu numa restauração do banco (erro PGRST202); agora segue o schema atual,
-- em que reservations.id e reservations.status são texto.
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(
  p_reservation_id text,
  p_status text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS role
     WHERE role.user_id = auth.uid() AND role.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem atualizar o status da reserva.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('pendente', 'confirmada', 'realizada', 'cancelada') THEN
    RAISE EXCEPTION 'Status inválido.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reservations
     SET status = p_status,
         cancelled_at = CASE WHEN p_status = 'cancelada' THEN coalesce(cancelled_at, now()::text) ELSE cancelled_at END
   WHERE id = p_reservation_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_reservation_status(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
