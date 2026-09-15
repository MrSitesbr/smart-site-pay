---
name: migrar-lovable-cloud
description: Migra integralmente este projeto do Lovable Cloud para um backend externo administrado pelo GitHub/Copilot. Use em pedidos de exportação, clonagem, independência do Lovable, novo banco, migração de usuários, Storage, Edge Functions ou troca das variáveis Supabase.
---

# Migração completa do Lovable Cloud

## Objetivo

Transfira schema, dados, autenticação, arquivos, políticas e funções deste projeto para uma infraestrutura externa, mantendo o site e o admin funcionando. O GitHub hospeda o código; ele não hospeda banco. Use por padrão um projeto Supabase externo, pois o frontend já usa `@supabase/supabase-js`, Auth, Storage, RLS e Edge Functions. Só escolha outro provedor se o usuário o indicar e aceitar a reimplementação desses serviços.

## Antes de executar

1. Leia `AGENTS.md` e preserve as regras do repositório.
2. Leia `references/inventario.md` para conhecer o estado que precisa ser migrado.
3. Leia `references/runbook.md` e siga as fases em ordem.
4. Para a virada de produção, leia `references/cutover.md`.
5. Nunca grave URLs privadas, senhas, tokens, chaves JWT, chaves de serviço ou conexões de banco no Git. Use secrets do GitHub e variáveis do provedor de hospedagem.
6. Não altere nem desligue a origem antes de validar integralmente o destino.
7. Não execute exclusões, redefinições, revogações ou uma virada irreversível sem aprovação explícita.

## Entradas necessárias

Obtenha sem registrar valores secretos:

- exportação/backup do banco de origem;
- exportação dos objetos dos buckets `assets` e `client-docs`;
- URL, chave pública e credenciais administrativas do destino;
- domínio final e plataforma onde o frontend será hospedado;
- decisão sobre migração de senhas: preservar hashes quando o mecanismo permitir ou exigir redefinição segura;
- credenciais das integrações externas usadas pelas funções, configuradas diretamente no destino.

Se alguma entrada depender de acesso que o agente não possui, pare somente nessa etapa e descreva exatamente o artefato necessário. Nunca peça que um segredo seja colado no chat ou salvo em arquivo versionado.

## Workflow obrigatório

1. **Inventariar** — compare migrations, schema real, enums, funções, triggers, RLS, grants, usuários, buckets, objetos, Edge Functions e secrets por nome.
2. **Preparar destino** — crie um projeto vazio e registre credenciais apenas em ambiente seguro.
3. **Reconstruir estrutura** — restaure extensões, enums, tabelas, sequências, constraints, índices, funções, triggers, grants e RLS, nessa ordem segura.
4. **Migrar autenticação** — preserve UUIDs de usuários para não quebrar `clientes_corp.user_id` e `user_roles.user_id`. Preserve hashes somente por mecanismo oficialmente suportado; caso contrário, programe redefinição de senha.
5. **Migrar dados** — copie tabelas respeitando dependências e compare contagens e checksums.
6. **Migrar Storage** — recrie buckets privados, copie todos os objetos preservando caminhos, MIME types e políticas.
7. **Migrar funções** — publique todas as funções em `supabase/functions/`, configure secrets e teste os contratos HTTP.
8. **Reconfigurar aplicação** — altere somente variáveis de ambiente para apontar ao destino sempre que possível. Não espalhe URLs/chaves pelo código.
9. **Ensaiar** — execute o site contra o destino em ambiente de teste e valide os fluxos críticos.
10. **Virar produção** — faça backup final, congele escritas, aplique delta, troque variáveis, publique e monitore.
11. **Encerrar origem** — mantenha-a disponível para rollback durante a janela acordada; remova a dependência somente após aceite formal.

## Invariantes de segurança

- Preserve RLS no destino. Não substitua isolamento por permissões públicas para “fazer funcionar”.
- Papéis continuam na tabela `public.user_roles`; nunca mova papel administrativo para perfil ou armazenamento do navegador.
- Funções `SECURITY DEFINER` devem fixar `search_path` e ter permissões mínimas.
- Buckets `assets` e `client-docs` continuam privados, salvo decisão explícita e documentada.
- Não exponha `service_role`, conexão PostgreSQL ou secrets de funções ao Vite/browser.
- Não copie secrets do ambiente de origem para arquivos do repositório. Recrie-os no destino.
- Não declare sucesso apenas porque o schema importou; autenticação, arquivos, funções e isolamento entre clientes também precisam passar.

## Critérios de conclusão

A migração só termina quando:

- schema, políticas, funções e triggers do destino correspondem ao inventário;
- todas as tabelas têm a mesma contagem de registros esperada e amostras relacionais válidas;
- todos os usuários preservam vínculo e conseguem entrar ou receberam fluxo seguro de redefinição;
- os objetos dos dois buckets foram conferidos por quantidade, caminho, tamanho e amostra de hash;
- todas as nove Edge Functions estão publicadas e testadas;
- site público, cadastro, login do cliente, admin, reservas, calendário, CMS, documentos e suporte funcionam no destino;
- um usuário não consegue ler ou alterar dados/documentos de outro cliente;
- o build e os testes passam;
- o rollback foi ensaiado ou documentado com variáveis anteriores preservadas em cofre seguro;
- não há referência operacional obrigatória ao Lovable Cloud.

## Entrega

Gere e mantenha durante a execução:

- `migration-artifacts/inventory.md` sem valores secretos;
- `migration-artifacts/source-counts.json` e `destination-counts.json`;
- `migration-artifacts/validation-report.md`;
- scripts idempotentes em `scripts/migration/`;
- `.env.example` apenas com nomes de variáveis e valores fictícios;
- instruções de deploy externo no `README.md` ou documento específico.

Não versione dumps com dados pessoais, cópias dos buckets, sessions, cookies ou credenciais.