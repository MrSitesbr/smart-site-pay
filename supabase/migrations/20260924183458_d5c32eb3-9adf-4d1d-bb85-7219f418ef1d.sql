UPDATE public.site_sections AS section
SET content = jsonb_set(
  jsonb_set(section.content, '{layout,3,columns,0,widgets,0,styles,color}', to_jsonb('#FFFFFF'::text), true),
  '{layout,3,columns,0,widgets,0,styles,textColor}', to_jsonb('#FFFFFF'::text), true
)
WHERE section.page_id = (SELECT id FROM public.site_pages WHERE route = '/endereco-virtual' AND unidade_id IS NULL LIMIT 1)
  AND section.section_key = 'dynamic-layout';