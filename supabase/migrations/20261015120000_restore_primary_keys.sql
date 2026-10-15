-- Restaura ids e chaves primárias perdidas numa restauração do banco.
-- Sem valor padrão, novas linhas (ex.: reservas) eram gravadas com id nulo e o admin
-- não conseguia editá-las nem cancelá-las, pois o filtro por id não encontrava a linha.
DO $$
DECLARE
  t record;
  v_default text;
BEGIN
  FOR t IN
    SELECT c.table_name, c.data_type, c.column_default
      FROM information_schema.columns AS c
      JOIN information_schema.tables AS tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'id'
       AND c.data_type IN ('text', 'uuid', 'character varying')
  LOOP
    v_default := CASE WHEN t.data_type = 'uuid' THEN 'gen_random_uuid()' ELSE 'gen_random_uuid()::text' END;

    EXECUTE format('UPDATE public.%I SET id = %s WHERE id IS NULL', t.table_name, v_default);
    IF t.column_default IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT %s', t.table_name, v_default);
    END IF;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET NOT NULL', t.table_name);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid = format('public.%I', t.table_name)::regclass AND contype = 'p'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (id)', t.table_name);
    END IF;
  END LOOP;
END $$;
