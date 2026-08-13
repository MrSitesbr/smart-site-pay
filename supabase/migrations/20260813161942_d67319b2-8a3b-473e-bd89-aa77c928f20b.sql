-- Limpar entradas dinâmicas anteriores para evitar duplicidade
DELETE FROM public.site_sections WHERE section_key = 'dynamic-layout';

-- Inserir Layout Dinâmico enriquecido (5+ seções) para Home (/)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    { "id": "hero", "settings": {"fullWidth": true, "padding": {"top": 120, "bottom": 120}}, "columns": [{"id": "col-hero", "widthPercentage": 100, "widgets": [{"id": "w-hero", "type": "heading", "content": {"text": "Coworking 013: Seu Espaço de Sucesso", "level": "h1"}, "styles": {"alignment": "center"}}]}]},
    { "id": "sobre", "settings": {"padding": {"top": 80, "bottom": 80}}, "columns": [{"id": "col-sobre", "widthPercentage": 100, "widgets": [{"id": "w-sobre", "type": "text", "content": {"text": "Sobre o Coworking 013 - inovação e conexões em Santos."}, "styles": {}}]}]},
    { "id": "salas", "settings": {"padding": {"top": 80, "bottom": 80}}, "columns": [{"id": "col-salas", "widthPercentage": 100, "widgets": [{"id": "w-salas", "type": "rooms_grid", "content": {}, "styles": {}}]}]},
    { "id": "unidades", "settings": {"padding": {"top": 80, "bottom": 80}}, "columns": [{"id": "col-unidades", "widthPercentage": 100, "widgets": [{"id": "w-unidades", "type": "units_grid", "content": {}, "styles": {}}]}]},
    { "id": "contato", "settings": {"padding": {"top": 80, "bottom": 80}}, "columns": [{"id": "col-contato", "widthPercentage": 100, "widgets": [{"id": "w-contato", "type": "form", "content": {"formType": "contato"}, "styles": {}}]}]}
  ]
}', '{}', 0 FROM page_ref;

-- Inserir Layout Dinâmico enriquecido (5+ seções) para Salas (/salas)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/salas')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    { "id": "h1", "settings": {"padding": {"top": 60, "bottom": 60}}, "columns": [{"id": "c1", "widthPercentage": 100, "widgets": [{"id": "w1", "type": "heading", "content": {"text": "Todas as Salas", "level": "h1"}, "styles": {"alignment": "center"}}]}]},
    { "id": "filtro", "settings": {"padding": {"top": 20, "bottom": 20}}, "columns": [{"id": "c2", "widthPercentage": 100, "widgets": [{"id": "w2", "type": "text", "content": {"text": "Filtre por tipo de sala"}, "styles": {}}]}]},
    { "id": "grid", "settings": {"padding": {"top": 40, "bottom": 40}}, "columns": [{"id": "c3", "widthPercentage": 100, "widgets": [{"id": "w3", "type": "rooms_grid", "content": {}, "styles": {}}]}]},
    { "id": "promo", "settings": {"padding": {"top": 40, "bottom": 40}}, "columns": [{"id": "c4", "widthPercentage": 100, "widgets": [{"id": "w4", "type": "text", "content": {"text": "Promoção de horas avulsas!"}, "styles": {}}]}]},
    { "id": "cta", "settings": {"padding": {"top": 60, "bottom": 60}}, "columns": [{"id": "c5", "widthPercentage": 100, "widgets": [{"id": "w5", "type": "button", "content": {"text": "Reservar Agora", "url": "/reservar"}, "styles": {}}]}]}
  ]
}', '{}', 0 FROM page_ref;
