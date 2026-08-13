-- Desativa todas as seções que não são as oficiais do sistema Page Builder
-- Isso garante que seções antigas como 'hero', 'features', etc., não apareçam duplicadas
UPDATE public.site_sections 
SET is_visible = false 
WHERE section_key NOT IN ('dynamic-layout', 'navbar', 'footer', 'seo_global');

-- Garante que as seções oficiais estejam visíveis
UPDATE public.site_sections 
SET is_visible = true 
WHERE section_key IN ('dynamic-layout', 'navbar', 'footer');

-- Re-aplica as permissões para o modo bypass
GRANT ALL ON public.site_sections TO authenticated;
GRANT ALL ON public.site_sections TO anon;
GRANT ALL ON public.site_sections TO service_role;

GRANT ALL ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO anon;
GRANT ALL ON public.site_pages TO service_role;

GRANT ALL ON public.navigation_menus TO authenticated;
GRANT ALL ON public.navigation_menus TO anon;
GRANT ALL ON public.navigation_menus TO service_role;

GRANT ALL ON public.navigation_items TO authenticated;
GRANT ALL ON public.navigation_items TO anon;
GRANT ALL ON public.navigation_items TO service_role;