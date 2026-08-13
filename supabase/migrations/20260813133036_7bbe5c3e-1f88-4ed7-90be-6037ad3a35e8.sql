DO $$ 
DECLARE
    home_id UUID;
    inst_id UUID;
    unid_id UUID;
    serv_id UUID;
    cont_id UUID;
BEGIN
    -- Obter IDs das páginas
    SELECT id INTO home_id FROM public.site_pages WHERE route = '/';
    SELECT id INTO inst_id FROM public.site_pages WHERE route = '/institucional';
    SELECT id INTO unid_id FROM public.site_pages WHERE route = '/unidades';
    SELECT id INTO serv_id FROM public.site_pages WHERE route = '/servicos';
    SELECT id INTO cont_id FROM public.site_pages WHERE route = '/contatos';

    -- HOME PAGE
    IF home_id IS NOT NULL THEN
        DELETE FROM public.site_sections WHERE page_id = home_id AND section_key = 'dynamic-layout';
        INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
        VALUES (home_id, 'dynamic-layout', 
        '{
          "layout": [
            {
              "id": "sec_hero",
              "columns": [
                {
                  "id": "col_hero",
                  "widthPercentage": 100,
                  "widgets": [
                    {
                      "id": "w_h_1", "type": "heading",
                      "content": {"text": "MUDE SUA <span style=''color:#FF7F00''>ROTINA</span> <br />DE TRABALHO", "level": "h1"},
                      "styles": {"color": "#FFFFFF", "fontSize": "72px", "alignment": "left", "fontWeight": "900"}
                    },
                    {
                      "id": "w_h_2", "type": "text",
                      "content": {"text": "O espaço que seu negócio merece, com a flexibilidade que você precisa. Descubra como podemos transformar sua produtividade."},
                      "styles": {"color": "#FFFFFF", "fontSize": "20px", "alignment": "left"}
                    },
                    {
                      "id": "w_h_3", "type": "button",
                      "content": {"text": "VER PLANOS", "url": "/servicos"},
                      "styles": {"alignment": "left"}
                    }
                  ],
                  "settings": {"padding": {"top": 40, "bottom": 40, "left": 40, "right": 40}}
                }
              ],
              "settings": {
                "fullWidth": true,
                "padding": {"top": 150, "bottom": 150, "left": 0, "right": 0},
                "backgroundColor": "#002855",
                "backgroundImage": "https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/240-vista-aerea-praia-grande-sp-1.jpg",
                "overlayOpacity": 0.6
              }
            },
            {
              "id": "sec_ambientes",
              "columns": [
                {
                  "id": "col_amb_1", "widthPercentage": 100,
                  "widgets": [
                    {"id": "w_a_1", "type": "heading", "content": {"text": "NOSSOS AMBIENTES", "level": "h2"}, "styles": {"alignment": "center", "color": "#002855"}}
                  ]
                }
              ],
              "settings": {"padding": {"top": 80, "bottom": 40, "left": 0, "right": 0}, "backgroundColor": "#F8F9FA"}
            }
          ]
        }'::jsonb, '{}'::jsonb, 0);
    END IF;

    -- INSTITUCIONAL
    IF inst_id IS NOT NULL THEN
        DELETE FROM public.site_sections WHERE page_id = inst_id AND section_key = 'dynamic-layout';
        INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
        VALUES (inst_id, 'dynamic-layout', 
        '{
          "layout": [
            {
              "id": "sec_inst_1",
              "columns": [
                {
                  "id": "col_inst_1", "widthPercentage": 50,
                  "widgets": [
                    {"id": "w_i_img", "type": "image", "content": {"url": "https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/1572-sabrina-coworking-013-praia-grande-3-1.png", "alt": "Sabrina"}, "styles": {"borderRadius": 20}}
                  ]
                },
                {
                  "id": "col_inst_2", "widthPercentage": 50,
                  "widgets": [
                    {"id": "w_i_h", "type": "heading", "content": {"text": "Localização que aproxima você de mais oportunidades", "level": "h2"}, "styles": {"color": "#002855"}},
                    {"id": "w_i_t", "type": "text", "content": {"text": "Estamos localizados na Av. Presidente Kennedy, 5214 — fácil acesso e ótima visibilidade para o seu negócio na Vila Tupi."}}
                  ]
                }
              ],
              "settings": {"padding": {"top": 100, "bottom": 100, "left": 0, "right": 0}}
            }
          ]
        }'::jsonb, '{}'::jsonb, 0);
    END IF;
END $$;