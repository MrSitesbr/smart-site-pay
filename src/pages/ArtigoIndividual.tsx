import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet";

export default function ArtigoIndividual() {
  const { slug } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    const { data, error } = await supabase
      .from('site_articles')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (!error) setArticle(data);
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
            className="prose prose-lg max-w-none prose-slate prose-headings:text-brand-blue-dark prose-headings:font-bold prose-a:text-brand-orange"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
