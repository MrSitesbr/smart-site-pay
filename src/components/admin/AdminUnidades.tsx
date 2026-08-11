import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Save, X, Building2, Layers, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from "./ImageUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminUnidades() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [editingSala, setEditingSala] = useState<any>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnidades();
    fetchPlanos();
  }, []);

  async function fetchUnidades() {
    const { data } = await supabase.from('unidades').select('*').order('nome');
    setUnidades(data || []);
  }

  async function fetchPlanos() {
    const { data } = await supabase.from('planos').select('*').order('nome');
    setPlanos(data || []);
  }

  async function fetchSalas(unidade: any) {
    const { data } = await supabase.from('salas').select('*').eq('unidade_id', unidade.id).order('nome');
    setSalas(data || []);
    setSelectedUnidade(unidade);
  }

  async function saveUnidade() {
    if (!editingUnidade.nome) return toast.error("Nome é obrigatório");
    
    const payload: any = {
      nome: editingUnidade.nome,
      endereco: editingUnidade.endereco,
      descricao: editingUnidade.descricao,
      foto_url: editingUnidade.galeria?.[0] || '',
      galeria: editingUnidade.galeria || []
    };

    const { error } = editingUnidade.id 
      ? await (supabase as any).from('unidades').update(payload).eq('id', editingUnidade.id)
      : await (supabase as any).from('unidades').insert([payload]);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Unidade salva!");
      setEditingUnidade(null);
      fetchUnidades();
    }
  }

  async function deleteUnidade(id: string) {
    if (!confirm("Tem certeza? Isso excluirá todas as salas vinculadas.")) return;
    const { error } = await supabase.from('unidades').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Unidade excluída");
      fetchUnidades();
      if (selectedUnidade?.id === id) setSelectedUnidade(null);
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
      unidade_id: selectedUnidade.id
    };

    const { data: savedSala, error } = editingSala.id 
      ? await supabase.from('salas').update(payload).eq('id', editingSala.id).select().single()
      : await supabase.from('salas').insert([payload]).select().single();
    
    if (error) {
      toast.error(error.message);
      return;
    }

    // Salvar relacionamentos de planos
    if (savedSala) {
      // Remover planos antigos
      await supabase.from('sala_planos').delete().eq('sala_id', savedSala.id);
      
      // Inserir novos planos
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
      fetchSalas(selectedUnidade);
    }
  }

  async function deleteSala(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta sala?")) return;
    const { error } = await supabase.from('salas').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Sala excluída");
      fetchSalas(selectedUnidade);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Unidades & Salas</h2>
          <p className="text-muted-foreground">Gerencie endereços, infraestrutura e capacidades.</p>
        </div>
        <Button onClick={() => setEditingUnidade({ nome: '', endereco: '', descricao: '', foto_url: '' })} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Unidade
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Unidades Ativas
          </h3>
          <div className="grid gap-4">
            {unidades.map(u => (
              <Card key={u.id} className="group p-6 transition-all border-none shadow-sm hover:shadow-md bg-white rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row gap-6">
                  {u.foto_url && (
                    <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      <img 
                        src={u.foto_url} 
                        className="w-full h-full object-cover" 
                        alt={u.nome}
                        onError={(e) => {
                          console.error("Erro no card da unidade:", u.foto_url);
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-heading font-bold text-brand-blue-dark">{u.nome}</h3>
                      <p className="text-sm text-muted-foreground">{u.endereco || "Sem endereço cadastrado"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/admin/unidades/${u.id}`)} 
                        className="border-brand-blue-dark text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white rounded-xl px-6"
                      >
                        Acessar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {unidades.length === 0 && <p className="text-muted-foreground italic">Nenhuma unidade cadastrada.</p>}
          </div>
        </div>

        <div className="space-y-4">
          {selectedUnidade ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5" /> Salas: {selectedUnidade.nome}
                </h3>
                <Button size="sm" onClick={() => setEditingSala({ nome: '', tipo: 'Coworking', capacidade: '', descricao: '' })} className="bg-brand-blue-dark text-white">
                  <Plus className="w-4 h-4 mr-2" /> Nova Sala
                </Button>
              </div>
              <div className="grid gap-4">
                {salas.map(s => (
                  <Card key={s.id} className="p-4 border-none shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-blue-dark">{s.nome}</span>
                          <span className="text-[10px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full uppercase font-bold">
                            {s.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Capacidade: {s.capacidade || 'N/A'} pessoas
                        </p>
                        {s.descricao && <p className="text-xs italic mt-1 line-clamp-1">{s.descricao}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          const { data } = await supabase.from('sala_planos').select('plano_id').eq('sala_id', s.id);
                          setEditingSala({...s, planos_permitidos: (data || []).map(d => d.plano_id)});
                        }}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/unidades/sala/${s.id}`)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSala(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {salas.length === 0 && <p className="text-muted-foreground italic">Nenhuma sala cadastrada nesta unidade.</p>}
              </div>
            </>
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center border-dashed border-2 bg-muted/30">
              <Layers className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground">Selecione uma unidade para gerenciar as salas.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog Unidade */}
      <Dialog open={!!editingUnidade} onOpenChange={() => setEditingUnidade(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUnidade?.id ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
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
                <label className="text-sm font-medium">Galeria de Fotos (Multi-upload)</label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUnidade(null)}>Cancelar</Button>
            <Button onClick={saveUnidade} className="bg-brand-orange text-white">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sala */}
      <Dialog open={!!editingSala} onOpenChange={() => setEditingSala(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSala?.id ? "Editar Sala" : "Nova Sala"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Planos de Horas Permitidos</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {planos.map(p => (
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
                    <span>{p.nome}</span>
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
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSala(null)}>Cancelar</Button>
            <Button onClick={saveSala} className="bg-brand-orange text-white">Salvar Sala</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
