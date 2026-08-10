import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Layers, MapPin, Info, Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUnidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState<any>(null);
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const [uRes, sRes] = await Promise.all([
      supabase.from('unidades').select('*').eq('id', id).single(),
      supabase.from('salas').select('*').eq('unidade_id', id).order('nome')
    ]);

    if (uRes.error) {
      toast.error("Erro ao carregar unidade");
      navigate("/admin");
    } else {
      setUnidade(uRes.data);
      setSalas(sRes.data || []);
    }
    setLoading(false);
  }

  async function deleteSala(salaId: string) {
    if (!confirm("Tem certeza que deseja excluir esta sala?")) return;
    const { error } = await supabase.from('salas').delete().eq('id', salaId);
    if (error) toast.error(error.message);
    else {
      toast.success("Sala excluída");
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-brand-blue-dark/5">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-brand-blue-dark/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-heading font-black text-brand-blue-dark mb-2">{unidade.nome}</h1>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 text-brand-orange" />
                  {unidade.endereco}
                </div>
              </div>
              <Button onClick={() => {/* TODO: Integrar modal de edição */}} className="bg-brand-blue-dark text-white">
                <Edit className="w-4 h-4 mr-2" /> Editar Unidade
              </Button>
            </div>
            
            {unidade.foto_url && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-md">
                <img src={unidade.foto_url} alt={unidade.nome} className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="prose prose-slate max-w-none">
              <h3 className="flex items-center gap-2 text-lg font-bold text-brand-blue-dark">
                <Info className="w-5 h-5 text-brand-orange" /> Sobre a Unidade
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {unidade.descricao || "Sem descrição cadastrada."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:w-96 space-y-6">
          <Card className="p-6 bg-brand-blue-dark text-white rounded-[2rem] border-none shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Estatísticas
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="opacity-80">Total de Salas</span>
                <span className="font-black text-2xl">{salas.length}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="opacity-80">Capacidade Total</span>
                <span className="font-black text-2xl">
                  {salas.reduce((acc, s) => acc + (s.capacidade || 0), 0)} pessoas
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-heading font-black text-brand-blue-dark">Salas Cadastradas</h2>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20">
            <Plus className="w-4 h-4 mr-2" /> Nova Sala
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {salas.map((sala) => (
            <Card 
              key={sala.id} 
              className="group overflow-hidden rounded-2xl border-none shadow-sm hover:shadow-xl transition-all cursor-pointer bg-white"
              onClick={() => navigate(`/admin/unidades/sala/${sala.id}`)}
            >
              <div className="h-48 bg-slate-100 relative">
                {sala.foto_url ? (
                  <img src={sala.foto_url} className="w-full h-full object-cover" alt={sala.nome} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-brand-orange text-white border-none">{sala.tipo}</Badge>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg text-brand-blue-dark mb-1 group-hover:text-brand-orange transition-colors">{sala.nome}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{sala.descricao || "Sem descrição."}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-brand-blue-dark/60">Capacidade: {sala.capacidade || 'N/A'}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); deleteSala(sala.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
