# Finalizar salas, reservas, funil e segurança

## Objetivo
Concluir as correções pendentes sem apagar dados, mantendo a segurança e os fluxos existentes do Coworking 013.

## Implementação

1. **Banco e segurança**
   - Criar migration idempotente para separar preços por hora/diária, adicionar arquivamento de leads e endurecer funções/permissões.
   - Preservar valores existentes e manter a agenda pública anônima sem dados pessoais.
   - Remover a função legada insegura de redefinição administrativa e publicar as funções seguras alteradas.

2. **Salas e preços**
   - Consolidar criação e edição no formulário principal, eliminando caminhos antigos incompatíveis.
   - Validar com Zod categorias, modalidades, capacidade, preços, imagens e planos vigentes.
   - Salvar sala e vínculos de planos atomicamente.

3. **Reservas e planos**
   - Remover cálculos ativos por tabela fixa e usar somente os preços administrativos.
   - Consumir saldo progressivamente em recorrências, sem descontar datas ignoradas.
   - Completar a edição com plano compatível, recálculo, conflito ignorando a própria reserva, expediente, sábado, domingo, feriado, capacidade, histórico e Google Agenda.

4. **Clientes, senhas e mensagens**
   - Aplicar a mesma política de senha no formulário e na função protegida.
   - Centralizar mensagens amigáveis para salas, reservas, clientes, check-in, funil e funções indisponíveis.

5. **Funil de leads**
   - Manter atualização otimista com rollback real em falhas.
   - Arquivar leads com movimentação financeira sem apagar contratos ou reservas.

6. **Testes e validação**
   - Criar testes das regras críticas de datas, preços, planos, recorrência, edição, histórico, funil, senha e anonimização.
   - Validar os fluxos administrativos em desktop e celular.
   - Executar typecheck, testes, lint e build, corrigindo regressões do escopo.

## Detalhes técnicos
- React 18, TypeScript, Vite, Zod e componentes existentes.
- Alterações estruturais somente por migrations; dados existentes serão preservados.
- Funções administrativas exigirão sessão válida e papel de administrador no servidor.
- O erro `TS2686` permanecerá corrigido com imports diretos de React hooks.
