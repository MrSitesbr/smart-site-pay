# Plano: Lista de Espera Inteligente de Salas

Implementar um sistema de lista de espera que permite cadastrar requisitos de clientes (metragem, janela, lavatório) e sugerir automaticamente salas compatíveis quando houver vacância.

## Alterações Técnicas

### 1. Banco de Dados
- **Tabela `salas`**: Adicionar coluna `metadata` (jsonb) para armazenar atributos como `metragem`, `tem_janela`, `tem_lavatorio`.
- **Tabela `waiting_list`**: Criar nova tabela para registrar clientes em espera, com colunas para requisitos técnicos (`min_metragem`, `needs_window`, `needs_lavatory`) e status.
- **RLS & Permissões**: Garantir acesso total ao Admin para estas novas estruturas.

### 2. Frontend Admin
- **Cadastro de Sala (`AdminSalaDetalhe.tsx`)**: Adicionar campos para definir a metragem e marcar se a sala possui janela ou lavatório.
- **Unidade (`AdminUnidadeDetalhe.tsx`)**: 
    - Criar uma nova aba ou seção "Lista de Espera".
    - Implementar botão "Adicionar à Lista de Espera".
    - Exibir lista de clientes aguardando e suas pontuações de compatibilidade com as salas da unidade.
- **Diálogo de Fila de Espera**: Formulário com check-list dos itens desejados pelo cliente.

### 3. Lógica de Compatibilidade
- Criar função auxiliar `src/lib/compatibility.ts` que calcula a porcentagem de match entre uma sala e um pedido da lista de espera.

## Próximos Passos
1. Executar migrações de banco de dados.
2. Atualizar formulário de edição de salas.
3. Criar interface de gerenciamento da fila na página da unidade.
