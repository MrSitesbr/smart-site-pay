# Inventário conhecido da origem

Use esta lista como ponto de partida e confirme tudo novamente no momento da migração. O banco é a fonte de verdade; este arquivo pode ficar desatualizado.

## Stack dependente do backend atual

- React 18 + TypeScript + Vite.
- Cliente: `@supabase/supabase-js`.
- Configuração do cliente: `src/integrations/supabase/client.ts` (arquivo gerado; prefira trocar variáveis de ambiente, não reescrevê-lo).
- Schema versionado: `supabase/migrations/`.
- Funções: `supabase/functions/`.
- Variáveis públicas esperadas pelo frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e, quando usado pela configuração existente, `VITE_SUPABASE_PROJECT_ID`.

## Tabelas públicas

Confirme colunas, defaults, chaves, constraints, índices, grants e políticas de cada uma:

1. `app_settings`
2. `checkins`
3. `client_colors`
4. `cliente_documentos`
5. `clientes_corp`
6. `contract_requests`
7. `contratos_ativos`
8. `funcionarios_cliente`
9. `media_library`
10. `navigation_items`
11. `navigation_menus`
12. `pendencias`
13. `plano_solicitacoes`
14. `plano_unidades`
15. `planos`
16. `reservations`
17. `sala_planos`
18. `salas`
19. `servicos`
20. `site_articles`
21. `site_pages`
22. `site_sections`
23. `support_messages`
24. `support_tickets`
25. `unidades`
26. `user_roles`
27. `visitantes`
28. `waiting_list`
29. `woba_closings`

## Enums públicos

- `ambiente_tipo`: `estacao`, `sala_privativa`, `sala_reuniao`
- `app_role`: `admin`, `user`
- `reserva_status`: `pendente`, `confirmada`, `realizada`, `cancelada`
- `reserva_tipo`: `hora`, `diaria`

## Funções e triggers públicos

- `current_cliente_id()` — resolve o cliente de `auth.uid()`; `SECURITY DEFINER`.
- `has_role(uuid, app_role)` — consulta `user_roles`; `SECURITY DEFINER`.
- `set_updated_at()` — atualiza `updated_at`.

O trigger de atualização existe hoje em:

- `app_settings`
- `client_colors`
- `cliente_documentos`
- `contract_requests`
- `pendencias`
- `plano_solicitacoes`
- `reservations`
- `support_tickets`
- `woba_closings`

## Edge Functions

Migre cada diretório e preserve seu nome público:

1. `admin-set-client-password`
2. `check-availability`
3. `client-access-status`
4. `client-signup`
5. `create-reservation`
6. `proxy-image`
7. `reset-admin-password`
8. `sync-google-calendar`
9. `update-reservation-status`

Mapeie para cada função: autenticação exigida, CORS, payload, resposta, tabelas acessadas, secrets e integração externa. Não presuma que deploy bem-sucedido significa execução correta.

## Storage

- `assets` — privado.
- `client-docs` — privado e contém documentos específicos por cliente.

Preserve caminhos dos objetos porque registros como `cliente_documentos.storage_path` podem referenciá-los. Audite também referências a URLs antigas dentro de `media_library`, `site_sections`, campos de galeria, artigos e JSON do construtor de páginas.

## Auth e relacionamentos críticos

- `clientes_corp.user_id` aponta logicamente para o UUID de Auth.
- `user_roles.user_id` depende do mesmo UUID.
- `contract_requests.user_id` possui vínculo com Auth.
- RLS usa `auth.uid()`, `current_cliente_id()` e `has_role()`.
- Migre identidades antes ou junto dos dados que dependem desses UUIDs.

## Secrets por nome

Recrie no destino apenas os nomes realmente utilizados. Nunca registre os valores:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `LOVABLE_API_KEY` — elimine ou substitua se for específico do gateway Lovable.
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWKS`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

Pesquise também secrets de integrações adicionados depois deste inventário. Variáveis nativas do novo backend devem ser geradas pelo destino, não copiadas da origem.

## Dependências que exigem atenção

- Autenticação administrativa temporária/bypass existente no projeto: não a perpetue como arquitetura final. Migre o admin para Auth e `user_roles` com validação no servidor.
- Imagens Base64 podem existir em colunas do banco e aumentar o dump; valide tamanho e integridade.
- Conteúdo JSON pode conter URLs absolutas da origem.
- Sincronização com Google Calendar exige secrets e URLs de retorno válidas no novo domínio.
- URLs assinadas de Storage não são portáveis; gere novas URLs em tempo de uso.