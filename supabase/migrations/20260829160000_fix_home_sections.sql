-- Corrigir seções da home que sumiram
-- Remove a seção dynamic-layout atual da home para evitar conflitos
DELETE FROM public.site_sections 
WHERE page_id = (SELECT id FROM public.site_pages WHERE route = '/')
AND section_key = 'dynamic-layout';

-- Recria a seção dynamic-layout da home com todas as seções necessárias
WITH home_page AS (SELECT id FROM public.site_pages WHERE route = '/' LIMIT 1)
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index, is_visible)
SELECT 
    hp.id,
    'dynamic-layout',
    '{
        "layout": [
            {
                "id": "hero_1",
                "type": "hero",
                "content": {
                    "title": "Seu espaço de trabalho inteligente no coração de Santos",
                    "subtitle": "No Coworking 013, oferecemos infraestrutura completa para você focar no que realmente importa: seu negócio.",
                    "image": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80",
                    "cta": "Conhecer Planos",
                    "ctaUrl": "/reservar",
                    "desktopColumns": false
                },
                "settings": { "padding": "py-24", "maxWidth": "max-w-7xl" }
            },
            {
                "id": "features_1",
                "type": "features",
                "content": {
                    "title": "Por que escolher o 013?",
                    "items": [
                        { "title": "Internet Fibra", "description": "Conexão de ultra velocidade redundante.", "icon": "Wifi" },
                        { "title": "Café à Vontade", "description": "Café premium liberado o dia todo.", "icon": "Coffee" },
                        { "title": "Localização", "description": "Fácil acesso no centro da cidade.", "icon": "MapPin" }
                    ]
                },
                "settings": { "padding": "py-16", "background": "bg-gray-50" }
            },
            {
                "id": "units_grid_1",
                "type": "units_grid",
                "content": { "title": "Nossas Unidades", "subtitle": "Escolha a unidade mais próxima de você.", "limit": 3 },
                "settings": { "padding": "py-16" }
            },
            {
                "id": "ideal_para_1",
                "type": "ideal_para",
                "content": {
                    "title": "Soluções para você",
                    "services": [
                        { "title": "Freelancers", "description": "Estações individuais flexíveis.", "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80" },
                        { "title": "Empresas", "description": "Salas privativas corporativas.", "image": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80" }
                    ]
                },
                "settings": { "padding": "py-16", "background": "bg-white" }
            },
            {
                "id": "plans_grid_1",
                "type": "plans_grid",
                "content": { "title": "Planos e Preços", "subtitle": "Valores que cabem no seu bolso.", "limit": 4 },
                "settings": { "padding": "py-16", "background": "bg-gray-50" }
            }
        ]
    }'::jsonb,
    '{}'::jsonb,
    0,
    true
FROM home_page hp
WHERE NOT EXISTS (
    SELECT 1 FROM public.site_sections 
    WHERE page_id = hp.id AND section_key = 'dynamic-layout'
);

-- Reativa todas as seções para garantir que nada mais está oculto
UPDATE public.site_sections 
SET is_visible = true 
WHERE page_id = (SELECT id FROM public.site_pages WHERE route = '/');
