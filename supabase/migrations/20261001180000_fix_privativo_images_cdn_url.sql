-- As imagens das páginas /escritorio-privativo e /consultorio-privativo apontavam
-- para o WordPress antigo (coworking013.com.br/wp-content/...), que hoje responde
-- com o index.html do SPA em vez do PNG. Gravamos o caminho relativo do asset no
-- CDN do Lovable, mesma convenção dos manifests em src/assets/*.asset.json, para
-- que o resolveMediaUrl (src/lib/asset-host.ts) prependa o host na hora do render.
--
-- Idempotente: reexecutar não altera nada quando as URLs já estão corretas.

UPDATE public.site_sections AS section
SET content = jsonb_set(
  section.content,
  '{layout,1,columns,0,widgets,0,content,image}',
  to_jsonb('/__l5e/assets-v1/542a0cff-f2ce-4e6e-88d2-ea33eb294780/escritorio-cow013.png'::text),
  false
)
WHERE section.section_key = 'dynamic-layout'
  AND EXISTS (
    SELECT 1 FROM public.site_pages AS page
    WHERE page.id = section.page_id AND page.route = '/escritorio-privativo'
  )
  AND section.content #>> '{layout,1,columns,0,widgets,0,content,image}'
    LIKE '%escritorio-cow013.png';

UPDATE public.site_sections AS section
SET content = jsonb_set(
  section.content,
  '{layout,1,columns,0,widgets,0,content,image}',
  to_jsonb('/__l5e/assets-v1/f17419ac-8bae-42cd-8c0d-784d6201d739/consultorio-cow013.png'::text),
  false
)
WHERE section.section_key = 'dynamic-layout'
  AND EXISTS (
    SELECT 1 FROM public.site_pages AS page
    WHERE page.id = section.page_id AND page.route = '/consultorio-privativo'
  )
  AND section.content #>> '{layout,1,columns,0,widgets,0,content,image}'
    LIKE '%consultorio-cow013.png';