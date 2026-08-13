-- Limpar entradas dinâmicas anteriores para evitar duplicidade durante o desenvolvimento
DELETE FROM public.site_sections WHERE section_key = 'dynamic-layout';

-- Garantir que as páginas existam
INSERT INTO public.site_pages (name, route)
VALUES 
('Home', '/'),
('Salas & Espaços', '/salas'),
('Unidades', '/unidades'),
('Contato', '/contato')
ON CONFLICT (route) DO UPDATE SET name = EXCLUDED.name;

-- Inserir Layout Dinâmico para a Home (/)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    {
      "id": "hero-1",
      "settings": {
        "fullWidth": true,
        "backgroundImage": "https://images.unsplash.com/photo-1497366216548-37526070297c",
        "overlayOpacity": 0.6,
        "padding": {"top": 100, "bottom": 100}
      },
      "columns": [
        {
          "id": "col-hero-1",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "w-hero-h",
              "type": "heading",
              "content": {"text": "Seu espaço de <span class=''text-brand-orange''>sucesso</span> no Coworking 013", "level": "h1"},
              "styles": {"color": "#ffffff", "fontSize": "64px", "alignment": "center"}
            },
            {
              "id": "w-hero-t",
              "type": "text",
              "content": {"text": "Infraestrutura completa, networking e flexibilidade para o seu negócio."},
              "styles": {"color": "#ffffff", "fontSize": "20px", "alignment": "center"}
            },
            {
              "id": "w-hero-b",
              "type": "button",
              "content": {"text": "CONHECER PLANOS", "url": "/salas"},
              "styles": {"alignment": "center"}
            }
          ]
        }
      ]
    },
    {
      "id": "sobre-1",
      "settings": {"padding": {"top": 80, "bottom": 80}},
      "columns": [
        {
          "id": "col-sobre-img",
          "widthPercentage": 50,
          "widgets": [
            {
              "id": "w-sobre-img",
              "type": "image",
              "content": {"url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72", "alt": "Espaço"},
              "styles": {"borderRadius": 24}
            }
          ]
        },
        {
          "id": "col-sobre-txt",
          "widthPercentage": 50,
          "widgets": [
            {
              "id": "w-sobre-h",
              "type": "heading",
              "content": {"text": "Onde a inovação acontece", "level": "h2"},
              "styles": {"color": "#1e293b", "fontSize": "36px"}
            },
            {
              "id": "w-sobre-t",
              "type": "text",
              "content": {"text": "Fundado no coração de Santos, o Coworking 013 oferece muito mais que uma mesa de trabalho. Somos uma comunidade pulsante feita para impulsionar profissionais liberais, startups e grandes corporações."},
              "styles": {"color": "#64748b"}
            }
          ]
        }
      ]
    },
    {
      "id": "salas-dinamicas",
      "settings": {"backgroundColor": "#f8fafc", "padding": {"top": 80, "bottom": 80}},
      "columns": [
        {
          "id": "col-salas-h",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "w-salas-h",
              "type": "heading",
              "content": {"text": "Nossos Espaços", "level": "h2"},
              "styles": {"alignment": "center"}
            },
            {
              "id": "w-salas-grid",
              "type": "rooms_grid",
              "content": {"limit": 3},
              "styles": {}
            }
          ]
        }
      ]
    }
  ]
}', '{}', 0 FROM page_ref;

-- Inserir Layout Dinâmico para Salas (/salas)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/salas')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    {
      "id": "salas-hero",
      "settings": {"backgroundColor": "#1e293b", "padding": {"top": 60, "bottom": 60}},
      "columns": [
        {
          "id": "col-salas-hero",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "w-salas-h",
              "type": "heading",
              "content": {"text": "Encontre o Ambiente Ideal", "level": "h1"},
              "styles": {"color": "#ffffff", "alignment": "center"}
            }
          ]
        }
      ]
    },
    {
      "id": "listagem-salas",
      "settings": {"padding": {"top": 60, "bottom": 60}},
      "columns": [
        {
          "id": "col-grid-salas",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "w-grid-salas",
              "type": "rooms_grid",
              "content": {"limit": 12},
              "styles": {}
            }
          ]
        }
      ]
    }
  ]
}', '{}', 0 FROM page_ref;

-- Inserir Layout Dinâmico para Unidades (/unidades)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/unidades')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    {
      "id": "unidades-hero",
      "settings": {"padding": {"top": 80, "bottom": 80}},
      "columns": [
        {
          "id": "col-unidades-hero",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "w-unidades-h",
              "type": "heading",
              "content": {"text": "Nossas Localizações", "level": "h1"},
              "styles": {"alignment": "center"}
            },
            {
              "id": "w-unidades-grid",
              "type": "units_grid",
              "content": {"limit": 6},
              "styles": {}
            }
          ]
        }
      ]
    }
  ]
}', '{}', 0 FROM page_ref;

-- Inserir Layout Dinâmico para Contato (/contato)
WITH page_ref AS (SELECT id FROM public.site_pages WHERE route = '/contato')
INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
SELECT id, 'dynamic-layout', 
'{
  "layout": [
    {
      "id": "contato-grid",
      "settings": {"padding": {"top": 100, "bottom": 100}},
      "columns": [
        {
          "id": "col-contato-info",
          "widthPercentage": 40,
          "widgets": [
            {
              "id": "w-contato-h",
              "type": "heading",
              "content": {"text": "Vamos Conversar?", "level": "h2"},
              "styles": {}
            },
            {
              "id": "w-contato-t",
              "type": "text",
              "content": {"text": "Santos/SP<br/>WhatsApp: (13) 99203-7957<br/>Email: contato@coworking013.com.br"},
              "styles": {}
            }
          ]
        },
        {
          "id": "col-contato-form",
          "widthPercentage": 60,
          "widgets": [
            {
              "id": "w-contato-form",
              "type": "form",
              "content": {"formType": "contato", "title": "Envie uma mensagem"},
              "styles": {}
            }
          ]
        }
      ]
    }
  ]
}', '{}', 0 FROM page_ref;
