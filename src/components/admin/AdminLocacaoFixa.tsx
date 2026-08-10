import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, AlertTriangle, FileText, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminLocacaoFixa({ contratos }: { contratos: any[] }) {
  const [contratosAtivos, setContratosAtivos] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");

  useEffect(() => { 
    fetchContratos(); 
    supabase.from('unidades').select('id, nome').then(({ data }) => setUnidades(data || []));
  }, []);

  async function fetchContratos() {
    const { data } = await supabase.from('contratos_ativos').select('*, clientes_corp(razao_social), salas(nome, unidade_id)');
    setContratosAtivos(data || []);
  }

  const filteredContratos = selectedUnidade === "todas" 
    ? contratosAtivos 
    : contratosAtivos.filter(c => c.salas?.unidade_id === selectedUnidade);

  const vencendoLogo = filteredContratos.filter(c => {
    const dataFim = new Date(c.data_fim);
    const hoje = new Date();
    const diff = (dataFim.getTime() - hoje.getTime()) / (1000 * 3600 * 24);
    return diff <= 30 && diff > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Salas Privativas / Locação Fixa</h2>
          <p className="text-muted-foreground">Contratos mensais e controle de vencimentos.</p>
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
          <Button className="bg-brand-orange text-white"><Briefcase className="w-4 h-4 mr-2" /> Novo Contrato</Button>
        </div>
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
        {filteredContratos.map(c => (
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
