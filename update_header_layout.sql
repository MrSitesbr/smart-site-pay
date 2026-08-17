-- Check if global-header page exists
DO $$
DECLARE
    page_uuid UUID;
    section_uuid UUID;
BEGIN
    -- Get the ID of the global-header page
    SELECT id INTO page_uuid FROM public.site_pages WHERE route = 'global-header' LIMIT 1;

    -- If it doesn't exist, create it
    IF page_uuid IS NULL THEN
        INSERT INTO public.site_pages (name, route, is_global)
        VALUES ('Global Header', 'global-header', true)
        RETURNING id INTO page_uuid;
    END IF;

    -- Check if it has a dynamic-layout section
    SELECT id INTO section_uuid FROM public.site_sections 
    WHERE page_id = page_uuid AND section_key = 'dynamic-layout' LIMIT 1;

    -- Update or insert the dynamic-layout section with the correct widget
    IF section_uuid IS NOT NULL THEN
        UPDATE public.site_sections
        SET content = '{"layout": [{"id": "sec_header_01", "columns": [{"id": "col_header_01", "width": 12, "widgets": [{"id": "w_global_header_01", "type": "global_header", "content": {"type": "main"}, "styles": {}}]}]}]}'::jsonb,
            is_visible = true
        WHERE id = section_uuid;
    ELSE
        INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index, is_visible)
        VALUES (page_uuid, 'dynamic-layout', '{"layout": [{"id": "sec_header_01", "columns": [{"id": "col_header_01", "width": 12, "widgets": [{"id": "w_global_header_01", "type": "global_header", "content": {"type": "main"}, "styles": {}}]}]}]}'::jsonb, '{}'::jsonb, 0, true);
    END IF;

    -- Deactivate any other navbar sections on this page to avoid confusion
    UPDATE public.site_sections 
    SET is_visible = false 
    WHERE page_id = page_uuid AND section_key = 'navbar';
END $$;

-- Same for footer
DO $$
DECLARE
    page_uuid UUID;
    section_uuid UUID;
BEGIN
    SELECT id INTO page_uuid FROM public.site_pages WHERE route = 'global-footer' LIMIT 1;

    IF page_uuid IS NULL THEN
        INSERT INTO public.site_pages (name, route, is_global)
        VALUES ('Global Footer', 'global-footer', true)
        RETURNING id INTO page_uuid;
    END IF;

    SELECT id INTO section_uuid FROM public.site_sections 
    WHERE page_id = page_uuid AND section_key = 'dynamic-layout' LIMIT 1;

    IF section_uuid IS NOT NULL THEN
        UPDATE public.site_sections
        SET content = '{"layout": [{"id": "sec_footer_01", "columns": [{"id": "col_footer_01", "width": 12, "widgets": [{"id": "w_global_footer_01", "type": "global_footer", "content": {"type": "main"}, "styles": {}}]}]}]}'::jsonb,
            is_visible = true
        WHERE id = section_uuid;
    ELSE
        INSERT INTO public.site_sections (page_id, section_key, content, settings, order_index, is_visible)
        VALUES (page_uuid, 'dynamic-layout', '{"layout": [{"id": "sec_footer_01", "columns": [{"id": "col_footer_01", "width": 12, "widgets": [{"id": "w_global_footer_01", "type": "global_footer", "content": {"type": "main"}, "styles": {}}]}]}]}'::jsonb, '{}'::jsonb, 0, true);
    END IF;

    UPDATE public.site_sections 
    SET is_visible = false 
    WHERE page_id = page_uuid AND section_key = 'footer';
END $$;
