import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminVisitantes() {
  const [visitantes, setVisitantes] = useState<any[]>([]);

  useEffect(() => { fetchVisitantes(); }, []);

  async function fetchVisitantes() {
    const { data } = await supabase.from('visitantes').select('*, clientes_corp(razao_social), salas(nome)');
    setVisitantes(data || []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Controle de Visitantes</h2>
          <p className="text-muted-foreground">Agendamento e controle de acesso de visitantes.</p>
        </div>
        <Button className="bg-brand-orange text-white"><Plus className="w-4 h-4 mr-2" /> Novo Agendamento</Button>
      </div>

      <div className="grid gap-4">
        {visitantes.map(v => (
          <Card key={v.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-brand-orange">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">{v.nome}</h3>
                <p className="text-xs text-muted-foreground">Visita: {v.clientes_corp?.razao_social} na {v.salas?.nome}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{new Date(v.data_hora_prevista).toLocaleString('pt-BR')}</p>
              <Badge variant="outline" className="mt-1">Pendente</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${className}`}>{children}</span>;
}
