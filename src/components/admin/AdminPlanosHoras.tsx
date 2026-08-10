import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Clock, Save, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminPlanosHoras() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [editingPlano, setEditingPlano] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");

  useEffect(() => { 
    fetchPlanos(); 
    supabase.from('unidades').select('id, nome').then(({ data }) => setUnidades(data || []));
  }, []);

  async function fetchPlanos() {
    const { data } = await supabase.from('planos').select('*').order('quantidade_horas');
    setPlanos(data || []);
  }

  // Filtragem (embora a tabela 'planos' não tenha unidade_id, adicionamos o filtro UI para consistência se no futuro tiver)
  const filteredPlanos = planos;

  async function savePlano() {
    if (!editingPlano.nome || !editingPlano.preco || !editingPlano.quantidade_horas) {
      return toast.error("Preencha todos os campos obrigatórios");
    }

    const payload = {
      nome: editingPlano.nome,
      preco: parseFloat(editingPlano.preco),
      quantidade_horas: parseInt(editingPlano.quantidade_horas),
      validade_dias: editingPlano.validade_dias ? parseInt(editingPlano.validade_dias) : null
    };

    const { error } = editingPlano.id 
      ? await supabase.from('planos').update(payload).eq('id', editingPlano.id)
      : await supabase.from('planos').insert([payload]);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Plano salvo!");
      setEditingPlano(null);
      fetchPlanos();
    }
  }

  async function deletePlano(id: string) {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    const { error } = await supabase.from('planos').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plano excluído");
      fetchPlanos();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Planos de Horas</h2>
          <p className="text-muted-foreground">Gerencie pacotes de horas para os clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
              <SelectTrigger className="w-[180px] h-8 border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Unidades</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setEditingPlano({ nome: '', preco: '', quantidade_horas: '', validade_dias: '30' })} className="bg-brand-orange text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Plano
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map(p => (
          <Card key={p.id} className="p-6 flex flex-col items-center text-center relative hover:shadow-lg transition-all border-none shadow-sm">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => setEditingPlano(p)} className="p-2 hover:bg-accent rounded-full transition-colors"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
              <button onClick={() => deletePlano(p.id)} className="p-2 hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
            </div>
            
            <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-brand-orange" />
            </div>
            
            <h3 className="font-heading font-bold text-xl text-brand-blue-dark">{p.nome}</h3>
            <div className="my-4">
              <p className="text-4xl font-black text-brand-blue-dark">{p.quantidade_horas}h</p>
              <p className="text-sm text-muted-foreground">Pacote de Horas</p>
            </div>
            
            <div className="bg-brand-orange/5 w-full py-3 rounded-xl mb-4">
              <p className="text-brand-orange font-bold text-2xl">R$ {p.preco}</p>
              {p.validade_dias && <p className="text-[10px] text-brand-orange uppercase font-bold tracking-wider">Validade: {p.validade_dias} dias</p>}
            </div>

            <Button variant="outline" className="w-full border-brand-blue-dark text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white" onClick={() => setEditingPlano(p)}>
              Editar Configurações
            </Button>
          </Card>
        ))}
        {planos.length === 0 && (
          <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground italic">Nenhum plano cadastrado ainda.</p>
          </div>
        )}
      </div>

      {/* Dialog Plano */}
      <Dialog open={!!editingPlano} onOpenChange={() => setEditingPlano(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlano?.id ? "Editar Plano" : "Novo Plano de Horas"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Plano</label>
              <Input 
                value={editingPlano?.nome || ''} 
                onChange={(e) => setEditingPlano({...editingPlano, nome: e.target.value})}
                placeholder="Ex: Pacote VIP 20h"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantidade de Horas</label>
                <Input 
                  type="number"
                  value={editingPlano?.quantidade_horas || ''} 
                  onChange={(e) => setEditingPlano({...editingPlano, quantidade_horas: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço (R$)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={editingPlano?.preco || ''} 
                  onChange={(e) => setEditingPlano({...editingPlano, preco: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Validade (Dias)</label>
              <Input 
                type="number"
                value={editingPlano?.validade_dias || ''} 
                onChange={(e) => setEditingPlano({...editingPlano, validade_dias: e.target.value})}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlano(null)}>Cancelar</Button>
            <Button onClick={savePlano} className="bg-brand-orange text-white">Salvar Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
