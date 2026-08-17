# Plano de Ação: Construtor Dev "Estilo Elementor"

Este plano detalha o roteiro para transformar o atual Construtor Dev em uma ferramenta de alta performance, idêntica às possibilidades do Elementor Pro, focada em flexibilidade visual e facilidade de uso para o CoWorking 013.

## 1. Infraestrutura Visual e Interação
- **Arrastar e Soltar (Drag & Drop)**: Implementar movimentação fluida de seções, colunas e widgets diretamente no canvas (utilizando `dnd-kit`).
- **Redimensionamento de Colunas**: Adicionar alças entre colunas para ajuste visual de largura (%).
- **Navegador (Árvore de Elementos)**: Uma barra lateral para gerenciar a hierarquia (Seção > Coluna > Widget) em estruturas complexas.
- **Controles Responsivos**: Configurações específicas para Mobile/Tablet/Desktop em cada campo do inspetor.

## 2. Estilização Avançada (Aba Estilo)
- **Sistema de Fundo**:
  - Gradientes e Overlays de fundo com modos de mesclagem.
  - Vídeo de fundo e efeitos de paralaxe.
- **Tipografia Elementor**: Controle de altura de linha, espaçamento entre letras e sombras de texto.
- **Bordas e Sombras**: Arredondamento individual de cantos e sombras complexas (Box Shadows).

## 3. Novos Widgets Estruturais e Dinâmicos
- **Seção Interna (Inner Section)**: Permitir colunas dentro de colunas para layouts complexos.
- **Carrossel de Testemunhos**: Slider dinâmico para feedback de clientes.
- **Caixa de Ícone**: Bloco modular com ícones e chamadas.
- **Widgets de Coworking v2**: Filtros dinâmicos em tempo real para Unidades e Salas integrados ao CRM.

## 4. Fluxo de Trabalho e Produtividade
- **Histórico (Desfazer/Refazer)**: Sistema de estados para reverter erros durante a edição.
- **Biblioteca de Modelos**: Opção de salvar seções como "Modelos" para reutilizar em outras páginas.
- **Edição em Tempo Real**: Otimizar a renderização para que o canvas responda instantaneamente a cada mudança no inspetor.

## Detalhes Técnicos
- **Estado**: Migrar o estado do layout para um contexto global ou `jotai` para facilitar o Undo/Redo.
- **Performance**: Usar `React.memo` nos renderizadores de widgets para evitar re-renders desnecessários durante o arraste.
- **Documentação**: O roteiro completo está disponível no painel admin sob "Configurações > Roteiro Construtor Dev".
