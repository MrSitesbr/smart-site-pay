import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Edit2, Eye, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminArtigos() {
  const [artigos, setArtigos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchArtigos();
  }, []);

  async function fetchArtigos() {
    setLoading(true);
    // @ts-ignore - a tipagem pode demorar a atualizar
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
    // @ts-ignore
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Blog & Artigos</h2>
          <p className="text-muted-foreground">Gerencie o conteúdo do blog para atrair mais clientes (Conectado ao DB).</p>
        </div>
        <Button onClick={() => toast.info("Funcionalidade de criação de artigos em desenvolvimento")} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Artigo
        </Button>

      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            className="w-full bg-white border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange" 
            placeholder="Pesquisar artigos reais..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchArtigos}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      <Card className="overflow-hidden border-none shadow-sm bg-white">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Autor</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-brand-blue-dark">{a.title}</span>
                </td>
                <td className="px-6 py-4 text-sm">{a.author || "Equipe 013"}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(a.published_at || a.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <Badge className={a.status === 'Publicado' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'}>
                    {a.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Edição em desenvolvimento")}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/blog/${a.slug}`, '_blank')}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteArtigo(a.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">Nenhum artigo encontrado no banco de dados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
