-- Add galeria column to units and rooms to store multiple image URLs
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS galeria text[] DEFAULT '{}';
ALTER TABLE public.salas ADD COLUMN IF NOT EXISTS galeria text[] DEFAULT '{}';

-- Reset grants to ensure admin can access
GRANT ALL ON public.unidades TO authenticated;
GRANT ALL ON public.salas TO authenticated;
GRANT ALL ON public.unidades TO service_role;
GRANT ALL ON public.salas TO service_role;
