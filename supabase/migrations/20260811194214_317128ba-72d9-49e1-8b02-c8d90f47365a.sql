alter table public.clientes_corp add column if not exists documentos text[];
grant select, insert, update, delete on public.clientes_corp to authenticated;
grant select, insert, update, delete on public.clientes_corp to anon;
grant all on public.clientes_corp to service_role;
