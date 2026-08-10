-- Atualizar tabela site_pages para suportar unidades
ALTER TABLE public.site_pages ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
ALTER TABLE public.site_pages ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Adicionar visibilidade e configurações extras em site_sections
ALTER TABLE public.site_sections ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;
ALTER TABLE public.site_sections ADD COLUMN IF NOT EXISTS settings Json DEFAULT '{}';

-- Garantir permissões
GRANT ALL ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;
GRANT ALL ON public.site_sections TO authenticated;
GRANT ALL ON public.site_sections TO service_role;

-- Adicionar unidade_id em planos
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE;
GRANT ALL ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
