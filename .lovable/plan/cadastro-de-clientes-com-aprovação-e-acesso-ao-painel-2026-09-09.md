# Cadastro de clientes com aprovação e acesso ao painel

## Objetivo
Permitir que novos clientes se cadastrem pela tela de acesso da Área do Cliente, escolhendo plano, unidade e sala. O cadastro fica aguardando liberação (automática ou manual, conforme configuração do admin). O admin pode criar ou trocar a senha do cliente e liberar o acesso. Liberado, o cliente entra no painel e vê seu calendário e suas reservas.

## Fluxo do cliente
1. Na tela de acesso, um botão "Criar conta" abre uma segunda etapa dentro do mesmo quadro.
2. Formulário em duas etapas:
   - Etapa 1 (dados obrigatórios): nome/razão social, nome do responsável, CPF/CNPJ, e-mail, WhatsApp, senha e confirmação.
   - Etapa 2 (uso): unidade, plano e sala desejada (as salas listadas dependem da unidade escolhida).
3. Ao concluir, a conta é criada e o cadastro entra como "aguardando liberação".
   - Se a liberação automática estiver ligada, o acesso já é liberado na hora.
   - Caso contrário, uma mensagem explica que o acesso será liberado pela equipe.
4. Tentando entrar antes da liberação, o cliente vê um aviso claro de cadastro em análise.

## Fluxo do admin
- Na lista de Clientes: nova aba/filtro "Aguardando liberação" com botões Liberar e Recusar, mostrando unidade, plano e sala pedidos.
- Em Configurações: opção "Liberar novos cadastros automaticamente" (ligado/desligado).
- Na ficha do cliente (e na criação rápida): campo para definir ou trocar a senha de acesso do cliente, criando o login caso ainda não exista.

## Painel do cliente
- Painel passa a mostrar os dados da empresa vinculada, o calendário com as reservas dela e a lista de reservas, além do que já existe hoje.
- Cliente sem liberação é bloqueado com aviso.

## Detalhes técnicos
- Banco:
  - `clientes_corp`: novas colunas `user_id` (uuid), `status_acesso` (text: pendente/aprovado/recusado, padrão pendente), `sala_id` (uuid, sala preferida) — plano e unidade já existem.
  - Nova tabela `app_settings` (key/value jsonb) com GRANTs; guarda `auto_aprovar_cadastros`.
  - Índice único parcial em `clientes_corp.user_id`.
  - Políticas: cliente lê/edita apenas o próprio registro (`user_id = auth.uid()`); admin via `has_role`. Mantém as permissões atuais para não quebrar o modo admin existente.
- Edge functions (service role):
  - `client-signup`: cria o usuário auth (e-mail confirmado), cria/vincula `clientes_corp` com plano/unidade/sala e status conforme configuração.
  - `admin-set-client-password`: cria o login do cliente se não existir e define/troca a senha; exige chamador admin.
- Frontend:
  - `src/pages/Auth.tsx`: alternância entre "Entrar" e "Criar conta" (2 etapas) no mesmo cartão; após login, checa `status_acesso`.
  - `src/components/admin/AdminClientesCorp.tsx`: filtro de pendentes, ações liberar/recusar.
  - `src/components/admin/AdminClienteCorpDetalhe.tsx` e `NovoClienteCorpDialog.tsx`: campo de senha do cliente.
  - `src/components/admin/AdminSettings.tsx`: chave de liberação automática.
  - `src/pages/Painel.tsx`: dados da empresa + reservas vinculadas ao cliente.
