# Plano de Refatoração: Editor de Seções Estilo Elementor Pro

Este plano detalha a transição do sistema atual de edição de seções para uma arquitetura modular, dinâmica e de largura total, similar ao Elementor Pro, permitindo controle total sobre layout, conteúdo e estilo diretamente no painel administrativo.

## Mudanças Propostas

### 1. Refatoração de Layout (Front-end)
- **Remoção de Wrappers Fixos**: Modificar `Index.tsx` e componentes de página para remover `container` ou `px-4` globais, permitindo que cada seção gerencie seu próprio preenchimento e largura.
- **Configuração de Largura**: Implementar suporte para "Boxed" (largura contida no container) vs "Full Width" (100% da largura da tela) em cada componente de seção.
- **Componentização Unificada**: Garantir que o `renderSectionPreview` no Admin utilize exatamente os mesmos componentes que o site público, assegurando fidelidade visual.

### 2. Editor de Seção Dinâmico (Admin)
- **Interface Modular**: Refatorar `AdminPaginas.tsx` para decompor a edição em três abas:
  - **Conteúdo**: Edição de textos, imagens, ícones e URLs. Leitura dinâmica de todas as chaves do JSON `content`.
  - **Estilo**: Controles para cores de fundo, cor de texto, imagem de fundo da seção e bordas.
  - **Configurações de Layout**: Seletor de largura (Boxed/Full) e campos para paddings/margins.
- **Controle de Formulários**: Adicionar lógica para alternar entre diferentes tipos de formulários (Reserva, Contato, Newsletter) dentro de seções que suportam inputs.

### 3. Persistência e Sincronização
- **Camada de Dados**: Atualizar `src/lib/cms.ts` para garantir que o campo `settings` (estilos e layout) seja salvo corretamente no Supabase.
- **Atualização Instantânea**: Implementar feedback imediato no preview ao alterar valores, sem necessidade de recarregar a página.

## Detalhes Técnicos

### Esquema de Dados (site_sections)
- `content`: Armazenará textos, imagens e estrutura de colunas.
- `settings`: Armazenará `widthMode` (boxed|full), `padding`, `margin`, `backgroundColor`, `backgroundImage`, `textColor`.

### Componentes Afetados
- `src/components/admin/AdminPaginas.tsx` (Grande refatoração)
- `src/components/HeroSection.tsx`, `IdealParaSection.tsx`, etc. (Atualização de props para aceitar estilos)
- `src/pages/Index.tsx` (Remoção de wrappers)

### Novos Componentes
- `SectionEditorTabs`: Sub-componente para organizar o painel lateral.
- `DynamicStyleInjector`: HOC ou utilitário para aplicar estilos salvos no banco aos componentes de seção.

## Considerações de Design
- Manter a identidade visual da Coworking 013 (Montserrat, Laranja, Azul Escuro).
- Assegurar que as alterações de estilo persistam entre o preview e a publicação final.
