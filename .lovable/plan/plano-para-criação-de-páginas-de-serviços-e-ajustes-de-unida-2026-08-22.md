# Plano para Criação de Páginas de Serviços e Ajustes de Unidades

O objetivo é garantir que todos os serviços principais tenham suas próprias páginas acessíveis pelo menu, enquanto serviços específicos de infraestrutura (café, água, internet, impressões) sejam detalhados individualmente dentro de cada unidade.

## 1. Criação e Configuração de Páginas de Serviços no Banco de Dados
- **Configurar as rotas no banco de dados**: Garantir que as tabelas `site_pages` e `site_sections` contenham as entradas para:
  - Escritório Privativo (`/escritorio-privativo`)
  - Consultório Privativo (`/consultorio-privativo`)
  - Auditório Modular (`/auditorio-modular`)
  - Endereço Virtual (`/endereco-virtual`)
- **Vincular ao Menu**: Atualizar a estrutura de menus (tabela `navigation_items`) para garantir que os itens cliquem e levem o usuário para essas rotas dinâmicas.

## 2. Ajuste na Exibição de Serviços por Unidade
- **Modificação no Componente de Unidade**: Ajustar o `PageRenderer` ou os widgets específicos de unidade para ler serviços de infraestrutura (café, água, fibra, impressões) a partir dos metadados da unidade selecionada.
- **Diferenciação**: Estes serviços não terão páginas globais, mas sim descrições detalhadas dentro de cada unidade no site.

## 3. Estruturação do Conteúdo no Page Builder
- Criar templates básicos para as novas páginas de serviços no construtor dinâmico para que o admin possa editá-los conforme necessário.

### Detalhes Técnicos
- Utilização da tabela `site_pages` para gerenciamento de rotas.
- O componente `DynamicPage.tsx` já está preparado para renderizar essas rotas; o foco será garantir que os dados existam e o menu esteja apontando corretamente.
- Inclusão de lógica de "Serviços da Unidade" na visualização detalhada da unidade.
