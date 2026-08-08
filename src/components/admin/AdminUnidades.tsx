import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Image as ImageIcon, Trash2, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminUnidades() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUnidades(); }, []);

  async function fetchUnidades() {
    const { data } = await supabase.from('unidades' as any).select('*');
    setUnidades(data || [
      { id: '1', nome: 'Sede Kennedy', endereco: 'Av. Pres. Kennedy, 2191', status: 'Ativo', espaços: 4 }
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Unidades & Espaços</h2>
          <p className="text-muted-foreground">Gerencie seus locais físicos e as salas disponíveis para reserva.</p>
        </div>
        <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white"><Plus className="w-4 h-4 mr-2" /> Nova Unidade</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {unidades.map(u => (
          <Card key={u.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
            <div className="aspect-video bg-muted relative group">
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <Button size="sm" variant="secondary"><ImageIcon className="w-4 h-4 mr-2" /> Trocar Foto</Button>
              </div>
              <div className="absolute top-4 right-4 bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{u.status}</div>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-heading font-bold text-brand-blue-dark">{u.nome}</h3>
                  <p className="text-sm text-muted-foreground">{u.endereco}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dashed space-y-3">
                 <div className="flex items-center justify-between text-sm">
                   <span className="font-medium">Salas Privativas</span>
                   <span className="text-brand-orange font-bold">2 disponíveis</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="font-medium">Salas de Reunião</span>
                   <span className="text-brand-orange font-bold">1 disponível</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="font-medium">Coworking (Estações)</span>
                   <span className="text-brand-orange font-bold">20 lugares</span>
                 </div>
              </div>

              <Button variant="outline" className="w-full mt-6">Gerenciar Espaços desta Unidade</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
