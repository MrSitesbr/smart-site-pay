-- First, identify the page IDs
DO $$ 
DECLARE
    home_id uuid;
    salas_id uuid;
    unidades_id uuid;
    contato_id uuid;
BEGIN
    SELECT id INTO home_id FROM site_pages WHERE route = '/';
    SELECT id INTO salas_id FROM site_pages WHERE route = '/salas';
    SELECT id INTO unidades_id FROM site_pages WHERE route = '/unidades';
    SELECT id INTO contato_id FROM site_pages WHERE route = '/contato';

    -- Delete any existing dynamic layouts to avoid duplicates
    DELETE FROM site_sections WHERE section_key = 'dynamic-layout' AND page_id IN (home_id, salas_id, unidades_id, contato_id);

    -- HOME PAGE (5+ sections)
    INSERT INTO site_sections (page_id, section_key, content, settings, order_index)
    VALUES (home_id, 'dynamic-layout', '{
        "layout": [
            {
                "id": "hero_1",
                "type": "hero",
                "content": {
                    "title": "Seu espaço de trabalho inteligente no coração de Santos",
                    "subtitle": "No Coworking 013, oferecemos infraestrutura completa para você focar no que realmente importa: seu negócio.",
                    "image": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80",
                    "cta": "Conhecer Planos"
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
                    "title": "O espaço ideal para você",
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
    }'::jsonb, '{}'::jsonb, 0);

    -- SALAS PAGE (5+ sections)
    INSERT INTO site_sections (page_id, section_key, content, settings, order_index)
    VALUES (salas_id, 'dynamic-layout', '{
        "layout": [
            {
                "id": "hero_salas",
                "type": "hero",
                "content": {
                    "title": "Salas de Reunião e Privativas",
                    "subtitle": "Espaços profissionais para suas reuniões, treinamentos ou sede fixa.",
                    "image": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80"
                },
                "settings": { "padding": "py-20" }
            },
            {
                "id": "rooms_grid_1",
                "type": "rooms_grid",
                "content": { "title": "Nossas Salas", "subtitle": "Salas equipadas com TV, Ar-condicionado e Wi-Fi.", "limit": 12 },
                "settings": { "padding": "py-16" }
            },
            {
                "id": "text_block_salas",
                "type": "text_block",
                "content": {
                    "title": "Sua empresa no melhor endereço",
                    "text": "<p>Nossas salas privativas oferecem a privacidade necessária para sua equipe, com toda a infraestrutura de um coworking. Esqueça contas de luz, internet e limpeza.</p>"
                },
                "settings": { "padding": "py-12", "background": "bg-brand-blue-dark text-white" }
            },
            {
                "id": "plans_grid_salas",
                "type": "plans_grid",
                "content": { "title": "Planos para Salas", "subtitle": "Mensalidades ou pacotes de horas.", "limit": 3 },
                "settings": { "padding": "py-16" }
            },
            {
                "id": "popup_reserva",
                "type": "popup",
                "content": {
                    "buttonText": "Falar com Consultor",
                    "title": "Dúvidas sobre locação?",
                    "html": "<p>Nossa equipe está pronta para te ajudar a escolher a melhor sala para seu projeto.</p>",
                    "actionType": "whatsapp"
                },
                "settings": { "padding": "py-16", "background": "bg-gray-50" }
            }
        ]
    }'::jsonb, '{}'::jsonb, 0);

    -- UNIDADES PAGE (5+ sections)
    INSERT INTO site_sections (page_id, section_key, content, settings, order_index)
    VALUES (unidades_id, 'dynamic-layout', '{
        "layout": [
            {
                "id": "hero_unidades",
                "type": "hero",
                "content": {
                    "title": "Nossas Unidades em Santos",
                    "subtitle": "Conheça os espaços do Coworking 013.",
                    "image": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80"
                },
                "settings": { "padding": "py-20" }
            },
            {
                "id": "units_grid_list",
                "type": "units_grid",
                "content": { "title": "Onde estamos", "subtitle": "Unidades modernas e bem localizadas.", "limit": 10 },
                "settings": { "padding": "py-16" }
            },
            {
                "id": "features_unidades",
                "type": "features",
                "content": {
                    "title": "Padrão 013 em todas as unidades",
                    "items": [
                        { "title": "Mobiliário Ergonômico", "description": "Cadeiras e mesas de alto padrão.", "icon": "Armchair" },
                        { "title": "Copa Completa", "description": "Microondas, geladeira e utensílios.", "icon": "Utensils" },
                        { "title": "Recepção", "description": "Atendimento profissional para seus clientes.", "icon": "UserCheck" }
                    ]
                },
                "settings": { "padding": "py-16", "background": "bg-white" }
            },
            {
                "id": "gallery_preview",
                "type": "ideal_para",
                "content": {
                    "title": "Conheça por dentro",
                    "services": [
                        { "title": "Auditório", "description": "Para eventos e treinamentos.", "image": "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80" },
                        { "title": "Lounge", "description": "Área de descompressão e networking.", "image": "https://images.unsplash.com/photo-1517502884422-41eaadeff171?auto=format&fit=crop&q=80" }
                    ]
                },
                "settings": { "padding": "py-16", "background": "bg-gray-50" }
            },
            {
                "id": "cta_visita",
                "type": "popup",
                "content": {
                    "buttonText": "Agendar Visita Grátis",
                    "title": "Quer conhecer pessoalmente?",
                    "html": "<p>Agende uma visita e ganhe um day-pass gratuito para testar nosso espaço.</p>",
                    "actionType": "whatsapp"
                },
                "settings": { "padding": "py-16" }
            }
        ]
    }'::jsonb, '{}'::jsonb, 0);

    -- CONTATO PAGE (5+ sections)
    INSERT INTO site_sections (page_id, section_key, content, settings, order_index)
    VALUES (contato_id, 'dynamic-layout', '{
        "layout": [
            {
                "id": "hero_contato",
                "type": "hero",
                "content": {
                    "title": "Fale Conosco",
                    "subtitle": "Estamos prontos para atender você e sua empresa.",
                    "image": "https://images.unsplash.com/photo-1516387933999-ed331c9c9465?auto=format&fit=crop&q=80"
                },
                "settings": { "padding": "py-20" }
            },
            {
                "id": "form_contato",
                "type": "contact_form",
                "content": { "title": "Envie uma mensagem", "subtitle": "Nossa equipe retornará em breve." },
                "settings": { "padding": "py-16", "maxWidth": "max-w-4xl" }
            },
            {
                "id": "info_contato",
                "type": "features",
                "content": {
                    "title": "Canais de Atendimento",
                    "items": [
                        { "title": "WhatsApp", "description": "(13) 99999-9999", "icon": "MessageSquare" },
                        { "title": "E-mail", "description": "contato@coworking013.com.br", "icon": "Mail" },
                        { "title": "Endereço", "description": "Santos - SP", "icon": "MapPin" }
                    ]
                },
                "settings": { "padding": "py-12", "background": "bg-gray-50" }
            },
            {
                "id": "map_preview",
                "type": "text_block",
                "content": {
                    "title": "Onde estamos",
                    "text": "<p>Visite-nos em uma de nossas unidades. Estamos localizados estrategicamente nos melhores pontos de Santos para facilitar o seu dia a dia.</p>"
                },
                "settings": { "padding": "py-12" }
            },
            {
                "id": "faq_popup",
                "type": "popup",
                "content": {
                    "buttonText": "Dúvidas Frequentes",
                    "title": "Perguntas Rápidas",
                    "html": "<ul><li>Como funciona o day-pass?</li><li>Quais os horários de funcionamento?</li><li>Preciso reservar com antecedência?</li></ul>",
                    "actionType": "login"
                },
                "settings": { "padding": "py-12", "background": "bg-brand-blue-dark text-white" }
            }
        ]
    }'::jsonb, '{}'::jsonb, 0);

END $$;
