-- Add telefone column to funcionarios_cliente if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'funcionarios_cliente' and column_name = 'telefone') then
    alter table public.funcionarios_cliente add column telefone text;
  end if;
end $$;

-- Update RLS grants to ensure the new column is accessible
grant select, insert, update, delete on public.funcionarios_cliente to authenticated;
grant select, insert, update, delete on public.funcionarios_cliente to anon;
grant all on public.funcionarios_cliente to service_role;