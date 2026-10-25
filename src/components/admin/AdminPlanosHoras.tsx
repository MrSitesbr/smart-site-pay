import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Archive, Edit2, Clock, Save, X, Building2 } from "lucide-react";
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
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");

  useEffect(() => { 
    fetchPlanos(); 
    supabase.from('unidades').select('id, nome').then(({ data }) => setUnidades(data || []));
  }, []);

  async function fetchPlanos() {
    const { data } = await (supabase.from('planos') as any).select('*').is('deleted_at', null).order('ordem').order('nome');
    setPlanos(data || []);
  }

  // Filtragem (embora a tabela 'planos' não tenha unidade_id, adicionamos o filtro UI para consistência se no futuro tiver)
  const filteredPlanos = planos;
  const resumoRegra = (p: any) => p.regra_uso === "semanal" ? `${p.horas_semana ?? 0}h por semana${p.bloco_unico ? " (bloco único)" : ""}`
    : p.regra_uso === "pacote" ? `${p.quantidade_horas ?? 0}h em ${p.duracao_meses ?? "-"} meses`
    : p.regra_uso === "mensal_reuniao" ? `${p.horas_reuniao_mes ?? 0}h de reunião/mês`
    : p.regra_uso === "sem_horas" ? "Sem horas de sala" : p.regra_uso === "avulso" ? "Por hora" : `${p.quantidade_horas ?? 0}h`;


  async function arquivarPlano(id: string) {
    if (!confirm("Arquivar este plano? O histórico será preservado.")) return;
    const { error } = await (supabase.from('planos') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plano arquivado");
      fetchPlanos();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Planos</h2>
          <p className="text-muted-foreground">Gerencie os planos de horas e serviços.</p>
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
          <Button onClick={() => navigate("/admin/planos/novo")} className="bg-brand-orange text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Plano
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planos.map(p => (
          <Card key={p.id} className="p-6 flex flex-col items-center text-center relative hover:shadow-lg transition-all border-none shadow-sm">
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => navigate(`/admin/planos/${p.id}`)} className="p-2 hover:bg-accent rounded-full transition-colors"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
              <button onClick={() => arquivarPlano(p.id)} title="Arquivar plano" className="p-2 hover:bg-destructive/10 rounded-full transition-colors"><Archive className="w-4 h-4 text-destructive" /></button>
            </div>
            
            <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-brand-orange" />
            </div>
            
            <h3 className="font-heading font-bold text-xl text-brand-blue-dark">{p.nome}</h3>
            <div className="my-4">
              <p className="text-xl font-black text-brand-blue-dark">{resumoRegra(p)}</p>
              <p className="text-sm text-muted-foreground">{p.subtitulo || "Plano"}{p.exibir_site === false ? " · oculto no site" : ""}</p>
            </div>
            
            <div className="bg-brand-orange/5 w-full py-3 rounded-xl mb-4">
              <p className="text-brand-orange font-bold text-2xl">{Number(p.preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className="text-[10px] text-brand-orange uppercase font-bold tracking-wider">{p.cobranca === "unico" ? "Pagamento único" : p.cobranca === "hora" ? "Por hora" : "Por mês"}{p.duracao_meses ? ` · contrato de ${p.duracao_meses} meses` : ""}</p>
            </div>

            <Button variant="outline" className="w-full border-brand-blue-dark text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white" onClick={() => navigate(`/admin/planos/${p.id}`)}>
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

    </div>
  );
}
