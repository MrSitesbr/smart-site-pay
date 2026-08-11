# Plano de Implementação: Fluxo de Unidade e Sala nos Formulários de Reserva e Visita

O objetivo é garantir que tanto o administrador quanto os usuários escolham primeiro a unidade e depois a sala (filtrada pela unidade), com avisos visuais de conflito de horário/disponibilidade.

## 1. Ajustes no Banco de Dados
- Garantir que a tabela `reservations` tenha `sala_id` (atualmente parece usar apenas o campo `ambiente` de texto, o que impede verificação real de disponibilidade por sala).
- Criar migração para adicionar `sala_id` e `unidade_id` em `reservations` se necessário.
- Adicionar RLS e permissões para novas colunas.

## 2. Componente de Verificação de Conflitos
- Criar uma função utilitária em `src/lib/disponibilidade.ts` que consulta o banco de dados por conflitos de horário para uma sala e data específica.

## 3. Refatoração do `NovaReservaDialog.tsx`
- **Seleção de Unidade:** Adicionar um `Select` para Unidade no topo.
- **Seleção de Sala:** Adicionar um `Select` para Sala, carregando apenas as salas da unidade selecionada.
- **Lógica de Bloqueio/Aviso:** Ao selecionar um horário, disparar a verificação de conflitos. Exibir um aviso visual (ex: banner vermelho ou texto abaixo do horário) se a sala já estiver ocupada.
- **Persistência:** Salvar `unidade_id` e `sala_id` no registro da reserva.

## 4. Refatoração do `NovoVisitanteDialog.tsx`
- **Seleção de Unidade:** Adicionar um `Select` para Unidade antes da seleção de sala.
- **Seleção de Sala:** Filtrar as salas com base na unidade selecionada.
- **Aviso de Visita:** Similar à reserva, verificar se já existe um visitante marcado para aquele horário/sala e mostrar aviso.

## 5. Calendário Administrativo (`AdminCalendar.tsx`)
- Garantir que o filtro de unidade no calendário geral reflita as novas associações de `unidade_id` nas reservas.

## Detalhes Técnicos
- Utilizar `useQuery` ou `useEffect` com Supabase para carregar unidades e salas dinamicamente.
- Implementar debounce na verificação de conflitos para evitar excesso de requisições enquanto o usuário digita horários.
- Mensagem de aviso sugerida: "Atenção: Esta sala já possui uma reserva/visita para o horário selecionado."
