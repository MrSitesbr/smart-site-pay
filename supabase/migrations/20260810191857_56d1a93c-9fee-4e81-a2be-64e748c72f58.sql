ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS descricao text;
CREATE TABLE IF NOT EXISTS public.plano_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid REFERENCES public.planos(id) ON DELETE CASCADE NOT NULL,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(plano_id, unidade_id)
);
GRANT ALL ON public.plano_unidades TO authenticated;
GRANT ALL ON public.plano_unidades TO service_role;
ALTER TABLE public.plano_unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access plano_unidades" ON public.plano_unidades FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
GRANT ALL ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
