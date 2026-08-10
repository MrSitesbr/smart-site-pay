import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Info, Users, Clock, CheckCircle2, Save, X, ImageIcon } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { toast } from "sonner";

export default function AdminSalaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sala, setSala] = useState<any>(null);
  const [unidade, setUnidade] = useState<any>(null);
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSala, setEditingSala] = useState<any>(null);
  const [allPlanos, setAllPlanos] = useState<any[]>([]);

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

    const [uRes, pRes, allPRes] = await Promise.all([
      supabase.from('unidades').select('*').eq('id', salaData.unidade_id).single(),
      supabase.from('sala_planos').select('plano_id, planos(*)').eq('sala_id', id),
      supabase.from('planos').select('*').order('nome')
    ]);

    setSala(salaData);
    setUnidade(uRes.data);
    setPlanos((pRes.data || []).map((item: any) => item.planos));
    setAllPlanos(allPRes.data || []);
    setLoading(false);
  }

  async function handleSaveSala() {
    if (!editingSala.nome) return toast.error("Nome é obrigatório");
    
    const { error } = await supabase
      .from('salas')
      .update({
        nome: editingSala.nome,
        tipo: editingSala.tipo,
        capacidade: parseInt(editingSala.capacidade) || null,
        descricao: editingSala.descricao,
        foto_url: editingSala.galeria?.[0] || editingSala.foto_url,
        galeria: editingSala.galeria
      })
      .eq('id', id);
    
    if (error) {
      toast.error(error.message);
      return;
    }

    // Update plans
    await supabase.from('sala_planos').delete().eq('sala_id', id);
    if (editingSala.planos_permitidos?.length > 0) {
      const relations = editingSala.planos_permitidos.map((planoId: string) => ({
        sala_id: id,
        plano_id: planoId
      }));
      await supabase.from('sala_planos').insert(relations);
    }

    toast.success("Sala atualizada!");
    setEditingSala(null);
    fetchData();
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
              <Button 
                onClick={() => setEditingSala({
                  ...sala,
                  planos_permitidos: planos.map(p => p.id)
                })}
                className="bg-brand-blue-dark text-white"
              >
                <Edit className="w-4 h-4 mr-2" /> Editar Sala
              </Button>
            </div>

            {sala.galeria && sala.galeria.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {sala.galeria.map((url: string, index: number) => (
                  <div key={index} className={`rounded-2xl overflow-hidden border-4 border-white shadow-md ${index === 0 ? 'md:col-span-2 aspect-video' : 'aspect-square'}`}>
                    <img src={url} alt={`${sala.nome} - ${index}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : sala.foto_url && (
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

      <Dialog open={!!editingSala} onOpenChange={() => setEditingSala(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Sala</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Sala</label>
                <Input 
                  value={editingSala?.nome || ''} 
                  onChange={(e) => setEditingSala({...editingSala, nome: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={editingSala?.tipo || ''}
                  onChange={(e) => setEditingSala({...editingSala, tipo: e.target.value})}
                >
                  <option value="Coworking">Coworking (Estação)</option>
                  <option value="Privativa">Sala Privativa</option>
                  <option value="Reunião">Sala de Reunião</option>
                  <option value="Auditório">Auditório</option>
                  <option value="Consultório">Consultório</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capacidade (Pessoas)</label>
                <Input 
                  type="number"
                  value={editingSala?.capacidade || ''} 
                  onChange={(e) => setEditingSala({...editingSala, capacidade: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Galeria de Fotos (Multi-upload)</label>
                <ImageUpload 
                  value={editingSala?.galeria || []} 
                  onChange={(urls) => setEditingSala({...editingSala, galeria: urls})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Planos de Horas Permitidos</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {allPlanos.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs border p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded"
                      checked={(editingSala?.planos_permitidos || []).includes(p.id)}
                      onChange={(e) => {
                        const current = editingSala?.planos_permitidos || [];
                        const next = e.target.checked 
                          ? [...current, p.id] 
                          : current.filter((id: string) => id !== p.id);
                        setEditingSala({...editingSala, planos_permitidos: next});
                      }}
                    />
                    <span className="truncate">{p.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição / Observações</label>
              <Textarea 
                value={editingSala?.descricao || ''} 
                onChange={(e) => setEditingSala({...editingSala, descricao: e.target.value})}
                placeholder="Recursos disponíveis, metragem, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSala(null)}>Cancelar</Button>
            <Button onClick={handleSaveSala} className="bg-brand-orange text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
