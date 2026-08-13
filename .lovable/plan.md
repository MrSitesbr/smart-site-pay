# Gerenciamento Dinâmico de Menus

Implementada a infraestrutura de navegação dinâmica inspirada no WordPress, permitindo controle total sobre os menus do cabeçalho e rodapé.

### Novas Funcionalidades:
- **Editor de Menus (Admin):** Localizado em **Marketing / Site > Menus**.
- **Interface Intuitiva:** Arrastar e soltar (lógica de ordem), edição de labels e links.
- **Suporte a Submenus:** Criação de hierarquias para menus dropdown.
- **Integração com Páginas:** Seleção direta de rotas existentes ou links externos.
- **Sincronização em Tempo Real:** Alterações no admin refletem instantaneamente no `Navbar` e `Footer` do site.

### Estrutura Técnica:
- **Tabelas Supabase:** `navigation_menus` e `navigation_items`.
- **Componente AdminMenus:** CRUD completo para a estrutura de navegação.
- **Navbar/Footer Dinâmicos:** Consumo via Data API com fallbacks resilientes.

O admin agora pode renomear botões, trocar links e reorganizar a navegação sem tocar no código.
