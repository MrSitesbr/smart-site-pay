import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Save, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminUnidades() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);

  useEffect(() => { fetchUnidades(); }, []);

  async function fetchUnidades() {
    const { data } = await supabase.from('unidades').select('*');
    setUnidades(data || []);
  }

  async function fetchSalas(unidadeId: string) {
    const { data } = await supabase.from('salas').select('*').eq('unidade_id', unidadeId);
    setSalas(data || []);
    setSelectedUnidade(unidadeId);
  }

  async function saveUnidade(u: any) {
    const { error } = u.id 
      ? await supabase.from('unidades').update(u).eq('id', u.id)
      : await supabase.from('unidades').insert(u);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Unidade salva!");
      setEditing(null);
      fetchUnidades();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Unidades & Salas</h2>
          <p className="text-muted-foreground">Gerencie unidades físicas e as salas de cada uma.</p>
        </div>
        <Button onClick={() => setEditing({ nome: '', endereco: '' })} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Unidade
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {unidades.map(u => (
          <Card key={u.id} className="p-6 border-none shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-heading font-bold text-brand-blue-dark">{u.nome}</h3>
                <p className="text-sm text-muted-foreground">{u.endereco}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(u)}><Edit2 className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => fetchSalas(u.id)} className="border-brand-blue-dark text-brand-blue-dark hover:bg-brand-blue-dark/10">Salas</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedUnidade && (
        <Card className="p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Salas da Unidade</h3>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Adicionar Sala</Button>
          </div>
          <div className="grid gap-4">
            {salas.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>{s.nome} ({s.tipo})</span>
                <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
