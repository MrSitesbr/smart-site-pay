import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Edit2, Eye, Trash2, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import AdminArtigoDetalhe from "./AdminArtigoDetalhe";

export default function AdminArtigos() {
  const [artigos, setArtigos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchArtigos();
  }, []);

  async function fetchArtigos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_articles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error("Erro ao carregar artigos");
    } else {
      setArtigos(data || []);
    }
    setLoading(false);
  }

  async function deleteArtigo(id: string) {
    if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
    const { error } = await supabase.from('site_articles').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Artigo excluído");
      fetchArtigos();
    }
  }

  const filtered = artigos.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    (a.author && a.author.toLowerCase().includes(search.toLowerCase()))
  );

  if (editingId || isCreating) {
    return (
      <AdminArtigoDetalhe 
        artigoId={editingId || undefined} 
        onBack={() => {
          setEditingId(null);
          setIsCreating(false);
        }}
        onSave={() => {
          setEditingId(null);
          setIsCreating(false);
          fetchArtigos();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-brand-blue-dark">Blog & Artigos</h2>
          <p className="text-muted-foreground font-medium">Gerencie o conteúdo do blog, SEO e artigos gerados com IA Mistral.</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black px-6 py-6 rounded-2xl shadow-lg shadow-brand-orange/20"
        >
          <Plus className="w-5 h-5 mr-2" /> NOVO ARTIGO
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-orange transition-colors" />
          <input 
            className="w-full bg-white border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-sm font-medium" 
            placeholder="Pesquisar artigos..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchArtigos} className="rounded-2xl h-auto px-6 border-brand-blue-dark/10 hover:bg-brand-blue-dark/5">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-brand-orange" /> : "ATUALIZAR"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(a => (
          <Card key={a.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all bg-white relative rounded-3xl p-0">
            {a.image_url ? (
              <div className="aspect-video w-full overflow-hidden">
                <img src={a.image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ) : (
              <div className="aspect-video w-full bg-muted flex items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground opacity-20" />
              </div>
            )}
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={a.status === 'Publicado' ? 'bg-green-100 text-green-700 border-none' : 'bg-yellow-100 text-yellow-700 border-none'}>
                  {a.status}
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {new Date(a.published_at || a.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h3 className="text-xl font-black text-brand-blue-dark line-clamp-2 leading-tight group-hover:text-brand-orange transition-colors">
                {a.title}
              </h3>

              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <div className="w-6 h-6 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange text-[10px] font-bold">
                  {a.author?.charAt(0) || 'E'}
                </div>
                {a.author || "Equipe 013"}
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-brand-orange/10 hover:text-brand-orange" 
                    onClick={() => setEditingId(a.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-brand-blue-dark/10" 
                    onClick={() => window.open(`/blog/${a.slug}`, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" 
                  onClick={() => deleteArtigo(a.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
              <FileText className="w-10 h-10" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum artigo encontrado. Clique em "Novo Artigo" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
