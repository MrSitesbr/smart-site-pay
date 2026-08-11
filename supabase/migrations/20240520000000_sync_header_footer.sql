-- Primeiro, garantir que as páginas globais existam
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM site_pages WHERE route = 'global-header') THEN
        INSERT INTO site_pages (name, route, is_global) VALUES ('Header', 'global-header', true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM site_pages WHERE route = 'global-footer') THEN
        INSERT INTO site_pages (name, route, is_global) VALUES ('Footer', 'global-footer', true);
    END IF;
END $$;

-- Garantir seções para o Header
DO $$
DECLARE
    header_id uuid;
BEGIN
    SELECT id INTO header_id FROM site_pages WHERE route = 'global-header';
    
    IF NOT EXISTS (SELECT 1 FROM site_sections WHERE page_id = header_id AND section_key = 'navbar') THEN
        INSERT INTO site_sections (page_id, section_key, content, order_index)
        VALUES (header_id, 'navbar', '{
            "logo_text_top": "CoWorking",
            "logo_text_bottom": "013",
            "phone": "(13) 98805-0358",
            "phone_href": "tel:13988050358",
            "links": [
                {"label": "Início", "href": "/", "route": true},
                {"label": "Serviços", "href": "#", "submenu": [
                    {"label": "Escritório Privativo", "href": "/escritorio-privativo", "route": true},
                    {"label": "Consultório Privativo", "href": "/consultorio-privativo", "route": true},
                    {"label": "Auditório Modular", "href": "/auditorio-modular", "route": true},
                    {"label": "Endereço Virtual", "href": "/endereco-virtual", "route": true}
                ]},
                {"label": "Unidades", "href": "/unidades", "route": true},
                {"label": "Institucional", "href": "/institucional", "route": true},
                {"label": "Contato", "href": "/#contato"}
            ]
        }'::jsonb, 0);
    END IF;
END $$;

-- Garantir seções para o Footer
DO $$
DECLARE
    footer_id uuid;
BEGIN
    SELECT id INTO footer_id FROM site_pages WHERE route = 'global-footer';
    
    IF NOT EXISTS (SELECT 1 FROM site_sections WHERE page_id = footer_id AND section_key = 'footer') THEN
        INSERT INTO site_sections (page_id, section_key, content, order_index)
        VALUES (footer_id, 'footer', '{
            "description": "O seu espaço de trabalho e networking na Praia Grande.",
            "phone": "(13) 98805-0358",
            "email": "contato@coworking013.com.br",
            "address_1": "Av. P. Costa e Silva, 609 - S. 906 - Boqueirão - Praia Grande - SP",
            "address_2": "R. São Caetano, 86 - Boqueirão - Praia Grande - SP",
            "address_3": "R. Jaú, 955 Conj. 26 - Boqueirão - Praia Grande - SP",
            "working_hours_week": "Seg. à Sex.: 08h às 21h",
            "working_hours_sat": "Sáb: 08h às 12h"
        }'::jsonb, 0);
    END IF;
END $$;
