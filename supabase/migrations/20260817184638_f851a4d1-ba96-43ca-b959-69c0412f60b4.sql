
-- Force legacy sections to be invisible if a dynamic layout exists, 
-- or ensure dynamic-layout is prioritized in the code (done).
-- Also granting permissions to ensure the admin can actually update these.

GRANT ALL ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO anon;
GRANT ALL ON public.site_sections TO authenticated;
GRANT ALL ON public.site_sections TO anon;

-- Update the routes to ensure they match exactly what getPageContent expects if needed,
-- but the code uses "global-header" string literals, so keeping them as is but ensuring they are consistent.
UPDATE site_pages SET route = 'global-header' WHERE route = '/global-header';
UPDATE site_pages SET route = 'global-footer' WHERE route = '/global-footer';

-- Deactivate any static 'navbar' or 'footer' sections if a 'dynamic-layout' one exists for the same page
UPDATE site_sections 
SET is_visible = false 
WHERE section_key IN ('navbar', 'footer') 
AND page_id IN (SELECT id FROM site_pages WHERE route IN ('global-header', 'global-footer'))
AND EXISTS (
    SELECT 1 FROM site_sections s2 
    WHERE s2.page_id = site_sections.page_id 
    AND s2.section_key = 'dynamic-layout'
    AND s2.is_visible = true
);
