# Coworking 013

Aplicação React + Vite com backend Supabase externo. O projeto é desenvolvido pelo GitHub/Copilot e não depende do Lovable Cloud.

## Supabase

- Projeto: `rvotuxwzgbxpbrlwcqps`
- URL: `https://rvotuxwzgbxpbrlwcqps.supabase.co`
- Variáveis necessárias: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge Functions usam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` configuradas como secrets no Supabase; nunca coloque secrets no frontend ou no Git.

Copie `.env.example` para `.env` e preencha a chave pública obtida no Supabase Dashboard.

## Desenvolvimento local

```sh
git clone https://github.com/MrSitesbr/smart-site-pay.git
cd smart-site-pay
npm install
cp .env.example .env
npm run dev
```

## Build e testes

```sh
npm run build
npm test
```

## Banco de dados

As alterações estruturais ficam em `supabase/migrations/`. A migration de migração inicial é `20260930150000_lovable_cloud_to_supabase_core.sql`. Dados exportados da origem foram importados preservando UUIDs e relações; dumps com dados pessoais não são versionados.

## Deploy

Publique o frontend em qualquer hospedagem Vite/Node (por exemplo, Cloudflare Pages, Vercel, Netlify ou um servidor próprio) usando as três variáveis `VITE_SUPABASE_*`. Publique as Edge Functions pelo Supabase CLI autenticado e configure seus secrets diretamente no projeto Supabase.

A integração Google Calendar é opcional e deve ser reimplementada com credenciais próprias do Google; o código não usa gateway ou chave do Lovable.
