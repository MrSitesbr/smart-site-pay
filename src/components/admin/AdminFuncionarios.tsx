import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Search, Building2, UserCircle, ShieldCheck, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchData(); 
  }, []);

  async function fetchData() {
    setLoading(true);
    const [funcRes, uniRes] = await Promise.all([
      supabase.from('funcionarios_cliente').select('*, clientes_corp(razao_social, unidade_id)'),
      supabase.from('unidades').select('id, nome')
    ]);
    setFuncionarios(funcRes.data || []);
    setUnidades(uniRes.data || []);
    setLoading(false);
  }

  const filtered = funcionarios.filter(f => {
    const matchesSearch = f.nome.toLowerCase().includes(search.toLowerCase()) || 
                         f.clientes_corp?.razao_social.toLowerCase().includes(search.toLowerCase());
    // Note: assumindo que o funcionário tem acesso onde o cliente dele tem contrato
    const matchesUnidade = selectedUnidade === "todas" || f.clientes_corp?.unidade_id === selectedUnidade;
    return matchesSearch && matchesUnidade;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Gestão de Acessos: Funcionários</h2>
          <p className="text-muted-foreground">Controle quem está autorizado a entrar nas unidades por empresa.</p>
        </div>
        <Button onClick={() => toast.info("Para adicionar um colaborador, acesse os detalhes de um Cliente Corporativo.")} className="bg-brand-orange text-white">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Autorizado
        </Button>

      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl shadow-sm border border-brand-blue-dark/5">
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar por funcionário ou empresa..." 
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map(f => (
          <Card key={f.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-none shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-blue-dark/5 flex items-center justify-center text-brand-blue-dark shrink-0">
                <UserCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-lg text-brand-blue-dark uppercase">{f.nome}</h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> ACESSO LIBERADO
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> 
                    Empresa: <span className="font-bold text-foreground">{f.clientes_corp?.razao_social}</span>
                  </p>
                  <p className="text-muted-foreground">Cargo: <span className="text-foreground">{f.cargo || "N/A"}</span></p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Identificação</p>
                <p className="text-xs font-medium">{f.email || "Email não cadastrado"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="font-bold text-brand-blue-dark">Ver Histórico</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="py-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground italic">Nenhum funcionário encontrado para esta busca ou unidade.</p>
          </div>
        )}
      </div>
    </div>
  );
}
