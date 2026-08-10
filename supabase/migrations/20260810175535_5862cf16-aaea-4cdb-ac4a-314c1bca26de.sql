-- Conceder permissão de execução na função para as roles anon e authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- Garantir que a tabela user_roles seja acessível para leitura por usuários autenticados
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- Notificar que as permissões foram reparadas
COMMENT ON FUNCTION public.has_role IS 'Função de segurança para verificar papéis de usuário. Permissões reparadas em 2026-08-10.';