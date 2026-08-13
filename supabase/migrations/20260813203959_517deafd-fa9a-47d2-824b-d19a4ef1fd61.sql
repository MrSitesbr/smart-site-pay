
DO $$
BEGIN
    -- Ensure global header page exists
    IF NOT EXISTS (SELECT 1 FROM site_pages WHERE route = 'global-header') THEN
        INSERT INTO site_pages (name, route, is_global)
        VALUES ('Global Header', 'global-header', true);
    END IF;

    -- Ensure global footer page exists
    IF NOT EXISTS (SELECT 1 FROM site_pages WHERE route = 'global-footer') THEN
        INSERT INTO site_pages (name, route, is_global)
        VALUES ('Global Footer', 'global-footer', true);
    END IF;

    -- Fix is_global via update
    UPDATE site_pages SET is_global = true WHERE route IN ('global-header', 'global-footer');
    UPDATE site_pages SET is_global = true WHERE name ILIKE '%header%' OR name ILIKE '%footer%';
END $$;
