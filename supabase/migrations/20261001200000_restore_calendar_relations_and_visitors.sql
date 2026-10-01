BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS salas_id_unique_idx
  ON public.salas (id);

CREATE UNIQUE INDEX IF NOT EXISTS clientes_corp_id_unique_idx
  ON public.clientes_corp (id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.salas'::regclass
      AND conname = 'salas_unidade_id_fkey'
  ) THEN
    ALTER TABLE public.salas
      ADD CONSTRAINT salas_unidade_id_fkey
      FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.reservations'::regclass
      AND conname = 'reservations_sala_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_sala_id_fkey
      FOREIGN KEY (sala_id) REFERENCES public.salas(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.visitantes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_corp_id text REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
  sala_id text REFERENCES public.salas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  documento text,
  data_hora_prevista timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitantes_sala_data
  ON public.visitantes (sala_id, data_hora_prevista);

ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitantes TO authenticated;
GRANT ALL ON public.visitantes TO service_role;

DROP POLICY IF EXISTS "Admins full access visitantes" ON public.visitantes;
CREATE POLICY "Admins full access visitantes"
  ON public.visitantes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients manage own visitors" ON public.visitantes;
CREATE POLICY "Clients manage own visitors"
  ON public.visitantes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes_corp
      WHERE clientes_corp.id = visitantes.cliente_corp_id
        AND clientes_corp.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes_corp
      WHERE clientes_corp.id = visitantes.cliente_corp_id
        AND clientes_corp.user_id = auth.uid()::text
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;