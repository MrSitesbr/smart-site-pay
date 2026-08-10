import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminPlanosHoras() {
  const [planos, setPlanos] = useState<any[]>([]);

  useEffect(() => { fetchPlanos(); }, []);

  async function fetchPlanos() {
    const { data } = await supabase.from('planos').select('*');
    setPlanos(data || []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Planos de Horas</h2>
          <p className="text-muted-foreground">Gerencie planos por quantidade de horas.</p>
        </div>
        <Button className="bg-brand-orange text-white"><Plus className="w-4 h-4 mr-2" /> Novo Plano</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {planos.map(p => (
          <Card key={p.id} className="p-6 flex flex-col items-center text-center">
            <Clock className="w-12 h-12 text-brand-orange mb-4" />
            <h3 className="font-bold text-lg">{p.nome}</h3>
            <p className="text-2xl font-black text-brand-blue-dark my-2">{p.quantidade_horas} Horas</p>
            <p className="text-brand-orange font-bold">R$ {p.preco}</p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1"><Edit2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
