-- Tabela para o Blog/Artigos
CREATE TABLE IF NOT EXISTS public.site_articles (
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

-- Garantir que a tabela de unidades tenha os campos necessários para fotos se faltarem
-- (Já existem, mas reforçando integridade)
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS galeria TEXT[] DEFAULT '{}';
ALTER TABLE public.salas ADD COLUMN IF NOT EXISTS galeria TEXT[] DEFAULT '{}';

-- Inserir alguns artigos iniciais se a tabela estiver vazia
INSERT INTO public.site_articles (title, author, excerpt, status, slug)
SELECT 'Como o coworking pode acelerar seu networking', 'Walter Lima', 'Descubra como conexões reais podem mudar seu negócio.', 'Publicado', 'coworking-networking'
WHERE NOT EXISTS (SELECT 1 FROM public.site_articles WHERE slug = 'coworking-networking');

INSERT INTO public.site_articles (title, author, excerpt, status, slug)
SELECT '5 vantagens de ter um endereço fiscal na Praia Grande', 'Equipe 013', 'Economia e prestígio para sua empresa.', 'Publicado', 'endereco-fiscal-pg'
WHERE NOT EXISTS (SELECT 1 FROM public.site_articles WHERE slug = 'endereco-fiscal-pg');
