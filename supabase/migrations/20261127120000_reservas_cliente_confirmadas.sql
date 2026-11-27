-- Reserva feita pelo cliente (painel ou calendário) já nasce confirmada, sem aprovação da equipe.
-- Antes dependia da opção "Confirmar reservas dos clientes automaticamente" (estava desligada).
-- Conflito de horário, expediente da unidade e saldo continuam sendo barrados antes de gravar.

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('auto_confirmar_reservas', '{"enabled": true}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = '{"enabled": true}'::jsonb, updated_at = now();

CREATE OR REPLACE FUNCTION public.auto_confirmar_reserva_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.origem = 'Painel do cliente' AND coalesce(NEW.status::text, 'pendente') = 'pendente' THEN
    NEW.status := 'confirmada';
    NEW.calculo_justificativa := trim(coalesce(NEW.calculo_justificativa, '') || ' Confirmada automaticamente.');
  END IF;
  RETURN NEW;
END $$;

-- Reservas de clientes que ficaram aguardando confirmação: confirma as de hoje em diante.
UPDATE public.reservations
   SET status = 'confirmada',
       calculo_justificativa = trim(coalesce(calculo_justificativa, '') || ' Confirmada automaticamente.')
 WHERE origem = 'Painel do cliente'
   AND status::text = 'pendente'
   AND data::text >= to_char(current_date, 'YYYY-MM-DD');

NOTIFY pgrst, 'reload schema';
