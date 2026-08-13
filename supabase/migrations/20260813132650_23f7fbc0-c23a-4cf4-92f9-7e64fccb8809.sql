DO $$ 
DECLARE
    page_record RECORD;
BEGIN
    FOR page_record IN SELECT id, route FROM public.site_pages WHERE route IN ('/', '/institucional', '/unidades', '/servicos', '/contatos') LOOP
        IF NOT EXISTS (SELECT 1 FROM public.site_sections WHERE page_id = page_record.id AND section_key = 'dynamic-layout') THEN
            INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index)
            VALUES (
                page_record.id, 
                'dynamic-layout', 
                '{
                  "layout": [
                    {
                      "id": "sec_initial",
                      "columns": [
                        {
                          "id": "col_initial",
                          "widthPercentage": 100,
                          "widgets": [
                            {
                              "id": "wid_initial_heading",
                              "type": "heading",
                              "content": {"text": "Bem-vindo ao Coworking 013", "level": "h1"},
                              "styles": {"color": "#002855", "alignment": "center", "fontSize": "48px"}
                            },
                            {
                              "id": "wid_initial_text",
                              "type": "text",
                              "content": {"text": "O conteúdo desta página está sendo restaurado. Utilize o Editor Visual no Admin para personalizar este layout."},
                              "styles": {"alignment": "center", "fontSize": "18px"}
                            }
                          ],
                          "settings": {"padding": {"top": 40, "bottom": 40, "left": 20, "right": 20}}
                        }
                      ],
                      "settings": {
                        "fullWidth": false, 
                        "padding": {"top": 100, "bottom": 100, "left": 0, "right": 0},
                        "backgroundColor": "#ffffff"
                      }
                    }
                  ]
                }'::jsonb,
                '{}'::jsonb,
                0
            );
        END IF;
    END LOOP;
END $$;