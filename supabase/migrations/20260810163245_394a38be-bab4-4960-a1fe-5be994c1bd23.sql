CREATE TABLE IF NOT EXISTS public.servicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    preco text,
    categoria text,
    icon text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage services" ON public.servicos
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));