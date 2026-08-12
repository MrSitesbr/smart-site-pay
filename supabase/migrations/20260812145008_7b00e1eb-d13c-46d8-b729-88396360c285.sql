-- Tabela para o Blog/Artigos usando a API do Supabase (Migration)
CREATE TABLE public.site_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author TEXT,
    excerpt TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'Rascunho',
    slug TEXT UNIQUE,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL ON public.site_articles TO authenticated;
GRANT ALL ON public.site_articles TO anon;
GRANT ALL ON public.site_articles TO service_role;

ALTER TABLE public.site_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.site_articles FOR SELECT USING (true);
CREATE POLICY "Admin all access" ON public.site_articles FOR ALL USING (true);

INSERT INTO public.site_articles (title, author, excerpt, status, slug)
VALUES 
('Como o coworking pode acelerar seu networking', 'Walter Lima', 'Descubra como conexões reais podem mudar seu negócio.', 'Publicado', 'coworking-networking'),
('5 vantagens de ter um endereço fiscal na Praia Grande', 'Equipe 013', 'Economia e prestígio para sua empresa.', 'Publicado', 'endereco-fiscal-pg');