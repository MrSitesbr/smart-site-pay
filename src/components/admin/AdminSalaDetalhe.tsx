import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Info, Users, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSalaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sala, setSala] = useState<any>(null);
  const [unidade, setUnidade] = useState<any>(null);
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: salaData, error: sErr } = await supabase.from('salas').select('*').eq('id', id).single();
    
    if (sErr) {
      toast.error("Erro ao carregar sala");
      navigate("/admin");
      return;
    }

    const [uRes, pRes] = await Promise.all([
      supabase.from('unidades').select('*').eq('id', salaData.unidade_id).single(),
      supabase.from('sala_planos').select('plano_id, planos(*)').eq('sala_id', id)
    ]);

    setSala(salaData);
    setUnidade(uRes.data);
    setPlanos((pRes.data || []).map((item: any) => item.planos));
    setLoading(false);
  }

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;

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
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-heading font-black text-brand-blue-dark">{sala.nome}</h1>
                  <Badge className="bg-brand-orange text-white uppercase text-[10px] tracking-widest">{sala.tipo}</Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="font-bold text-brand-blue-dark/60">{unidade.nome}</span>
                </div>
              </div>
              <Button className="bg-brand-blue-dark text-white">
                <Edit className="w-4 h-4 mr-2" /> Editar Sala
              </Button>
            </div>

            {sala.foto_url && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-8 border-4 border-white shadow-md">
                <img src={sala.foto_url} alt={sala.nome} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-brand-blue-dark">
                  <Info className="w-5 h-5 text-brand-orange" /> Descrição
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {sala.descricao || "Sem descrição detalhada cadastrada para esta sala."}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-brand-blue-dark">
                  <CheckCircle2 className="w-5 h-5 text-brand-orange" /> Planos Permitidos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {planos.map(p => (
                    <Badge key={p.id} variant="secondary" className="px-3 py-1 bg-slate-100 text-brand-blue-dark border-none">
                      {p.nome}
                    </Badge>
                  ))}
                  {planos.length === 0 && <span className="text-sm text-muted-foreground italic">Nenhum plano associado.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-96 space-y-6">
          <Card className="p-6 bg-white rounded-[2rem] border-none shadow-sm space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-orange" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Capacidade</p>
                <p className="text-xl font-black text-brand-blue-dark">{sala.capacidade || 'N/A'} Pessoas</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 bg-brand-blue-dark/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-brand-blue-dark" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Disponibilidade</p>
                <p className="text-xl font-black text-brand-blue-dark">Horário Comercial</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
