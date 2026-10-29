-- Configurações gerais: liberar cadastros e confirmar reservas dos clientes automaticamente.

-- A tela de configurações salva por "key"; sem chave única o salvamento falhava.
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_key ON public.app_settings(key);
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('auto_confirmar_reservas', '{"enabled": false}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_setting_ativo(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key = p_key LIMIT 1), false)
$$;

-- Novo cadastro já entra liberado quando "Liberar novos cadastros automaticamente" está ligado.
CREATE OR REPLACE FUNCTION public.auto_aprovar_cadastro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF coalesce(NEW.status_acesso, 'pendente') = 'pendente' AND public.app_setting_ativo('auto_aprovar_cadastros') THEN
    NEW.status_acesso := 'aprovado';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clientes_corp_auto_aprovar ON public.clientes_corp;
CREATE TRIGGER clientes_corp_auto_aprovar BEFORE INSERT ON public.clientes_corp
  FOR EACH ROW EXECUTE FUNCTION public.auto_aprovar_cadastro();

-- Reserva feita pelo cliente (painel ou calendário) já fica confirmada quando
-- "Confirmar reservas dos clientes automaticamente" está ligado. Conflitos de horário
-- continuam sendo barrados pelas validações existentes.
CREATE OR REPLACE FUNCTION public.auto_confirmar_reserva_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.origem = 'Painel do cliente' AND coalesce(NEW.status, 'pendente') = 'pendente'
     AND public.app_setting_ativo('auto_confirmar_reservas') THEN
    NEW.status := 'confirmada';
    NEW.calculo_justificativa := trim(coalesce(NEW.calculo_justificativa, '') || ' Confirmada automaticamente.');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reservations_auto_confirmar ON public.reservations;
CREATE TRIGGER reservations_auto_confirmar BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirmar_reserva_cliente();
