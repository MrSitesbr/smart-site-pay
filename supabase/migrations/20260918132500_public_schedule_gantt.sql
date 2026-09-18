DROP FUNCTION IF EXISTS public.get_public_room_availability(date, date, uuid);

CREATE FUNCTION public.get_public_room_availability(
  p_start_date date,
  p_end_date date,
  p_sala_id uuid DEFAULT NULL
)
RETURNS TABLE (
  sala_id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  color_slot integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  IF p_end_date - p_start_date > 62 THEN
    RAISE EXCEPTION 'Consulte no máximo 63 dias por vez.';
  END IF;

  RETURN QUERY
  SELECT
    r.sala_id,
    r.data,
    r.hora_inicio,
    r.hora_fim,
    mod(abs(hashtext(lower(coalesce(nullif(r.email, ''), r.id::text)))), 6)::integer AS color_slot
  FROM public.reservations r
  JOIN public.salas s ON s.id = r.sala_id
  WHERE r.sala_id IS NOT NULL
    AND r.data BETWEEN p_start_date AND p_end_date
    AND r.status <> 'cancelada'::public.reserva_status
    AND (p_sala_id IS NULL OR r.sala_id = p_sala_id)
    AND s.status IN ('disponivel', 'ativa')
  ORDER BY r.data, r.hora_inicio;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_room_availability(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, uuid) TO anon, authenticated;
