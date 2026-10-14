-- O formulário de edição de reservas do admin grava "Notas do admin" em reservations.admin_notes,
-- mas a coluna não existia na tabela, fazendo o update falhar com PGRST204.
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS admin_notes text;

NOTIFY pgrst, 'reload schema';
