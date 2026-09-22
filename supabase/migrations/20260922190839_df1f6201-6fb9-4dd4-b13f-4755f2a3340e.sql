REVOKE ALL ON public.user_roles FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_cliente_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_cliente_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservation(uuid, date, time without time zone, time without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservation(uuid, date, time without time zone, time without time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_authenticated_reservations(uuid, jsonb, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_room_availability(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_availability(date, date, uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_consultation(text, text, text, text) TO anon, authenticated;