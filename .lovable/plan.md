# Plano de Implementação: Feedback Visual de Drag and Drop (Estilo Elementor)

Este plano descreve as modificações necessárias para transformar o sistema de Drag and Drop do Construtor Dev em uma experiência de edição visual avançada, com feedback em tempo real, indicadores de inserção precisos e destaques visuais, similar ao Elementor Pro.

## Alterações Propostas

### 1. Sistema de Sensores e Detecção de Colisão
- Ajustar os sensores do `DndContext` em `PageBuilder.tsx` para permitir maior precisão no arraste de widgets para dentro de colunas e seções.
- Implementar uma estratégia de detecção de colisão personalizada que considere o centro dos elementos e a hierarquia de contêineres (Seção > Coluna > Widget).

### 2. Feedback Visual de Hover (Destaque do Alvo)
- Modificar o `PageRenderer.tsx` (e seus sub-componentes `SectionRenderer`, `ColumnRenderer`, `WidgetRenderer`) para reagir ao estado de "arraste ativo".
- Adicionar bordas tracejadas ou fundos levemente coloridos nos contêineres que são alvos válidos para o elemento sendo arrastado.

### 3. Indicador de Inserção (Drop Zone Indicator)
- Criar um componente de "Linha Guiadora" (Drop Indicator) que aparece dinamicamente entre elementos existentes.
- A linha será azul, terá 2px de espessura e um badge indicativo, mostrando exatamente se o elemento será inserido antes ou depois do alvo.

### 4. Cálculo de Posição Preciso
- Implementar lógica no `PageBuilder.tsx` para calcular a posição relativa do mouse durante o `onDragOver`.
- Determinar o índice de inserção com base na metade superior/inferior dos elementos vizinhos.

### 5. Customização do Drag Preview
- Implementar um `DragOverlay` customizado para evitar as sombras padrão do navegador e garantir que o cursor permaneça alinhado ao elemento sendo movido.

## Detalhes Técnicos

### Arquivos afetados:
- `src/components/admin/PageBuilder.tsx`: Lógica central do DnD, sensores e manipulação de estado do layout.
- `src/components/PageRenderer.tsx`: Adição de estilos condicionais de "droppable" e renderização dos indicadores visuais.
- `src/types/page-builder.ts`: Possível adição de metadados para controle de arraste.

### Bibliotecas utilizadas:
- `@dnd-kit/core`: Core do sistema de Drag and Drop.
- `@dnd-kit/sortable`: Estratégias de reordenação.
- `Tailwind CSS`: Para as animações e estilos dos indicadores visuais.

## Próximos Passos
1. Refatorar o `PageBuilder.tsx` para suportar o novo sistema de DnD.
2. Atualizar o `PageRenderer.tsx` para exibir os feedbacks visuais.
3. Testar a precisão da inserção em diferentes níveis de aninhamento.
