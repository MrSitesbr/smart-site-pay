import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLocacaoFixa({ contratos }: { contratos: any[] }) {
  const [contratosAtivos, setContratosAtivos] = useState<any[]>([]);

  useEffect(() => { fetchContratos(); }, []);

  async function fetchContratos() {
    const { data } = await supabase.from('contratos_ativos').select('*, clientes_corp(razao_social), salas(nome)');
    setContratosAtivos(data || []);
  }

  const vencendoLogo = contratosAtivos.filter(c => {
    const dataFim = new Date(c.data_fim);
    const hoje = new Date();
    const diff = (dataFim.getTime() - hoje.getTime()) / (1000 * 3600 * 24);
    return diff <= 30 && diff > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Salas Privativas / Locação Fixa</h2>
          <p className="text-muted-foreground">Contratos mensais e controle de vencimentos.</p>
        </div>
        <Button className="bg-brand-orange text-white"><Briefcase className="w-4 h-4 mr-2" /> Novo Contrato Fixo</Button>
      </div>

      {vencendoLogo.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-center gap-4 text-amber-800">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <p className="font-bold">Atenção: {vencendoLogo.length} contratos próximos do vencimento!</p>
            <p className="text-xs">Contratos com menos de 30 dias para expirar.</p>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {contratosAtivos.map(c => (
          <Card key={c.id} className="p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{c.clientes_corp?.razao_social}</h3>
              <p className="text-sm text-muted-foreground">{c.salas?.nome} · R$ {c.valor_mensal}/mês</p>
              <p className="text-xs mt-1">Vigência: {new Date(c.data_inicio).toLocaleDateString()} até {new Date(c.data_fim).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" /> Gerar Contrato</Button>
              <Button variant="ghost" size="sm" className="text-brand-orange font-bold">Editar</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
