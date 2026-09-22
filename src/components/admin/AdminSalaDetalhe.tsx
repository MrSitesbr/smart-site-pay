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
import { MediaPickerModal } from "./MediaPickerModal";
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
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

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

    const updatePayload: any = {
      nome: editingSala.nome,
      categoria: editingSala.categoria,
      tipo_locacao: editingSala.tipo_locacao,
      subtipo_periodo: editingSala.tipo_locacao === 'locacao_periodo' ? editingSala.subtipo_periodo : null,
      capacidade: parseInt(editingSala.capacidade) || null,
      descricao: editingSala.descricao,
      foto_url: editingSala.galeria?.[0] || '',
      galeria: editingSala.galeria || [],
      status: editingSala.status || 'disponivel',
      metadata: editingSala.metadata || {},
      preco_locacao_mensal: editingSala.preco_locacao_mensal == null ? null : Number(editingSala.preco_locacao_mensal),
      preco_periodo_pacote_mensal: editingSala.preco_periodo_pacote_mensal == null ? null : Number(editingSala.preco_periodo_pacote_mensal),
      preco_periodo_locacao_avulsa: editingSala.preco_periodo_locacao_avulsa == null ? null : Number(editingSala.preco_periodo_locacao_avulsa),
    };

    const { error } = await supabase
      .from('salas')
      .update(updatePayload)
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
                onClick={() => navigate(`/admin/unidades/salas/${id}/editar`)}
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
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Metragem</p>
                    <p className="text-brand-blue-dark font-black">{sala.metadata?.metragem || '0'} m²</p>
                  </div>
                  <div className="flex gap-2">
                    {sala.metadata?.tem_janela && <Badge variant="outline" className="text-[10px] border-brand-orange/20 text-brand-orange">Com Janela</Badge>}
                    {sala.metadata?.tem_lavatorio && <Badge variant="outline" className="text-[10px] border-brand-blue-dark/20 text-brand-blue-dark">Com Lavatório</Badge>}
                  </div>
                </div>
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
                <div className="flex flex-wrap gap-2 pt-2">
                  {(sala.categorias || [sala.categoria]).filter(Boolean).map((categoria: string) => <Badge key={categoria} variant="outline">{categoria.replaceAll("_", " ")}</Badge>)}
                  {(sala.modalidades_locacao || []).map((modalidade: string) => <Badge key={modalidade} variant="secondary">{modalidade}</Badge>)}
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
                <label className="text-sm font-medium">Categoria</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={editingSala?.categoria || ''}
                  onChange={(e) => setEditingSala({...editingSala, categoria: e.target.value})}
                >
                  <option value="Coworking">Coworking</option>
                  <option value="privativa">Sala Privativa</option>
                  <option value="compartilhado">Escritório Compartilhado</option>
                  <option value="consultorio_poltrona">Consultório com Poltrona</option>
                  <option value="consultorio_maca">Consultório com Maca</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capacidade (Pessoas)</label>

                <label className="text-sm font-medium">Tipo de Locação</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={editingSala?.tipo_locacao || ''}
                  onChange={(e) => setEditingSala({...editingSala, tipo_locacao: e.target.value})}
                >
                  <option value="locacao_mensal">Locação Mensal</option>
                  <option value="locacao_periodo">Locação por Período</option>
                </select>

                {editingSala.tipo_locacao === 'locacao_periodo' ? (
                  <div className="mt-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Subtipo</label>
                    <select 
                      className="w-full px-3 py-1 bg-white border rounded-md text-sm"
                      value={editingSala?.subtipo_periodo || ''}
                      onChange={(e) => setEditingSala({...editingSala, subtipo_periodo: e.target.value})}
                    >
                      <option value="pacote_mensal">Pacote Mensal</option>
                      <option value="locacao_avulsa">Locação Avulsa</option>
                    </select>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select 
                      className="w-full px-3 py-1 bg-white border rounded-md text-sm"
                      value={editingSala?.status || 'disponivel'}
                      onChange={(e) => setEditingSala({...editingSala, status: e.target.value})}
                    >
                      <option value="disponivel">Disponível</option>
                      <option value="indisponivel">Indisponível</option>
                      <option value="oculto">Oculto</option>
                    </select>
                  </div>
                )}

                <label className="text-sm font-medium">Capacidade (Pessoas)</label>
                <Input 
                  type="number"
                  value={editingSala?.capacidade || ''} 
                  onChange={(e) => setEditingSala({...editingSala, capacidade: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Metragem (m²)</label>
                <Input 
                  type="number"
                  value={editingSala?.metadata?.metragem || ''} 
                  onChange={(e) => setEditingSala({
                    ...editingSala, 
                    metadata: { ...editingSala.metadata, metragem: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                  checked={editingSala?.metadata?.tem_janela || false}
                  onChange={(e) => setEditingSala({
                    ...editingSala,
                    metadata: { ...editingSala.metadata, tem_janela: e.target.checked }
                  })}
                />
                <span className="text-sm font-medium">Tem Janela</span>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                  checked={editingSala?.metadata?.tem_lavatorio || false}
                  onChange={(e) => setEditingSala({
                    ...editingSala,
                    metadata: { ...editingSala.metadata, tem_lavatorio: e.target.checked }
                  })}
                />
                <span className="text-sm font-medium">Tem Lavatório</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preços da Sala</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Preço Locação Mensal</label>
                  <Input 
                    type="number"
                    min={0}
                    value={editingSala?.preco_locacao_mensal ?? ''}
                    onChange={(e) => setEditingSala({...editingSala, preco_locacao_mensal: e.target.value === '' ? null : Number(e.target.value)})}
                  />
                </div>
                {editingSala?.tipo_locacao === 'locacao_periodo' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Preço Pacote Mensal</label>
                      <Input 
                        type="number"
                        min={0}
                        value={editingSala?.preco_periodo_pacote_mensal ?? ''}
                        onChange={(e) => setEditingSala({...editingSala, preco_periodo_pacote_mensal: e.target.value === '' ? null : Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Preço Locação Avulsa</label>
                      <Input 
                        type="number"
                        min={0}
                        value={editingSala?.preco_periodo_locacao_avulsa ?? ''}
                        onChange={(e) => setEditingSala({...editingSala, preco_periodo_locacao_avulsa: e.target.value === '' ? null : Number(e.target.value)})}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Galeria de Fotos</label>
                <Button variant="outline" size="sm" onClick={() => setIsMediaPickerOpen(true)} className="h-8 text-xs">
                  <ImageIcon className="w-3 h-3 mr-2" /> Biblioteca
                </Button>
              </div>
              <ImageUpload 
                value={editingSala?.galeria || []} 
                onChange={(urls) => setEditingSala({...editingSala, galeria: urls})}
              />
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

      <MediaPickerModal 
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url) => {
          const current = editingSala?.galeria || [];
          setEditingSala({...editingSala, galeria: [...current, url]});
          setIsMediaPickerOpen(false);
        }}
      />
    </div>
  );
}
