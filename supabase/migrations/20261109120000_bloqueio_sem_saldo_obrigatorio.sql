-- Regra fixa: cliente sem saldo (plano ou créditos extras) não reserva nem pede alteração de horário.
-- Antes dependia da opção "bloquear_sem_saldo" (desligada por padrão); agora vale sempre.
-- Reservas feitas pela equipe (admin) continuam liberadas.

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('bloquear_sem_saldo', '{"enabled": true}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = '{"enabled": true}'::jsonb, updated_at = now();

CREATE OR REPLACE FUNCTION public.reservas_bloqueio_sem_saldo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;
REVOKE ALL ON FUNCTION public.reservas_bloqueio_sem_saldo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reservas_bloqueio_sem_saldo() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
