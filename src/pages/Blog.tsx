import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function Blog() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('site_articles')
      .select('*')
      .eq('status', 'Publicado')
      .order('created_at', { ascending: false });
    
    if (!error) setArticles(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Blog | CoWorking 013 - Empreendedorismo e Inovação</title>
        <meta name="description" content="Acompanhe as últimas notícias, dicas e novidades sobre coworking e empreendedorismo em Santos no blog do CoWorking 013." />
      </Helmet>
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black text-brand-blue-dark mb-4">Blog CoWorking 013</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Notícias, dicas e novidades sobre o mundo do empreendedorismo e coworking.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Card key={article.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {article.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={article.image_url} 
                        alt={article.title} 
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(article.created_at).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {article.author}</span>
                    </div>
                    <h2 className="text-xl font-bold text-brand-blue-dark mb-3 line-clamp-2">{article.title}</h2>
                    <p className="text-muted-foreground text-sm mb-6 line-clamp-3">{article.excerpt}</p>
                    <div className="mt-auto">
                      <Button asChild variant="link" className="text-brand-orange p-0 font-bold">
                        <Link to={`/blog/${article.slug}`}>
                          LER ARTIGO <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
