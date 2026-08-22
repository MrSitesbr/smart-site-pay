# Plano de Implementação: Blog/Artigos WordPress-Style com IA Mistral

O objetivo é transformar a área de artigos em um sistema robusto de gerenciamento de conteúdo (CMS) similar ao WordPress, integrando um editor rico e um agente de IA Mistral para geração de conteúdo.

## 1. Banco de Dados (Supabase)
*   Verificar/Atualizar a tabela `site_articles` para garantir suporte a conteúdo HTML rico.
*   Garantir permissões RLS.

## 2. Editor de Texto (Frontend)
*   Implementar `AdminArtigoDetalhe.tsx` para edição em tela cheia (como o Dev Builder).
*   Usar `react-quill` para suporte a:
    *   Formatação de texto (Negrito, Itálico, H1-H3).
    *   Inserção de tabelas.
    *   Inserção de imagens (integrado à Biblioteca de Mídias/Base64).
*   Adicionar botão "IA Mistral" na barra de ferramentas do editor.

## 3. Integração Mistral AI
*   Adicionar campo `mistral_api_key` em `AdminSettings.tsx`.
*   Criar um agente de IA que gera artigos de "cauda longa" (Começo, Meio e Fim) baseado em um tema/título.
*   Fluxo: Usuário clica no ícone -> Digita o tema -> IA gera o texto -> Insere no editor.

## 4. Gerenciamento no Admin
*   Atualizar `AdminArtigos.tsx` para abrir o novo editor em tela cheia ao clicar em "Novo" ou "Editar".
*   Garantir que os artigos existentes sejam compatíveis com o novo formato.

## 5. UI/UX
*   Manter a consistência visual "Coworking 013".
*   Popups com barra de rolagem (usando `DialogScrollContent` se necessário).

---
*Este plano foca em transformar o blog em uma ferramenta profissional de SEO e conteúdo.*
