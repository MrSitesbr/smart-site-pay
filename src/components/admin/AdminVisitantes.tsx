import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck, Calendar, Search, Building2, Clock, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NovoVisitanteDialog from "./NovoVisitanteDialog";

export default function AdminVisitantes() {
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");
  const [search, setSearch] = useState("");
  const [showNovoVisita, setShowNovoVisita] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchData(); 
  }, []);

  async function fetchData() {
    setLoading(true);
    const [visRes, uniRes] = await Promise.all([
      supabase.from('visitantes').select('*, clientes_corp(razao_social), salas(nome, unidade_id)').order('data_hora_prevista', { ascending: false }),
      supabase.from('unidades').select('id, nome')
    ]);
    setVisitantes(visRes.data || []);
    setUnidades(uniRes.data || []);
    setLoading(false);
  }

  const filtered = visitantes.filter(v => {
    const matchesSearch = v.nome.toLowerCase().includes(search.toLowerCase()) || 
                         v.clientes_corp?.razao_social.toLowerCase().includes(search.toLowerCase());
    const matchesUnidade = selectedUnidade === "todas" || v.salas?.unidade_id === selectedUnidade;
    return matchesSearch && matchesUnidade;
  });

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const visitasHoje = filtered.filter(v => {
    if (!v.data_hora_prevista) return false;
    const data = new Date(v.data_hora_prevista);
    data.setHours(0,0,0,0);
    return data.getTime() === hoje.getTime();
  });

  const futurasVisitas = filtered.filter(v => {
    if (!v.data_hora_prevista) return false;
    const data = new Date(v.data_hora_prevista);
    data.setHours(0,0,0,0);
    return data.getTime() > hoje.getTime();
  });

  const semAgendamento = filtered.filter(v => !v.data_hora_prevista);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Controle de Portaria & Visitantes</h2>
          <p className="text-muted-foreground">Lista de acesso autorizado para portaria e recepção.</p>
        </div>
        <Button onClick={() => setShowNovoVisita(true)} className="bg-brand-orange text-white">
          <Plus className="w-4 h-4 mr-2" /> Agendar Visita
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl shadow-sm border border-brand-blue-dark/5">
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar por visitante ou cliente..." 
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      <div className="space-y-8">
        {/* VISITAS DE HOJE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-l-4 border-brand-orange pl-3">
            <h3 className="font-heading font-black text-brand-blue-dark text-xl">Acessos para Hoje</h3>
            <span className="bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full text-xs font-bold">
              {visitasHoje.length}
            </span>
          </div>
          
          <div className="grid gap-4">
            {visitasHoje.map(v => (
              <VisitanteCard key={v.id} v={v} />
            ))}
            {visitasHoje.length === 0 && (
              <p className="text-muted-foreground italic bg-muted/20 p-8 rounded-xl text-center border-2 border-dashed">
                Nenhum visitante agendado para hoje nesta unidade.
              </p>
            )}
          </div>
        </section>

        {/* PRÓXIMOS DIAS */}
        <section className="space-y-4">
          <h3 className="font-heading font-black text-brand-blue-dark text-xl border-l-4 border-brand-blue-dark pl-3">
            Próximos Dias
          </h3>
          <div className="grid gap-4">
            {futurasVisitas.map(v => (
              <VisitanteCard key={v.id} v={v} />
            ))}
            {futurasVisitas.length === 0 && (
              <p className="text-muted-foreground italic text-sm">Nenhum agendamento futuro encontrado.</p>
            )}
          </div>
        </section>

        {/* CADASTRADOS SEM AGENDAMENTO */}
        {semAgendamento.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-heading font-black text-brand-blue-dark text-xl border-l-4 border-muted-foreground pl-3">
              Cadastrados (sem data marcada)
            </h3>
            <div className="grid gap-4">
              {semAgendamento.map(v => <VisitanteCard key={v.id} v={v} />)}
            </div>
          </section>
        )}
      </div>


      <NovoVisitanteDialog 
        open={showNovoVisita}
        onOpenChange={setShowNovoVisita}
        date={new Date()}
        onCreated={fetchData}
      />
    </div>
  );
}

function VisitanteCard({ v }: { v: any }) {
  const data = v.data_hora_prevista ? new Date(v.data_hora_prevista) : null;
  const hora = data ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "--:--";
  const dia = data ? data.toLocaleDateString('pt-BR') : "Sem data";


  return (
    <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-none shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange shrink-0">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-lg text-brand-blue-dark uppercase">{v.nome}</h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              ACESSO AUTORIZADO
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <p className="text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> 
              Cliente: <span className="font-bold text-foreground">{v.clientes_corp?.razao_social}</span>
            </p>
            <p className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> 
              Local: <span className="font-bold text-foreground">{v.salas?.nome}</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Horário Previsto</p>
          <div className="flex items-center gap-2 text-brand-blue-dark justify-end">
            <Clock className="w-4 h-4" />
            <p className="text-xl font-black">{hora}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{dia}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Edição de visitante em desenvolvimento")}><Edit2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => toast.info("Exclusão de visitante em desenvolvimento")}><Trash2 className="w-4 h-4" /></Button>

        </div>
      </div>
    </Card>
  );
}
