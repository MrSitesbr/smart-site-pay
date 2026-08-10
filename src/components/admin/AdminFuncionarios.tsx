import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  useEffect(() => { fetchFuncionarios(); }, []);

  async function fetchFuncionarios() {
    const { data } = await supabase.from('funcionarios_cliente').select('*, clientes_corp(razao_social)');
    setFuncionarios(data || []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Funcionários por Cliente</h2>
          <p className="text-muted-foreground">Gerencie pessoas vinculadas aos clientes corporativos.</p>
        </div>
        <Button className="bg-brand-orange text-white"><Plus className="w-4 h-4 mr-2" /> Adicionar Funcionário</Button>
      </div>

      <div className="grid gap-4">
        {funcionarios.map(f => (
          <Card key={f.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">{f.nome}</h3>
                <p className="text-xs text-muted-foreground">{f.cargo} · {f.clientes_corp?.razao_social}</p>
                <p className="text-[10px] text-muted-foreground">{f.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Editar</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
