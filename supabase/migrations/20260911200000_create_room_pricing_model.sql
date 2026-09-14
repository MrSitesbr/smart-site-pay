-- Room categories, rental types, status and per-room prices.
-- Keep these values as text: the frontend already uses these stable keys.

alter table public.salas
  add column if not exists categoria text,
  add column if not exists tipo_locacao text,
  add column if not exists subtipo_periodo text,
  add column if not exists preco_locacao_mensal numeric,
  add column if not exists preco_periodo_pacote_mensal numeric,
  add column if not exists preco_periodo_locacao_avulsa numeric;

-- Replace the legacy catalog status with the room-specific workflow status.
alter table public.salas drop constraint if exists salas_status_check;

-- Convert legacy status values to the new room workflow status.
update public.salas
set status = case
  when status = 'ativa' then 'disponivel'
  when status = 'inativa' then 'indisponivel'
  else status
end
where status is null
   or status not in ('disponivel', 'indisponivel', 'oculto')
   or status in ('ativa', 'inativa');

alter table public.salas
  alter column status set default 'disponivel';

alter table public.salas
  add constraint salas_status_check check (status in ('disponivel', 'indisponivel', 'oculto'));

-- Backfill only empty fields so manual corrections remain untouched.
update public.salas
set categoria = case
  when tipo ilike '%maca%' then 'consultorio_maca'
  when tipo ilike '%consult%' then 'consultorio_poltrona'
  when tipo ilike '%compartilhado%' or tipo ilike '%coworking%' or tipo ilike '%compartilh%' then 'compartilhado'
  when tipo ilike '%privativ%' then 'privativa'
  else 'privativa'
end
where categoria is null or categoria = '';

update public.salas
set tipo_locacao = 'locacao_mensal'
where tipo_locacao is null or tipo_locacao = '';
