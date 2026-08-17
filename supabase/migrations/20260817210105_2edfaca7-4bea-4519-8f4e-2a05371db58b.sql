UPDATE public.navigation_items 
SET url = '/contatos' 
WHERE label = 'Contato' AND menu_id = (SELECT id FROM public.navigation_menus WHERE slug = 'main-header');