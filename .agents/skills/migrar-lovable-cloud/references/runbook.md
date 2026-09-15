# Runbook de migração

## 1. Descoberta e baseline

1. Registre versões de Node, Supabase CLI e PostgreSQL.
2. Liste migrations e compare-as com o schema real; migrations históricas podem não representar ajustes manuais.
3. Exporte definições de schema, grants e políticas separadamente dos dados.
4. Liste usuários de Auth sem exibir hashes ou metadados sensíveis nos logs.
5. Conte linhas de todas as tabelas e objetos de todos os buckets.
6. Localize URLs e identificadores da origem no código e nos dados.
7. Registre um baseline de fluxos funcionais antes da migração.

**Sucesso:** o inventário cobre banco, Auth, Storage, funções, secrets por nome e dependências externas.

## 2. Criar o destino

Use preferencialmente Supabase externo. Crie ambientes separados para teste e produção. Configure região, domínio, URLs de redirecionamento, política de e-mail e backups.

Guarde no GitHub Environments/Secrets e na hospedagem:

- variáveis públicas do Vite como variáveis de build;
- conexão de banco, chave de serviço e secrets de funções somente como secrets de servidor;
- valores diferentes para teste e produção.

Nunca use secrets de produção em pull requests de forks.

**Sucesso:** o destino vazio responde, mas ainda não recebe tráfego público.

## 3. Reconstruir o schema

1. Crie extensões necessárias.
2. Crie enums.
3. Crie tabelas sem depender de ordem acidental.
4. Aplique chaves primárias, únicas, estrangeiras e índices.
5. Crie funções com `search_path` fixo.
6. Crie triggers.
7. Aplique GRANTs para `anon`, `authenticated` e `service_role` de acordo com as políticas.
8. Ative RLS e aplique todas as políticas.

Prefira consolidar uma migration-base auditável para instalações novas, sem apagar o histórico existente. Faça scripts idempotentes quando puderem ser reexecutados.

**Sucesso:** diff de schema esperado versus destino não mostra objetos ausentes ou permissões inesperadamente amplas.

## 4. Migrar Auth

Escolha uma estratégia explícita:

### Estratégia A — preservar senhas

Use somente exportação/importação oficialmente suportada pelo provedor, preservando UUID, e-mail, confirmação, metadados e hash. Não manipule hashes no frontend e não os grave no repositório.

### Estratégia B — redefinição segura

Importe usuários com os mesmos UUIDs quando suportado, marque o acesso conforme a regra do negócio e envie redefinição de senha pelo novo provedor. Não invente senhas temporárias compartilhadas.

Depois, restaure `user_roles` e confira `clientes_corp.user_id`.

**Sucesso:** admin e clientes de teste autenticam; pendentes e recusados continuam bloqueados; UUIDs relacionais permanecem válidos.

## 5. Migrar dados

1. Faça uma carga inicial em ambiente de teste.
2. Respeite a ordem das FKs; não desative integridade permanentemente.
3. Preserve UUIDs, timestamps, arrays, JSON/JSONB, enums e valores nulos.
4. Reinicie sequências se houver colunas sequenciais.
5. Compare contagem por tabela.
6. Compare checksums por lotes ordenados usando colunas estáveis, sem publicar dados pessoais.
7. Execute consultas de órfãos para todas as FKs e vínculos lógicos de Auth.

**Sucesso:** contagens batem ou cada diferença está documentada; não há órfãos inesperados.

## 6. Migrar Storage

1. Recrie `assets` e `client-docs` como privados.
2. Copie objetos preservando bucket e caminho.
3. Preserve Content-Type e metadata úteis.
4. Compare quantidade e bytes totais por bucket.
5. Faça hash de amostras e, para documentos, teste download autenticado.
6. Reaplique políticas por usuário/pasta.
7. Atualize apenas URLs absolutas persistidas; caminhos relativos devem permanecer.

**Sucesso:** objetos conferem e nenhum cliente acessa arquivos de outro.

## 7. Publicar funções

Publique os nove diretórios de `supabase/functions`. Antes de cada deploy:

1. Mapeie secrets usados por `Deno.env.get`.
2. Substitua dependências exclusivas do Lovable por serviços externos equivalentes.
3. Configure CORS para os domínios finais.
4. Mantenha autenticação e autorização no servidor.
5. Teste sucesso, falta de autenticação, falta de permissão, payload inválido e erro do provedor.

O `LOVABLE_API_KEY` não deve permanecer como dependência se a finalidade é independência total. Reimplemente a integração correspondente ou remova a função somente após confirmar que nenhuma tela depende dela.

**Sucesso:** todos os contratos HTTP usados pelo frontend retornam resultados equivalentes.

## 8. Reconfigurar frontend e automação

1. Configure as variáveis `VITE_SUPABASE_*` no ambiente de teste.
2. Não altere o cliente gerado além do necessário; a troca deve acontecer por ambiente.
3. Pesquise referências ao domínio/ID antigos em `src`, `public`, `supabase/functions`, workflows e dados CMS.
4. Crie workflow de CI para instalar, testar e compilar sem imprimir secrets.
5. Configure deploy externo do frontend e das funções.
6. Remova plugins Lovable do build somente se forem realmente necessários para produção e apenas depois de provar que o build externo funciona.

**Sucesso:** um clone limpo do GitHub compila e publica usando somente variáveis externas documentadas.

## 9. Testes obrigatórios

- site público, menus, páginas dinâmicas, blog e imagens;
- login admin e autorização por papel;
- cadastro de cliente, aprovação manual/automática e troca de senha;
- login do cliente, isolamento dos dados e edição do próprio perfil;
- colaboradores e visitantes;
- unidades, salas, planos e associações;
- reserva simples e recorrente, conflitos, feriados e cancelamento;
- calendário e Google Calendar;
- documentos privados e URLs assinadas;
- solicitações de plano e consumo de horas;
- chamados e mensagens de suporte;
- CMS, artigos, menus, cabeçalho/rodapé e construtor;
- financeiro, contratos, pendências, lista de espera e Woba.

Execute também build, testes, lint e verificação de tipos. Separe falhas preexistentes de regressões introduzidas pela migração.

## 10. Artefatos seguros

Adicione ao `.gitignore`:

```gitignore
migration-artifacts/private/
*.dump
*.backup
*.sql.gz
storage-export/
auth-export/
.env*
!.env.example
```

Antes de qualquer push, procure padrões de JWT, URLs com senha, chaves de serviço, cookies e arquivos de dump. Se um segredo tiver sido versionado, rotacione-o; apenas removê-lo do commit atual não basta.