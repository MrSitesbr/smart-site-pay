# Área do Cliente completa + controle de uso de plano no admin

## O que o cliente passa a ter no painel

1. **Meus dados** — editar razão social, CNPJ, responsável (nome, CPF, e-mail de contato, WhatsApp). Só o próprio cadastro.
2. **Colaboradores** — cadastrar, editar e remover colaboradores da própria empresa.
3. **Visitantes** — cadastrar visitantes (só cadastro ou com data/hora), editar e remover.
4. **Meu plano** — plano ativo, horas contratadas, horas já usadas, saldo restante, barra de consumo e validade. Botão "Solicitar outro plano" que envia o pedido para o admin.
5. **Documentos** — lista de arquivos que o admin compartilhou com aquele cliente (contrato, laudo, PDFs). Só download, sem acesso a documentos de outros clientes.
6. **Suporte** — chamados com troca de mensagens entre cliente e admin, com status (aberto / em andamento / resolvido).
7. **Calendário** — abre já filtrado na unidade e sala do cadastro do cliente; ele pode trocar o filtro para ver outras unidades/salas. Horários já reservados por qualquer cliente aparecem como ocupados e não podem ser selecionados; feriados e domingos continuam bloqueados. O cliente só vê "ocupado", nunca o nome de quem reservou.

## O que o admin passa a ter

- **Uso do plano por cliente**: na ficha do cliente, horas do plano, horas consumidas (reservas realizadas/confirmadas), saldo e histórico do período.
- **Cadastro/edição de plano**: campos de horas incluídas e período de apuração (mensal / validade em dias) que alimentam a calculadora de consumo.
- **Documentos do cliente**: enviar arquivos por cliente e definir se ficam visíveis no painel dele.
- **Solicitações de plano**: fila de pedidos de troca/novo plano, com aprovar/recusar (aprovar troca o plano do cliente).
- **Suporte**: caixa de chamados, resposta e mudança de status.

## Detalhes técnicos

**Banco (migrations, com GRANTs e RLS por dono):**
- `planos`: `horas_incluidas` (int), `periodo_apuracao` (text: mensal/validade/ilimitado).
- `cliente_documentos`: cliente_corp_id, nome, descricao, storage_path, visivel_cliente, created_at.
- `plano_solicitacoes`: cliente_corp_id, plano_id, mensagem, status (pendente/aprovada/recusada), admin_notes.
- `support_tickets` + `support_messages`: assunto, status, prioridade; mensagens com autor (cliente/admin) e corpo.
- Função `public.current_cliente_id()` (security definer) retornando o `clientes_corp.id` do `auth.uid()`.
- RLS: cliente lê/escreve apenas linhas onde `cliente_corp_id = public.current_cliente_id()`; admin via `has_role`. Aplicar também a `clientes_corp` (update do próprio registro, sem poder mudar plano/status), `funcionarios_cliente` e `visitantes`.
- Bucket privado `client-docs`, políticas de storage por pasta `cliente_corp_id/`; download via URL assinada.

**Cálculo de consumo (`src/lib/planoUso.ts`):**
- Soma das horas de `reservations` do cliente com status `realizada`/`confirmada` dentro do período vigente do plano (mês corrente ou janela de `validade_dias`), comparada com `planos.horas_incluidas`. Usado pelo painel do cliente e pela ficha do admin.

**Disponibilidade do calendário do cliente:**
- Reaproveitar `src/lib/disponibilidade.ts` (capacidade de espaços compartilhados, feriados e domingos) para marcar slots ocupados; consulta pública de ocupação só devolve horários, sem dados pessoais.

**Frontend:**
- `src/pages/Painel.tsx` reorganizado em abas: Visão geral, Meus dados, Colaboradores, Visitantes, Meu plano, Documentos, Suporte, Calendário — com componentes novos em `src/components/painel/`.
- Admin: novas abas em `AdminClienteCorpDetalhe.tsx` (Uso do plano, Documentos), campos de horas em `AdminPlanoDetalhe.tsx`, e novas telas `AdminSuporte` (chamados) e solicitações de plano na lista de clientes.
