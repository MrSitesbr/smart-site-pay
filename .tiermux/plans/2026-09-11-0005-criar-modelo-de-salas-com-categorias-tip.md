---
title: "Criar modelo de salas com categorias, tipos de locação, status e preços"
created: 2026-09-11T00:05:08+00:00
status: executing
model: "kilo/stepfun/step-3.7-flash:free"
session: "smtw6ee7a4xj8"
steps: 7
files:
  - "supabase/migrations/20260910130000_allow_anonymous_contract_leads.sql"
  - "src/integrations/supabase/types.ts"
  - "src/components/admin/AdminSalaFormPage.tsx"
  - "src/components/admin/AdminSalaDetalhe.tsx"
  - "src/components/admin/AdminUnidades.tsx"
  - "src/components/ReservaDialog.tsx"
  - "src/pages/Reservar.tsx"
---

# Criar modelo de salas com categorias, tipos de locação, status e preços

> **Request** — agora que temos acesso ao banco de dados vamos melharar o site e o admin para corrigir o regime de tipos de salas, seus valores e planos para que tenha essas formas tanto para o vistante, usuario e painel admin: Cada sala tem que uma categoria e um tipo de locação sendo que cada tipo de locação terá um campo para o admin inserir o valor específico da sala Categorias: * Sala Privativa * Escritório Compartilhado * Consultório com Poltrona * Consultório com Maca Tipos de Locações/Planos: - Locação Mensal (se escolhida essa opção o admin terá a opção de 3 status: disponível - Locação por Período (se o admin escolher essa ele tem que escolher se é pacote mensal ou avulsa) -- Pacotes Mensais -- Locação Avulsa Status: - Disponível (cliente pode solicitar reserva ou locação mensal dependo da sala) - Indisponível (cliente pode ver que a sala existe e sua estrutura mas não poderá solicitar reserva ou locação mensal) - Oculto (cliente não pode ver a sala)

## Reading

o site público, o painel do usuário e o admin devem permitir escolher a categoria e o tipo de locação de cada sala, definir um valor por sala+tipo e controlar a visibilidade/status da sala para o público.

## Steps

- [ ] Implementar suporte estruturado a categorias de sala, tipos de locação/planos, status (Disponível, Indisponível, Oculto) e valores específicos por sala, migrando os dados existentes e ajustando admin, usuário e site público. O modelo de preços será uma tabela separada `sala_precos` com `tipo_locacao` + `preco` por sala.
- [ ] Criar tipos e tabela de preços por sala no banco de dados
  - Files: `supabase/migrations/20260910130000_allow_anonymous_contract_leads.sql`
  - Evidence: supabase/migrations/20260910130000_allow_anonymous_contract_leads.sql:2-3 já define ALTER TABLE em public, então o mesmo arquivo pode evoluir com a mudança estrutural solicitada.
  - Verify: Aplicar migração no Supabase e confirmar as novas tabelas/colunas existem.
- [ ] Atualizar tipos gerados do Supabase para refletir o novo schema
  - Files: `src/integrations/supabase/types.ts`
  - Evidence: src/integrations/supabase/types.ts:794-800 define a Row de salas; ele deve ser atualizado porque haverá novos enums/campos para `salas` e uma nova tabela `sala_precos`.
  - Verify: Rodar typecheck do TypeScript sem erros após atualizar os tipos.
- [ ] Atualizar o formulário de salas no admin para categoria, tipo de locação e status
  - Files: `src/components/admin/AdminSalaFormPage.tsx`, `src/components/admin/AdminSalaDetalhe.tsx`
  - Evidence: src/components/admin/AdminSalaFormPage.tsx:224-234 já tem um select de `tipo`; pode ser extendido para categoria/tipo de locação/status; AdminSalaDetalhe também exibe/edita detalhes da sala.
  - Verify: Cadastrar/editar uma sala pelo admin e confirmar os campos novos aparecem e são salvos.
- [ ] Persistir e exibir os preços por sala/tipo no admin
  - Files: `src/components/admin/AdminSalaFormPage.tsx`, `src/components/admin/AdminSalaDetalhe.tsx`
  - Evidence: src/components/admin/AdminSalaFormPage.tsx:108-122 está onde o `saveSala` monta o payload; essa etapa vai incluir `sala_precos` nesse fluxo para salvar os valores por sala+tipo de locação.
  - Verify: Editar preços no admin e confirmar que `sala_precos` é atualizado corretamente no banco.
- [ ] Atualizar a listagem/admin de salas para exibir status e valores de forma clara
  - Files: `src/components/admin/AdminUnidades.tsx`, `src/components/admin/AdminSalaDetalhe.tsx`
  - Evidence: src/components/admin/AdminUnidades.tsx é usado na gestão de unidades/salas; deve mostrar categoria, tipo, status e preço, guiando a visibilidade (Disponível, Indisponível, Oculto).
  - Verify: Verificar no admin se a listagem mostra os dados corretos.
- [ ] Atualizar o fluxo de reserva do usuário/site para categoria, tipo e preço
  - Files: `src/components/ReservaDialog.tsx`, `src/pages/Reservar.tsx`
  - Evidence: src/components/ReservaDialog.tsx inicia a reserva baseada na sala; src/pages/Reservar.tsx:151 insere o `contract_request`. Aqui será exposta a categoria e o tipo de locação, com o valor correspondente de `sala_precos`.
  - Verify: Realizar uma reserva no site e confirmar que a categoria, o tipo e o preço corretos são apresentados/enviados.
