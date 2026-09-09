alter table public.clientes_corp
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists status_acesso text not null default 'pendente',
  add column if not exists sala_id uuid references public.salas(id) on delete set null;

alter table public.clientes_corp drop constraint if exists clientes_corp_status_acesso_check;
alter table public.clientes_corp add constraint clientes_corp_status_acesso_check check (status_acesso in ('pendente', 'aprovado', 'recusado'));

create unique index if not exists clientes_corp_user_id_unique on public.clientes_corp(user_id) where user_id is not null;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings(key, value) values ('auto_aprovar_cadastros', '{"enabled": false}'::jsonb) on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings" on public.app_settings for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Clients read own company" on public.clientes_corp;
create policy "Clients read own company" on public.clientes_corp for select using (user_id = auth.uid());
drop policy if exists "Clients update own company" on public.clientes_corp;
create policy "Clients update own company" on public.clientes_corp for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.clientes_corp to authenticated;
grant select on public.app_settings to authenticated;