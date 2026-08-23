import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { MediaPickerModal } from "./MediaPickerModal";
import { 
  ArrowLeft, 
  Building2, 
  Layers, 
  MapPin, 
  Info, 
  Edit, 
  Plus, 
  Trash2,
  X,
  Save,
  ImageIcon,
  Search,
  CheckCircle2,
  Star,
  Users,
  Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateCompatibility, WaitingListEntry } from "@/lib/compatibility";

export default function AdminUnidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState<any>(null);
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [editingSala, setEditingSala] = useState<any>(null);
  const [allPlanos, setAllPlanos] = useState<any[]>([]);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'unidade' | 'sala' | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const [uRes, sRes, pRes] = await Promise.all([
      supabase.from('unidades').select('*').eq('id', id).single(),
      supabase.from('salas').select('*').eq('unidade_id', id).order('nome'),
      supabase.from('planos').select('*').order('nome')
    ]);

    if (uRes.error) {
      toast.error("Erro ao carregar unidade");
      navigate("/admin");
    } else {
      setUnidade(uRes.data);
      setSalas(sRes.data || []);
      setAllPlanos(pRes.data || []);
    }
    setLoading(false);
  }

  async function deleteUnidade() {
    if (!confirm("Tem certeza que deseja excluir esta unidade? Isso apagará todas as salas vinculadas.")) return;
    const { error } = await supabase.from('unidades').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Unidade excluída com sucesso");
      navigate("/admin");
    }
  }

  async function saveUnidade() {
    if (!editingUnidade.nome) return toast.error("Nome é obrigatório");
    
    const payload: any = {
      nome: editingUnidade.nome,
      endereco: editingUnidade.endereco,
      descricao: editingUnidade.descricao,
      foto_url: editingUnidade.galeria?.[0] || '',
      galeria: editingUnidade.galeria || [],
      servicos_infra: editingUnidade.servicos_infra || []
    };

    const { error } = await supabase.from('unidades').update(payload).eq('id', id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Unidade atualizada!");
      setEditingUnidade(null);
      fetchData();
    }
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

  async function saveSala() {
    if (!editingSala.nome || !editingSala.tipo) return toast.error("Nome e tipo são obrigatórios");
    
    const payload: any = {
      nome: editingSala.nome,
      tipo: editingSala.tipo,
      capacidade: parseInt(editingSala.capacidade) || null,
      descricao: editingSala.descricao,
      foto_url: editingSala.galeria?.[0] || '',
      galeria: editingSala.galeria || [],
      unidade_id: id
    };

    const { data: savedSala, error } = editingSala.id 
      ? await supabase.from('salas').update(payload).eq('id', editingSala.id).select().single()
      : await supabase.from('salas').insert([payload]).select().single();
    
    if (error) {
      toast.error(error.message);
      return;
    }

    if (savedSala) {
      await supabase.from('sala_planos').delete().eq('sala_id', savedSala.id);
      
      const planosPermitidos = editingSala.planos_permitidos || [];
      if (planosPermitidos.length > 0) {
        const relations = planosPermitidos.map((planoId: string) => ({
          sala_id: savedSala.id,
          plano_id: planoId
        }));
        await supabase.from('sala_planos').insert(relations);
      }
      toast.success("Sala salva!");
      setEditingSala(null);
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
              <div className="flex gap-2">
                <Button onClick={() => setEditingUnidade(unidade)} className="bg-brand-blue-dark text-white">
                  <Edit className="w-4 h-4 mr-2" /> Editar Unidade
                </Button>
                <Button onClick={deleteUnidade} variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-white">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Unidade
                </Button>
              </div>
            </div>
            
            {unidade.foto_url && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-md bg-slate-100">
                <img 
                  src={unidade.foto_url} 
                  alt={unidade.nome} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {unidade.galeria && unidade.galeria.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {unidade.galeria.map((url: string, index: number) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden border-2 border-white shadow-sm">
                    <img 
                      src={url} 
                      alt={`${unidade.nome} gallery ${index}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
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
          <Button 
            onClick={() => setEditingSala({ nome: '', tipo: 'Coworking', capacidade: '', descricao: '', foto_url: '', unidade_id: id })}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20"
          >
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
                  <img 
                    src={sala.foto_url} 
                    className="w-full h-full object-cover" 
                    alt={sala.nome} 
                  />
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

      {/* Dialog Unidade */}
      <Dialog open={!!editingUnidade} onOpenChange={() => setEditingUnidade(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Unidade</label>
                <Input 
                  value={editingUnidade?.nome || ''} 
                  onChange={(e) => setEditingUnidade({...editingUnidade, nome: e.target.value})}
                  placeholder="Ex: Unidade Boqueirão"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Galeria de Fotos</label>
                  <Button variant="outline" size="sm" onClick={() => { setMediaTarget('unidade'); setIsMediaPickerOpen(true); }} className="h-8 text-xs">
                    <ImageIcon className="w-3 h-3 mr-2" /> Biblioteca
                  </Button>
                </div>
                <ImageUpload 
                  value={editingUnidade?.galeria || []} 
                  onChange={(urls) => setEditingUnidade({...editingUnidade, galeria: urls})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço Completo</label>
              <Input 
                value={editingUnidade?.endereco || ''} 
                onChange={(e) => setEditingUnidade({...editingUnidade, endereco: e.target.value})}
                placeholder="Rua, número, bairro..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição da Unidade</label>
              <Textarea 
                value={editingUnidade?.descricao || ''} 
                onChange={(e) => setEditingUnidade({...editingUnidade, descricao: e.target.value})}
                placeholder="Descreva os diferenciais desta unidade..."
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Serviços de Infraestrutura</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'wifi', nome: 'Internet Fibra', icone: 'Wifi' },
                  { id: 'cafe', nome: 'Café e Água', icone: 'Coffee' },
                  { id: 'print', nome: 'Impressões', icone: 'Printer' }
                ].map(servico => (
                  <label key={servico.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                      checked={(editingUnidade?.servicos_infra || []).some((s: any) => s.id === servico.id)}
                      onChange={(e) => {
                        const current = editingUnidade?.servicos_infra || [];
                        if (e.target.checked) {
                          setEditingUnidade({
                            ...editingUnidade, 
                            servicos_infra: [...current, { ...servico, descricao: `Disponível na unidade ${editingUnidade.nome}` }]
                          });
                        } else {
                          setEditingUnidade({
                            ...editingUnidade, 
                            servicos_infra: current.filter((s: any) => s.id !== servico.id)
                          });
                        }
                      }}
                    />
                    <span className="text-sm font-bold text-slate-700">{servico.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUnidade(null)}>Cancelar</Button>
            <Button onClick={saveUnidade} className="bg-brand-orange text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sala */}
      <Dialog open={!!editingSala} onOpenChange={() => setEditingSala(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSala?.id ? "Editar Sala" : "Nova Sala"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Sala</label>
                <Input 
                  value={editingSala?.nome || ''} 
                  onChange={(e) => setEditingSala({...editingSala, nome: e.target.value})}
                  placeholder="Ex: Sala de Reunião 01"
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Galeria de Fotos</label>
                  <Button variant="outline" size="sm" onClick={() => { setMediaTarget('sala'); setIsMediaPickerOpen(true); }} className="h-8 text-xs">
                    <ImageIcon className="w-3 h-3 mr-2" /> Biblioteca
                  </Button>
                </div>
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
            <Button onClick={saveSala} className="bg-brand-orange text-white">Salvar Sala</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaPickerModal 
        isOpen={isMediaPickerOpen}
        onClose={() => { setIsMediaPickerOpen(false); setMediaTarget(null); }}
        onSelect={(url) => {
          if (mediaTarget === 'unidade') {
            const current = editingUnidade?.galeria || [];
            setEditingUnidade({...editingUnidade, galeria: [...current, url]});
          } else if (mediaTarget === 'sala') {
            const current = editingSala?.galeria || [];
            setEditingSala({...editingSala, galeria: [...current, url]});
          }
          setIsMediaPickerOpen(false);
          setMediaTarget(null);
        }}
      />
    </div>
  );
}
