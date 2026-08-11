-- 1. Ensure column exists
ALTER TABLE public.site_pages ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 2. Grants
GRANT ALL ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;
GRANT ALL ON public.site_sections TO authenticated;
GRANT ALL ON public.site_sections TO service_role;

-- 3. Seed Header
INSERT INTO public.site_pages (name, route, is_global)
VALUES ('Header', 'global-header', true)
ON CONFLICT (route) DO UPDATE SET is_global = true;

-- 4. Seed Footer
INSERT INTO public.site_pages (name, route, is_global)
VALUES ('Footer', 'global-footer', true)
ON CONFLICT (route) DO UPDATE SET is_global = true;

-- 5. Seed Header Section
INSERT INTO public.site_sections (page_id, section_key, content, order_index)
SELECT id, 'navbar', '{
  "logo_text_top": "CoWorking",
  "logo_text_bottom": "013",
  "phone": "(13) 98805-0358",
  "phone_href": "tel:13997440130",
  "links": [
    {"label": "Início", "href": "/"},
    {"label": "Unidades", "href": "/unidades"},
    {"label": "Institucional", "href": "/institucional"},
    {"label": "Contato", "href": "/#contato"}
  ]
}'::jsonb, 0
FROM public.site_pages WHERE route = 'global-header'
ON CONFLICT (page_id, section_key) DO NOTHING;

-- 6. Seed Footer Section
INSERT INTO public.site_sections (page_id, section_key, content, order_index)
SELECT id, 'footer', '{
  "description": "O seu espaço de trabalho e networking na Praia Grande.",
  "phone": "(13) 98805-0358",
  "email": "contato@coworking013.com.br",
  "address_1": "Av. P. Costa e Silva, 609 - S. 906 - Boqueirão - Praia Grande - SP",
  "address_2": "R. São Caetano, 86 - Boqueirão - Praia Grande - SP",
  "address_3": "R. Jaú, 955 Conj. 26 - Boqueirão - Praia Grande - SP",
  "working_hours_week": "Seg. à Sex.: 08h às 21h",
  "working_hours_sat": "Sáb: 08h às 12h"
}'::jsonb, 0
FROM public.site_pages WHERE route = 'global-footer'
ON CONFLICT (page_id, section_key) DO NOTHING;
