# Plano de Implementação: Geração Automática de Páginas e Sincronização em Tempo Real

Este plano descreve a reestruturação das páginas públicas do Coworking 013 utilizando o novo **Construtor Dev (JSON)**, garantindo que todo o conteúdo seja dinâmico e editável via painel administrativo.

## Objetivos
- Gerar automaticamente as páginas Home, Salas & Espaços, Unidades e Contato com no mínimo 5 seções cada.
- Garantir que as seções de listagem (salas, unidades, planos) consumam dados reais do banco.
- Implementar sincronização reativa para que as alterações no admin reflitam instantaneamente no site.

## Etapas de Implementação

### 1. Backend e Estrutura de Dados
- Criar script SQL para inserir/atualizar as páginas na tabela `site_pages` (ou similar) com o layout JSON estruturado.
- Garantir que a tabela suporte o campo `dynamic-layout` para o Page Builder.

### 2. Páginas e Seções (JSON Dev)

#### Home (`/`)
1. **Hero**: Título impactante, CTA e fundo otimizado.
2. **Sobre Nós**: Layout de 2 colunas (institucional).
3. **Unidades & Salas**: Widget `units_grid` dinâmico.
4. **Diferenciais**: Grade de 4 colunas com ícones.
5. **Contato**: Widget de formulário integrado ao CRM.

#### Salas & Espaços (`/salas`)
1. **Banner**: Busca e filtros.
2. **Listagem**: Widget `rooms_grid` (capacidade, fotos, preços).
3. **Serviços**: Tabela comparativa de benefícios.
4. **Depoimentos**: Carrossel de avaliações.
5. **FAQ**: Acordeão de dúvidas frequentes.

#### Unidades (`/unidades`)
1. **Banner Hero**: Chamada visual.
2. **Grid de Unidades**: Widget `units_grid` com detalhes de endereço.
3. **Mapa**: Localização geográfica das unidades.
4. **Galeria**: Mídias da biblioteca central.
5. **Agendamento**: CTA para visita guiada.

#### Contato (`/contato`)
1. **Header**: Breadcrumb e título.
2. **Informações**: Colunas com WhatsApp, E-mail e Endereço.
3. **Formulário**: Captura de leads direta para o banco.
4. **Horários**: Tabela de funcionamento.
5. **CTA Final**: Link rápido para reserva.

### 3. Sincronização Reativa
- Ajustar o hook de carregamento no `DynamicPage.tsx` para garantir que os dados sejam buscados sem cache agressivo.
- Otimizar o `PageRenderer` para lidar com estados de carregamento e erros de rede.

## Detalhes Técnicos
- **Tecnologias**: React, Supabase (PostgREST), Tailwind CSS.
- **Componentes**: `PageRenderer`, `WidgetRegistry`, `CoworkingWidgets`.
- **Banco de Dados**: Migração via `supabase--migration` para popular as páginas padrão caso não existam.

---
**Nota**: Este processo não afetará as configurações de RLS já estabelecidas para o modo de bypass do administrador.
