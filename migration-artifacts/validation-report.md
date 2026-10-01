# Validation report — cutover para Supabase externo

Data: 2026-10-01
Destino: `rvotuxwzgbxpbrlwcqps`

## Dados

A exportação pública da origem foi comparada com o destino e as contagens conferem para as 13 tabelas exportadas. Os UUIDs e relações de páginas, seções, salas, planos, menus e itens foram preservados.

## Limitação da origem

A chave pública da origem retornou HTTP 401 para algumas tabelas protegidas por RLS: `client_colors`, `cliente_documentos`, `plano_solicitacoes`, `support_messages`, `support_tickets`, `user_roles` e `woba_closings`. O painel Lovable autenticado foi aberto, mas não forneceu uma exportação automatizada desses registros. Não foi possível afirmar que essas tabelas estão vazias sem uma consulta administrativa autenticada.

## Desacoplamento

- `supabase/config.toml` aponta para `rvotuxwzgbxpbrlwcqps`.
- O frontend usa variáveis `VITE_SUPABASE_*` e `localStorage`, sem broker de sessão do Lovable.
- Plugins, tagger e fallback de mídia do Lovable foram removidos do build.
- Edge Functions de reservas e disponibilidade usam somente Supabase.
- A função de calendário não chama mais o gateway da plataforma anterior; retorna integração não configurada até que um provedor Google externo seja configurado.
- README e instruções do Copilot foram atualizados para GitHub/Copilot + Supabase.

## Validação

- Build Vite: aprovado anteriormente e deve ser repetido após o desacoplamento.
- Schema/data counts: aprovados para o conjunto público exportado.
- Hospedagem externa: ainda requer publicação do frontend em uma plataforma escolhida; GitHub não hospeda o site sozinho.
