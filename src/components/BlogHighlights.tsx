import { useEffect, useState } from "react";
import { Calendar, ChevronRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author: string | null;
  image_url: string | null;
  created_at: string | null;
}

const fallbackImage = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80";

export default function BlogHighlights({ content = {} }: { content?: { title?: string; eyebrow?: string; limit?: number } }) {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const loadArticles = async () => {
      const { data } = await supabase
        .from("site_articles")
        .select("id, title, slug, excerpt, author, image_url, created_at")
        .eq("status", "Publicado")
        .order("created_at", { ascending: false })
        .limit(content.limit || 3);

      setArticles((data as Article[]) || []);
    };

    loadArticles();
  }, [content.limit]);

  if (articles.length === 0) return null;

  return (
    <section className="bg-slate-50 px-6 py-20 md:py-24" aria-labelledby="blog-highlights-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">{content.eyebrow || "Conteúdo para crescer"}</p>
            <h2 id="blog-highlights-title" className="text-3xl font-black text-brand-blue-dark md:text-4xl">{content.title || "Últimos artigos do blog"}</h2>
          </div>
          <Link to="/blog" className="inline-flex items-center gap-1 self-start font-bold text-brand-orange transition-colors hover:text-brand-blue-dark md:self-auto">
            Ver todos os artigos <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} to={`/blog/${article.slug}`} className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2">
              <Card className="flex h-full flex-col overflow-hidden border-none bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                <div className="aspect-video overflow-hidden bg-slate-200">
                  <img src={article.image_url || fallbackImage} alt={article.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{article.created_at ? new Date(article.created_at).toLocaleDateString("pt-BR") : ""}</span>
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{article.author || "Equipe 013"}</span>
                  </div>
                  <h3 className="mb-3 line-clamp-2 text-xl font-bold text-brand-blue-dark transition-colors group-hover:text-brand-orange">{article.title}</h3>
                  <p className="mt-auto line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}