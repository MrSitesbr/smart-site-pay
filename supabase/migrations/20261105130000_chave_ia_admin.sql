-- Chave da IA (OpenRouter) cadastrada pelo admin na aba Chatbot.
-- Fica numa tabela sem acesso pelo navegador: o admin só grava (nunca lê de volta a chave);
-- quem lê é a função do servidor (service_role). Também remove a antiga chave da Mistral,
-- que ficava em site_sections (área de leitura pública).

create table if not exists public.ia_segredos (
  id smallint primary key default 1 check (id = 1),
  openrouter_key text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.ia_segredos enable row level security;
revoke all on public.ia_segredos from anon, authenticated;
grant all on public.ia_segredos to service_role;

-- Salvar ou remover (texto vazio) a chave. Só admin.
create or replace function public.admin_salvar_chave_ia(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := nullif(btrim(coalesce(p_chave, '')), '');
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso negado';
  end if;
  if v is not null and (length(v) < 20 or length(v) > 300 or v ~ '\s') then
    raise exception 'Chave inválida';
  end if;
  insert into public.ia_segredos (id, openrouter_key, updated_at, updated_by)
  values (1, v, now(), auth.uid())
  on conflict (id) do update set openrouter_key = excluded.openrouter_key, updated_at = now(), updated_by = auth.uid();
  return jsonb_build_object('configurada', v is not null, 'final', case when v is null then null else right(v, 4) end);
end;
$$;

-- Situação da chave sem revelá-la (só os 4 últimos caracteres). Só admin.
create or replace function public.admin_status_chave_ia()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.ia_segredos;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso negado';
  end if;
  select * into r from public.ia_segredos where id = 1;
  return jsonb_build_object(
    'configurada', r.openrouter_key is not null,
    'final', case when r.openrouter_key is null then null else right(r.openrouter_key, 4) end,
    'atualizada_em', r.updated_at
  );
end;
$$;

revoke all on function public.admin_salvar_chave_ia(text) from public, anon;
revoke all on function public.admin_status_chave_ia() from public, anon;
grant execute on function public.admin_salvar_chave_ia(text) to authenticated;
grant execute on function public.admin_status_chave_ia() to authenticated;

-- A chave da Mistral deixa de ser usada e não deve ficar em área pública.
update public.site_sections
   set content = content - 'mistral_api_key'
 where section_key = 'global_settings'
   and content ? 'mistral_api_key';

notify pgrst, 'reload schema';
