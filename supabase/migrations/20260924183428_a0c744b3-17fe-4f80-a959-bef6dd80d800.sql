UPDATE public.site_sections AS section
SET content = jsonb_set(section.content, '{layout,5,columns,0,widgets,2,content,type}', to_jsonb('Endereço Virtual'::text), false)
WHERE section.page_id = (SELECT id FROM public.site_pages WHERE route = '/endereco-virtual' AND unidade_id IS NULL LIMIT 1)
  AND section.section_key = 'dynamic-layout'
  AND section.content #>> '{layout,5,columns,0,widgets,2,type}' = 'plans_grid';