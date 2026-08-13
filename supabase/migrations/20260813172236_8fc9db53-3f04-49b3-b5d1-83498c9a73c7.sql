CREATE TABLE public.navigation_menus (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.navigation_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id uuid REFERENCES public.navigation_menus(id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE,
    label text NOT NULL,
    url text NOT NULL,
    order_index integer DEFAULT 0,
    is_external boolean DEFAULT false,
    icon text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.navigation_menus TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.navigation_items TO authenticated;
GRANT SELECT ON public.navigation_menus TO anon;
GRANT SELECT ON public.navigation_items TO anon;
GRANT ALL ON public.navigation_menus TO service_role;
GRANT ALL ON public.navigation_items TO service_role;

-- RLS
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to navigation_menus" ON public.navigation_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to navigation_menus" ON public.navigation_menus FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access to navigation_items" ON public.navigation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to navigation_items" ON public.navigation_items FOR SELECT TO anon USING (true);

-- Seed default menus
INSERT INTO public.navigation_menus (name, slug, description) VALUES 
('Cabeçalho Principal', 'main-header', 'Menu principal do site'),
('Rodapé Navegação', 'footer-nav', 'Links de navegação do rodapé'),
('Rodapé Serviços', 'footer-services', 'Links de serviços do rodapé');

-- Seed menu items for Header
DO $$
DECLARE
    header_menu_id uuid;
    servicos_parent_id uuid;
    footer_nav_id uuid;
    footer_services_id uuid;
BEGIN
    SELECT id INTO header_menu_id FROM public.navigation_menus WHERE slug = 'main-header';
    
    INSERT INTO public.navigation_items (menu_id, label, url, order_index) VALUES
    (header_menu_id, 'Início', '/', 0),
    (header_menu_id, 'Serviços', '#', 1),
    (header_menu_id, 'Unidades', '/unidades', 2),
    (header_menu_id, 'Institucional', '/institucional', 3),
    (header_menu_id, 'Contato', '/#contato', 4);
    
    SELECT id INTO servicos_parent_id FROM public.navigation_items WHERE label = 'Serviços' AND url = '#' AND menu_id = header_menu_id;
    
    INSERT INTO public.navigation_items (menu_id, parent_id, label, url, order_index) VALUES
    (header_menu_id, servicos_parent_id, 'Escritório Privativo', '/escritorio-privativo', 0),
    (header_menu_id, servicos_parent_id, 'Consultório Privativo', '/consultorio-privativo', 1),
    (header_menu_id, servicos_parent_id, 'Auditório Modular', '/auditorio-modular', 2),
    (header_menu_id, servicos_parent_id, 'Endereço Virtual', '/endereco-virtual', 3);

    SELECT id INTO footer_nav_id FROM public.navigation_menus WHERE slug = 'footer-nav';
    
    INSERT INTO public.navigation_items (menu_id, label, url, order_index) VALUES
    (footer_nav_id, 'Início', '/', 0),
    (footer_nav_id, 'Institucional', '/institucional', 1),
    (footer_nav_id, 'Unidades', '/unidades', 2),
    (footer_nav_id, 'Contato', '#contato', 3),
    (footer_nav_id, 'Área do Cliente', '/painel', 4);

    SELECT id INTO footer_services_id FROM public.navigation_menus WHERE slug = 'footer-services';
    
    INSERT INTO public.navigation_items (menu_id, label, url, order_index) VALUES
    (footer_services_id, 'Salas Privativas', '/escritorio-privativo', 0),
    (footer_services_id, 'Sala de Reunião', '/auditorio-modular', 1),
    (footer_services_id, 'Auditório Modular', '/auditorio-modular', 2),
    (footer_services_id, 'Consultório Privativo', '/consultorio-privativo', 3),
    (footer_services_id, 'Endereço Virtual', '/endereco-virtual', 4);
END $$;
