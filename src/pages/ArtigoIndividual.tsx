import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet";

export default function ArtigoIndividual() {
  const { slug } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    const [{ data, error }, { data: publishedArticles }] = await Promise.all([
      supabase.from('site_articles').select('*').eq('slug', slug).eq('status', 'Publicado').single(),
      supabase.from('site_articles').select('id, title, slug, image_url, created_at').eq('status', 'Publicado').order('created_at', { ascending: false })
    ]);
    
    if (!error) setArticle(data);
    setArticles(publishedArticles || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
      </div>
      <Footer />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="text-center py-32 px-6">
        <h1 className="text-4xl font-bold mb-4">Artigo não encontrado</h1>
        <Button asChild><Link to="/blog">Voltar ao Blog</Link></Button>
      </div>
      <Footer />
    </div>
  );

  const articleIndex = articles.findIndex((item) => item.id === article.id);
  const previousArticle = articleIndex > 0 ? articles[articleIndex - 1] : null;
  const nextArticle = articleIndex >= 0 && articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{(article.seo_metadata as any)?.title || article.title} | Coworking 013</title>
        <meta name="description" content={(article.seo_metadata as any)?.description || article.excerpt || ""} />
        {(article.seo_metadata as any)?.keywords && (
          <meta name="keywords" content={(article.seo_metadata as any)?.keywords} />
        )}
        <meta property="og:title" content={(article.seo_metadata as any)?.title || article.title} />
        <meta property="og:description" content={(article.seo_metadata as any)?.description || article.excerpt || ""} />
        {article.image_url && <meta property="og:image" content={article.image_url} />}
      </Helmet>
      <Navbar />
      <main className="pt-32 pb-20">
        <article className="max-w-4xl mx-auto px-6">
          <Button asChild variant="ghost" className="mb-8 hover:bg-slate-100">
            <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Blog</Link>
          </Button>

          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-brand-blue-dark mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-muted-foreground">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {article.author}</span>
            </div>
          </header>

          {article.image_url && (
            <div className="mb-12 rounded-3xl overflow-hidden shadow-xl">
              <img 
                src={article.image_url} 
                alt={article.title} 
                className="w-full h-auto"
              />
            </div>
          )}

          <div 
            className="prose prose-lg max-w-none prose-slate prose-headings:text-brand-blue-dark prose-headings:font-bold prose-a:text-brand-orange prose-img:rounded-3xl prose-img:shadow-lg"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {(previousArticle || nextArticle) && (
            <nav className="mt-16 grid grid-cols-1 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2" aria-label="Navegação entre artigos">
              {previousArticle ? (
                <Link to={`/blog/${previousArticle.slug}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-3 transition-colors hover:border-brand-orange hover:bg-slate-50">
                  <ChevronLeft className="h-5 w-5 shrink-0 text-brand-orange" />
                  <img src={previousArticle.image_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=240&q=80"} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Artigo anterior</span>
                    <span className="block line-clamp-2 font-bold text-brand-blue-dark group-hover:text-brand-orange">{previousArticle.title}</span>
                  </span>
                </Link>
              ) : <span />}
              {nextArticle && (
                <Link to={`/blog/${nextArticle.slug}`} className="group flex items-center justify-end gap-4 rounded-2xl border border-slate-200 p-3 text-right transition-colors hover:border-brand-orange hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Próximo artigo</span>
                    <span className="block line-clamp-2 font-bold text-brand-blue-dark group-hover:text-brand-orange">{nextArticle.title}</span>
                  </span>
                  <img src={nextArticle.image_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=240&q=80"} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                  <ChevronRight className="h-5 w-5 shrink-0 text-brand-orange" />
                </Link>
              )}
            </nav>
          )}
        </article>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
