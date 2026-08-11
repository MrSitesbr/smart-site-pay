import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Coffee, Wifi, Car, Printer, Edit2, Trash2, Save, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogScrollContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminServicos() {
  const [servicos, setServicos] = useState<any[]>([]);
  const [editingServico, setEditingServico] = useState<any>(null);

  useEffect(() => { fetchServicos(); }, []);

  async function fetchServicos() {
    const { data } = await supabase.from('servicos').select('*').order('nome');
    setServicos(data || []);
  }

  async function saveServico() {
    if (!editingServico.nome) return toast.error("Nome é obrigatório");
    
    const { error } = editingServico.id 
      ? await supabase.from('servicos').update({
          nome: editingServico.nome,
          preco: editingServico.preco,
          categoria: editingServico.categoria,
          icon: editingServico.icon
        }).eq('id', editingServico.id)
      : await supabase.from('servicos').insert([{
          nome: editingServico.nome,
          preco: editingServico.preco,
          categoria: editingServico.categoria,
          icon: editingServico.icon
        }]);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Serviço salvo!");
      setEditingServico(null);
      fetchServicos();
    }
  }

  async function deleteServico(id: string) {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Serviço excluído");
      fetchServicos();
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee': return <Coffee className="w-8 h-8" />;
      case 'Printer': return <Printer className="w-8 h-8" />;
      case 'Car': return <Car className="w-8 h-8" />;
      case 'Wifi': return <Wifi className="w-8 h-8" />;
      case 'Building2': return <Building2 className="w-8 h-8" />;
      default: return <Building2 className="w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Serviços</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de serviços do site.</p>
        </div>
        <Button onClick={() => setEditingServico({ nome: '', preco: '', categoria: 'Adicional', icon: 'Building2' })} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {servicos.map(s => (
          <Card key={s.id} className="p-6 border-none shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingServico(s)} className="h-8 w-8 p-0"><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => deleteServico(s.id)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
            
            <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-4">
               {getIcon(s.icon)}
            </div>
            <h3 className="font-heading font-bold text-brand-blue-dark">{s.nome}</h3>
            <p className="text-sm font-bold text-brand-orange mt-1">{s.preco || "Cortesia"}</p>
            <p className="text-[10px] text-muted-foreground uppercase mt-2">{s.categoria}</p>
          </Card>
        ))}
        {servicos.length === 0 && (
          <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground italic">Nenhum serviço cadastrado.</p>
          </div>
        )}
      </div>

      {/* Dialog Serviço */}
      <Dialog open={!!editingServico} onOpenChange={() => setEditingServico(null)}>
        <DialogScrollContent>
          <DialogHeader>
            <DialogTitle>{editingServico?.id ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Serviço</label>
              <Input 
                value={editingServico?.nome || ''} 
                onChange={(e) => setEditingServico({...editingServico, nome: e.target.value})}
                placeholder="Ex: Café Expresso, Impressões..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preço / Texto de Valor</label>
              <Input 
                value={editingServico?.preco || ''} 
                onChange={(e) => setEditingServico({...editingServico, preco: e.target.value})}
                placeholder="Ex: R$ 5,00 ou Cortesia"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={editingServico?.categoria || ''}
                  onChange={(e) => setEditingServico({...editingServico, categoria: e.target.value})}
                >
                  <option value="Cortesia">Cortesia</option>
                  <option value="Adicional">Adicional</option>
                  <option value="Infraestrutura">Infraestrutura</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ícone</label>
                <select 
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={editingServico?.icon || 'Building2'}
                  onChange={(e) => setEditingServico({...editingServico, icon: e.target.value})}
                >
                  <option value="Coffee">Café (Coffee)</option>
                  <option value="Printer">Impressora (Printer)</option>
                  <option value="Car">Estacionamento (Car)</option>
                  <option value="Wifi">Internet (Wifi)</option>
                  <option value="Building2">Geral (Building)</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingServico(null)}>Cancelar</Button>
            <Button onClick={saveServico} className="bg-brand-orange text-white">Salvar Serviço</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
