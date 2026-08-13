GRANT ALL ON public.site_sections TO authenticated;
GRANT ALL ON public.site_sections TO anon;
GRANT ALL ON public.site_sections TO service_role;

UPDATE public.site_sections 
SET is_visible = false 
WHERE section_key NOT IN ('navbar', 'footer', 'dynamic-layout');
