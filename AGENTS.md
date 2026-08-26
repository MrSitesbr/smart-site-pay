# Instrucoes para agentes de IA

## Contexto do projeto

Este repositorio foi iniciado no Lovable e e sincronizado com o GitHub. O frontend e uma aplicacao React + TypeScript + Vite. O backend usa Supabase, com a configuracao local em `.env` e o cliente em `src/integrations/supabase/client.ts`.

O projeto deve continuar compativel com o Lovable. Preserve as convencoes, componentes, rotas, estilos e integracoes existentes antes de introduzir novas abstracoes.

## Modo de trabalho: vibe code

- Entenda o objetivo do usuario e implemente a solucao diretamente no repositorio.
- Nao responda apenas com um plano ou tutorial quando a alteracao puder ser feita pelo agente.
- Comece pelo ponto de codigo mais proximo do comportamento pedido e leia apenas o contexto necessario.
- Reutilize componentes, hooks, tipos, helpers e padroes ja existentes.
- Mantenha o escopo pequeno e nao refatore partes sem relacao com a tarefa.
- Se houver mais de uma opcao razoavel, escolha a que exige menos mudancas e combina melhor com o codigo atual.
- Nao solicite login, senha, token, chave privada ou qualquer outro segredo ao usuario.
- Nao faca commit, push ou reset de git sem solicitacao explicita.
- Nunca descarte alteracoes feitas pelo usuario. Inspecione o estado do git antes de editar e trabalhe com mudancas existentes.
- Responda em portugues do Brasil, salvo se o usuario pedir outro idioma.

## Fluxo obrigatorio

1. Localize a implementacao, dado, rota ou componente que controla o comportamento.
2. Formule uma hipotese local sobre a causa ou o caminho correto.
3. Faca a menor alteracao testavel.
4. Execute uma validacao focada imediatamente apos a primeira alteracao.
5. Corrija problemas encontrados no mesmo escopo e valide novamente.
6. Informe arquivos alterados, resultado da validacao e qualquer limitacao real.

Antes de editar, faca uma busca objetiva. Depois de editar, nao continue explorando amplamente antes de executar o teste, build, lint ou verificacao mais barata disponivel.

## Supabase e dados do CMS

O projeto esta vinculado ao projeto Supabase `zhqelgjcvhpcjylaaesk`. A tabela de artigos do blog e `public.site_articles` e e usada pelo admin em `src/components/admin/AdminArtigos.tsx` e `src/components/admin/AdminArtigoDetalhe.tsx`.

Para operacoes simples de conteudo solicitadas pelo usuario, como criar, atualizar ou publicar um artigo:

- Use primeiro a API do Supabase ja configurada em `.env`, seguindo o mesmo contrato usado pelo frontend.
- Confirme a existencia pelo slug ou identificador antes de inserir, evitando duplicatas.
- Depois da escrita, consulte o registro novamente e confirme titulo, slug, status e identificador.
- Nao obrigue o usuario a abrir o SQL Editor, digitar SQL ou executar uma migration manual quando o agente puder realizar a operacao diretamente pela API.
- Nao use a chave publica para operacoes que exigem privilegio elevado. Se a API negar a operacao, explique o bloqueio e ofereca a alternativa mais curta e segura.
- Para mudancas estruturais de schema, alteracoes que precisam ser versionadas ou deploys repetidos, crie uma migration em `supabase/migrations/` e valide o SQL.
- Nao exponha valores de `.env` nas respostas. Chaves publicas podem ser usadas internamente quando ja estao configuradas, mas nunca solicite ou revele segredos.
- Artigos devem manter os campos existentes: `title`, `content` em HTML semantico, `author`, `excerpt`, `image_url`, `status`, `slug` e `seo_metadata` quando aplicavel.
- Conteudo HTML deve usar `<p>` para paragrafos e headings coerentes, sem markup quebrado ou scripts.
- Artigos publicados devem ter slug unico, excerpt, imagem adequada e metadados SEO consistentes.

## Comandos do projeto

Executar na raiz do repositorio:

```bash
npm install
npm run dev -- --host 0.0.0.0
npm run build
npm run lint
npm test
```

O preview local do Vite normalmente fica em `http://localhost:8080/`. Para uma migration versionada, o comando padrao, quando a CLI estiver instalada e o projeto estiver vinculado, e:

```bash
supabase db push
```

O agente deve preferir executar comandos de validacao automaticamente. Nao deve pedir ao usuario para executar comandos que o ambiente permite executar, exceto quando houver necessidade de credencial interativa ou acesso externo indisponivel.

## Frontend

- Preserve o sistema visual existente e os componentes em `src/components/ui`.
- Use os icones disponiveis em `lucide-react` em vez de desenhar SVG manualmente.
- Garanta estados de carregamento, erro, vazio e sucesso em fluxos interativos.
- Verifique responsividade em telas pequenas e grandes.
- Evite criar telas de marketing genericas quando a tarefa pede uma funcionalidade real.
- Nao adicione dependencias novas sem necessidade clara.

## Modelos de prompt para o usuario

### Alteracao geral

```text
Este projeto foi iniciado no Lovable e esta conectado ao Supabase.
Aja como vibe coder: analise o codigo existente e implemente diretamente a solucao completa.
Preserve os padroes atuais, valide a alteracao e me informe o resultado.
Nao me de apenas instrucoes para fazer manualmente.
```

### Criar ou alterar conteudo no Supabase

```text
Neste projeto Lovable conectado ao Supabase, crie/atualize diretamente o registro solicitado usando a API ja configurada no projeto.
Nao me envie para o SQL Editor e nao solicite login, senha ou chaves.
Use o mesmo formato dos registros existentes, evite duplicatas e confirme o resultado e a URL final.
```

### Alteracao visual

```text
No projeto Lovable, implemente diretamente esta alteracao visual: [descreva o resultado desejado].
Preserve o design existente, garanta responsividade e valide com build.
```

### Correcao de bug

```text
Investigue e corrija diretamente este problema no projeto Lovable: [descreva o comportamento atual e o esperado].
Encontre a causa raiz, faca a menor alteracao necessaria e rode uma validacao focada.
```

## Formato da resposta final

Seja objetivo e informe:

- o que foi feito;
- onde foi alterado;
- validacoes executadas e seus resultados;
- URL, ID ou proximo passo somente quando realmente necessario.

Nao apresente credenciais, segredos ou instrucoes desnecessariamente manuais.
