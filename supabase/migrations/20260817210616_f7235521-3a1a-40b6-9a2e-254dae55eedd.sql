UPDATE public.site_sections
SET section_key = 'dynamic-layout'
WHERE page_id = (SELECT id FROM public.site_pages WHERE route = '/institucional' LIMIT 1)
AND section_key = 'institucional';