import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageCircle, Mail, UserRoundCheck, UserPlus, Send, Handshake, CheckCircle2, GripVertical, Eye, Trash2, Archive } from "lucide-react";
import EventAvatar from "./EventAvatar";
import { useClientColors } from "@/hooks/useClientColors";
import { getClientColor } from "@/lib/clientColors";
import { toast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Cliente = {
  email: string;
  nome: string;
  telefone: string;
  nicho: string | null;
  total_solicitacoes: number;
  total_pago: number;
  total_pendente: number;
  total_valor: number;
  ambientes: Set<string>;
  ultima_atividade: string;
  etapa: string;
};

const FUNIL = [
  { id: "pendente", label: "Prospecção", help: "Entrada", icon: UserPlus, color: "border-slate-300 bg-slate-50" },
  { id: "contato", label: "Contato Inicial", help: "Qualificação", icon: MessageCircle, color: "border-cyan-200 bg-cyan-50/50" },
  { id: "aprovada", label: "Proposta Enviada", help: "Consideração", icon: Send, color: "border-blue-200 bg-blue-50/50" },
  { id: "negociacao", label: "Negociação", help: "Decisão", icon: Handshake, color: "border-amber-200 bg-amber-50/50" },
  { id: "paga", label: "Fechado / Ganho", help: "Conversão", icon: CheckCircle2, color: "border-emerald-200 bg-emerald-50/50" },
] as const;

const LEAD_ERROR = "Não foi possível atualizar a etapa do lead. Tente novamente.";

function etapaDoLead(status: string) {
  if (status === "paga" || status === "concluida") return "paga";
  if (status === "contato") return "contato";
  if (status === "cancelada") return "pendente";
  if (status === "aprovada") return "aprovada";
  if (status === "negociacao") return "negociacao";
  return "pendente";
}

export default function AdminClientes({ contratos, reservas, onRefresh }: { contratos: any[]; reservas: any[]; onRefresh?: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Cliente | null>(null);
  const [leadEtapas, setLeadEtapas] = useState<Record<string, string>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [crmClientes, setCrmClientes] = useState<any[]>([]);
  const [loadingApagarTudo, setLoadingApagarTudo] = useState(false);
  const { overrides } = useClientColors();

  // Função para APAGAR TUDO - todos os leads, reservas e contratos
  async function apagarTudo() {
    const senha = prompt("DIGITE 'APAGAR TUDO' para confirmar (maiúsculas):");
    if (senha !== "APAGAR TUDO") {
      toast({ title: "Cancelado", description: "Ação cancelada. Digite exatamente 'APAGAR TUDO' em maiúsculas.", variant: "default" });
      return;
    }

    setLoadingApagarTudo(true);
    try {
      // Apagar todas as reservas
      const { error: errorReservas } = await (supabase.from("reservations") as any).delete().neq("id", "");
      if (errorReservas) throw new Error("Erro ao apagar reservas: " + errorReservas.message);

      // Apagar todos os contratos
      const { error: errorContratos } = await (supabase.from("contract_requests") as any).delete().neq("id", "");
      if (errorContratos) throw new Error("Erro ao apagar contratos: " + errorContratos.message);

      toast({ title: "SUCCESSO", description: `TODOS os leads, reservas e contratos foram apagados! Total: ${reservas.length} reservas + ${contratos.length} contratos.` });
      onRefresh?.();
    } catch (err: any) {
      toast({ title: "ERRO", description: err.message, variant: "destructive" });
    } finally {
      setLoadingApagarTudo(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    supabase.from("clientes_corp").select("id, razao_social, responsavel_nome, responsavel_email, responsavel_telefone, created_at").then(({ data }) => {
      if (mounted) setCrmClientes(data || []);
    });
    return () => { mounted = false; };
  }, []);

  const clientes = useMemo(() => {
    const map = new Map<string, Cliente>();
    const add = (email: string, patch: Partial<Cliente>) => {
      const key = (email || "").toLowerCase();
      if (!key) return;
      const cur = map.get(key) || {
        email, nome: "", telefone: "", nicho: null,
        total_solicitacoes: 0, total_pago: 0, total_pendente: 0,
        total_valor: 0,
        ambientes: new Set<string>(), ultima_atividade: "",
        etapa: "pendente",
      };
      map.set(key, { ...cur, ...patch, ambientes: new Set([...cur.ambientes, ...(patch.ambientes || [])]) } as Cliente);
    };
    contratos.forEach((c) => {
      const cur = map.get((c.email || "").toLowerCase());
      const paga = c.status === "paga" || c.status === "concluida";
      const pend = c.status === "pendente" || c.status === "aprovada";
      add(c.email, {
        nome: c.nome, telefone: c.telefone, nicho: c.nicho,
        total_solicitacoes: (cur?.total_solicitacoes || 0) + 1,
        total_pago: (cur?.total_pago || 0) + (paga ? Number(c.preco) : 0),
        total_pendente: (cur?.total_pendente || 0) + (pend ? Number(c.preco) : 0),
        total_valor: (cur?.total_valor || 0) + Number(c.valor ?? c.preco ?? 0),
        ambientes: new Set([c.ambiente]) as any,
        ultima_atividade: !cur?.ultima_atividade || c.created_at > cur.ultima_atividade ? c.created_at : cur.ultima_atividade,
        etapa: !cur?.ultima_atividade || c.created_at > cur.ultima_atividade ? etapaDoLead(c.status) : cur.etapa,
      });
    });
    reservas.forEach((r) => {
      const cur = map.get((r.email || "").toLowerCase());
      add(r.email, {
        nome: cur?.nome || r.nome,
        telefone: cur?.telefone || r.telefone,
        total_solicitacoes: (cur?.total_solicitacoes || 0) + 1,
        ambientes: new Set([r.ambiente]) as any,
        ultima_atividade: !cur?.ultima_atividade || r.created_at > cur.ultima_atividade ? r.created_at : cur.ultima_atividade,
        etapa: cur?.etapa || "pendente",
      });
    });
    return Array.from(map.values()).sort((a, b) => (b.ultima_atividade > a.ultima_atividade ? 1 : -1));
  }, [contratos, reservas, crmClientes]);

  const q = search.trim().toLowerCase();
  const filtered = clientes.map((c) => ({ ...c, etapa: leadEtapas[c.email] || c.etapa })).filter((c) =>
    !q || c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.nicho || "").toLowerCase().includes(q)
  );

  async function promoverCliente(cliente: Cliente) {
    const leads = contratos.filter((contrato) => (contrato.email || "").toLowerCase() === cliente.email.toLowerCase());
    const clienteExistente = crmClientes.find((item) =>
      (item.responsavel_email || "").trim().toLowerCase() === cliente.email.toLowerCase()
    );
    if (clienteExistente) {
      navigate(`/admin/clientes-corp/${clienteExistente.id}`);
      return;
    }
    if (!confirm(`Transformar ${cliente.nome} em cliente e liberar a área do cliente?`)) return;
    const lead = leads[0];
    const payload = {
      razao_social: cliente.nome,
      responsavel_nome: cliente.nome,
      responsavel_email: cliente.email,
      responsavel_telefone: cliente.telefone || lead?.telefone || "",
    };
    const query = (supabase.from("clientes_corp") as any).insert(payload);
    const { data: clienteCriado, error } = await query.select("id").single();
    if (error) {
      toast({ title: "Não foi possível converter o lead", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead convertido em cliente" });
    navigate(`/admin/clientes-corp/${clienteCriado.id}`);
  }

  async function moverLead(cliente: Cliente, etapa: string) {
    const leads = contratos.filter((contrato) => (contrato.email || "").toLowerCase() === cliente.email.toLowerCase());
    if (!leads.length) return;
    const etapaAnterior = cliente.etapa;
    setLeadEtapas((current) => ({ ...current, [cliente.email]: etapa }));
    const { error } = await (supabase.from("contract_requests") as any).update({ status: etapa }).in("id", leads.map((lead) => lead.id));
    if (error) {
      setLeadEtapas((current) => ({ ...current, [cliente.email]: etapaAnterior }));
      toast({ title: "Não foi possível mover o lead", description: LEAD_ERROR, variant: "destructive" });
      return;
    }
    toast({ title: `Lead movido para ${FUNIL.find((item) => item.id === etapa)?.label}` });
  }

  async function salvarLead(lead: Cliente, patch: { nome: string; email: string; telefone: string; status: string; preco: number }) {
    const relacionados = contratos.filter((contrato) => (contrato.email || "").toLowerCase() === lead.email.toLowerCase());
    const { error } = await (supabase.from("contract_requests") as any).update(patch).in("id", relacionados.map((contrato) => contrato.id));
    if (error) {
      toast({ title: "Não foi possível salvar o lead", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead atualizado" });
    setSelectedLead(null);
    onRefresh?.();
  }

  async function limparHistoricoLead(cliente: Cliente) {
    const emailLower = cliente.email.toLowerCase();
    
    console.log("DEBUG limparHistoricoLead:", { nome: cliente.nome, email: cliente.email, emailLower });
    console.log("DEBUG - Total contratos:", contratos.length, "Total reservas:", reservas.length);
    
    const contratosDoLead = contratos.filter((c) => (c.email || "").toLowerCase() === emailLower);
    const reservasDoLead = reservas.filter((r) => (r.email || "").toLowerCase() === emailLower);
    
    console.log("DEBUG - Contratos do lead:", contratosDoLead.length, "Reservas do lead:", reservasDoLead.length);
    
    if (contratosDoLead.length === 0 && reservasDoLead.length === 0) {
      toast({ title: "Aviso", description: `Lead "${cliente.nome}" (${cliente.email}) não tem contratos ou reservas para limpar.`, variant: "default" });
      return;
    }
    
    if (!confirm(`Tem certeza que deseja LIMPAR TODAS as solicitações (${cliente.total_solicitacoes}) do lead "${cliente.nome}" (${cliente.email})? Esta ação excluirá todos os contratos e reservas associados, mas NÃO excluirá o lead. Esta ação não pode ser desfeita.`)) {
      return;
    }

    // Excluir as reservas do lead (tabela: reservations)
    const reservasParaExcluir = reservas.filter((r) => (r.email || "").toLowerCase() === emailLower);
    if (reservasParaExcluir.length > 0) {
      console.log("DEBUG - Excluindo reservas:", reservasParaExcluir.map(r => r.id));
      const { error: reservasError } = await (supabase.from("reservations") as any)
        .delete()
        .in("id", reservasParaExcluir.map((r) => r.id));
      if (reservasError) {
        console.log("DEBUG - Erro ao excluir reservas:", reservasError);
        toast({ title: "Erro", description: "Não foi possível excluir as reservas: " + reservasError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: `Excluídas ${reservasParaExcluir.length} reserva(s) do lead.` });
    }

    // Excluir os contratos do lead (tabela: contract_requests)
    const contratosParaExcluir = contratos.filter((c) => (c.email || "").toLowerCase() === emailLower);
    if (contratosParaExcluir.length > 0) {
      console.log("DEBUG - Excluindo contratos:", contratosParaExcluir.map(c => c.id));
      const { error: contratosError } = await (supabase.from("contract_requests") as any)
        .delete()
        .in("id", contratosParaExcluir.map((c) => c.id));
      if (contratosError) {
        console.log("DEBUG - Erro ao excluir contratos:", contratosError);
        toast({ title: "Erro", description: "Não foi possível excluir os contratos: " + contratosError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: `Excluídos ${contratosParaExcluir.length} contrato(s) do lead.` });
    }

    toast({ title: "Histórico limpo", description: `Todas as ${cliente.total_solicitacoes} solicitações do lead foram removidas.` });
    onRefresh?.();
  }

  async function excluirLead(cliente: Cliente) {
    const emailLower = cliente.email.toLowerCase();
    
    console.log("DEBUG excluirLead:", { nome: cliente.nome, email: cliente.email, emailLower });
    
    // Debug: verificar emails relacionados
    const contratosDoLead = contratos.filter((c) => (c.email || "").toLowerCase() === emailLower);
    const reservasDoLead = reservas.filter((r) => (r.email || "").toLowerCase() === emailLower);
    
    console.log("DEBUG - Contratos do lead:", contratosDoLead.length, "Reservas do lead:", reservasDoLead.length);
    
    if (contratosDoLead.length === 0 && reservasDoLead.length === 0) {
      // Se não há nada para excluir, apenas remove o lead
      if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente o lead "${cliente.nome}" (${cliente.email})? Não há contratos ou reservas associados.`)) {
        return;
      }
      toast({ title: "Lead excluído com sucesso" });
      onRefresh?.();
      return;
    }
    
    if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente o lead "${cliente.nome}" (${cliente.email})? Esta ação não pode ser desfeita. Todos os contratos e reservas associados também serão excluídos.`)) {
      return;
    }

    // Excluir as reservas do lead (tabela: reservations)
    const reservasParaExcluir = reservas.filter((r) => (r.email || "").toLowerCase() === emailLower);
    if (reservasParaExcluir.length > 0) {
      console.log("DEBUG - Excluindo reservas:", reservasParaExcluir.map(r => r.id));
      const { error: reservasError } = await (supabase.from("reservations") as any)
        .delete()
        .in("id", reservasParaExcluir.map((r) => r.id));
      if (reservasError) {
        console.log("DEBUG - Erro ao excluir reservas:", reservasError);
        toast({ title: "Erro", description: "Não foi possível excluir as reservas: " + reservasError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: `Excluídas ${reservasParaExcluir.length} reserva(s) do lead.` });
    }

    // Excluir os contratos do lead (tabela: contract_requests)
    const contratosParaExcluir = contratos.filter((c) => (c.email || "").toLowerCase() === emailLower);
    if (contratosParaExcluir.length > 0) {
      console.log("DEBUG - Excluindo contratos:", contratosParaExcluir.map(c => c.id));
      const { error: contratosError } = await (supabase.from("contract_requests") as any)
        .delete()
        .in("id", contratosParaExcluir.map((c) => c.id));
      if (contratosError) {
        console.log("DEBUG - Erro ao excluir contratos:", contratosError);
        toast({ title: "Erro", description: "Não foi possível excluir os contratos: " + contratosError.message, variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: `Excluídos ${contratosParaExcluir.length} contrato(s) do lead.` });
    }

    toast({ title: "Lead excluído com sucesso" });
    onRefresh?.();
  }

  async function finalizarArraste(event: DragEndEvent) {
    const email = String(event.active.id).replace("lead:", "");
    const etapa = event.over?.id ? String(event.over.id) : null;
    setDraggedLead(null);
    const lead = filtered.find((item) => item.email === email);
    if (!lead || !etapa || lead.etapa === etapa) return;
    await moverLead(lead, etapa);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email ou nicho…" className="pl-9" />
        </div>
        <Badge variant="outline" className="font-heading font-bold">{filtered.length} leads</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <GripVertical className="h-4 w-4 text-brand-orange" /> Arraste um card para outra coluna do funil.
      </div>
      {contratos.length > 0 || reservas.length > 0 ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={apagarTudo}
          disabled={loadingApagarTudo}
          className="mb-4 bg-red-600 hover:bg-red-700 text-white"
        >
          {loadingApagarTudo ? "Apagando..." : `APAGAR TUDO (${reservas.length} reservas + ${contratos.length} contratos)`}
        </Button>
      ) : null}

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum lead encontrado.</Card>
      ) : (
        <DndContext sensors={sensors} onDragStart={({ active }) => setDraggedLead(String(active.id).replace("lead:", ""))} onDragCancel={() => setDraggedLead(null)} onDragEnd={finalizarArraste}>
        <div className="flex min-w-0 gap-4 overflow-x-scroll pb-5 [scrollbar-color:hsl(var(--brand-orange))_hsl(var(--muted))] [scrollbar-width:auto]">
          {FUNIL.map((coluna) => {
            const ColumnIcon = coluna.icon;
            const leadsDaColuna = filtered.filter((lead) => lead.etapa === coluna.id);
            return <FunilColumn
              key={coluna.id}
              id={coluna.id}
              className={`w-[310px] min-w-[310px] shrink-0 rounded-2xl border-2 p-3 transition-colors ${coluna.color} ${draggedLead ? "ring-1 ring-brand-orange/20" : ""}`}>
              <div className="mb-3 flex items-center justify-between border-b border-current/10 pb-3">
                <div className="flex items-center gap-2"><ColumnIcon className="h-4 w-4 text-brand-blue-dark" /><div><h2 className="font-heading text-sm font-black text-brand-blue-dark">{coluna.label}</h2><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{coluna.help}</p></div></div>
                <div className="text-right"><Badge variant="secondary">{leadsDaColuna.length}</Badge><p className="mt-1 text-[10px] font-bold text-emerald-700">{fmtBRL(leadsDaColuna.reduce((sum, lead) => sum + lead.total_valor, 0))}</p></div>
              </div>
              <div className="min-h-[180px] space-y-3">
              {leadsDaColuna.map((c) => {
            const isWoba = c.email.toLowerCase().includes("woba") || c.nome.toLowerCase().includes("woba");
            const color = getClientColor({ name: c.nome, email: c.email, isWoba, overrides });
            return (
              <LeadDragCard
                key={c.email}
                id={c.email}
                className={draggedLead === c.email ? "opacity-50" : ""}>
              <Card onClick={() => setSelectedLead(c)} className="group relative w-full min-w-0 cursor-pointer overflow-hidden border-l-4 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: color }}>
                <div className="flex min-w-0 items-start gap-2.5">
                    <EventAvatar name={c.nome || c.email} isWoba={isWoba} color={color} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-heading text-sm font-black text-brand-blue-dark">{c.nome || c.email}</p>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-orange" />
                          {c.total_solicitacoes > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log("CLICOU LIMPAR HISTORICO:", c.nome, c.email); limparHistoricoLead(c); }} title="Limpar histórico (excluir todas as solicitações)">
                              <Archive className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log("CLICOU EXCLUIR LEAD:", c.nome, c.email); excluirLead(c); }} title="Excluir lead">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.email}</p>
                      <div className="mt-2 flex min-w-0 items-center gap-1 overflow-hidden">
                        {isWoba && <Badge className="shrink-0 bg-pink-600 px-1.5 py-0 text-[10px] text-white">Woba</Badge>}
                        {c.nicho && <Badge variant="secondary" className="max-w-[110px] shrink-0 truncate px-1.5 py-0 text-[10px]">{c.nicho}</Badge>}
                        {Array.from(c.ambientes).slice(0, 2).map((a) => (
                          <Badge key={a} variant="outline" className="max-w-[110px] shrink-0 truncate px-1.5 py-0 text-[10px]">{AMBIENTE_LABEL[a] || a}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                <div className="mt-3 flex min-w-0 items-end justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <GripVertical className="h-3.5 w-3.5" /> {c.total_solicitacoes} {c.total_solicitacoes === 1 ? "solicitação" : "solicitações"}
                  </div>
                </div>
              </Card>
              </LeadDragCard>
            );
              })}
              {leadsDaColuna.length === 0 && <div className="rounded-xl border border-dashed border-current/20 p-6 text-center text-xs text-muted-foreground">Nenhum lead nesta etapa</div>}
              </div>
            </FunilColumn>;
          })}
        </div>
        </DndContext>
      )}
      <LeadDetailsDialog
        lead={selectedLead}
        contracts={contratos}
        onClose={() => setSelectedLead(null)}
        onSave={salvarLead}
        onMove={moverLead}
        onConvert={promoverCliente}
      />
    </div>
  );
}

function FunilColumn({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <section ref={setNodeRef} className={`${className} ${isOver ? "ring-2 ring-brand-orange shadow-lg" : ""}`}>{children}</section>;
}

function LeadDragCard({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `lead:${id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${className} ${isDragging ? "z-10 opacity-50" : ""}`}>{children}</div>;
}

function LeadDetailsDialog({ lead, contracts, onClose, onSave, onMove, onConvert }: { lead: Cliente | null; contracts: any[]; onClose: () => void; onSave: (lead: Cliente, patch: { nome: string; email: string; telefone: string; status: string; preco: number }) => Promise<void>; onMove: (lead: Cliente, etapa: string) => Promise<void>; onConvert: (lead: Cliente) => Promise<void> }) {
  const [nome, setNome] = useState(lead?.nome || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [telefone, setTelefone] = useState(lead?.telefone || "");
  const [status, setStatus] = useState(lead?.etapa || "pendente");
  const [moving, setMoving] = useState(false);
  const [preco, setPreco] = useState(String(lead?.total_valor || 0));

  useEffect(() => {
    setNome(lead?.nome || ""); setEmail(lead?.email || ""); setTelefone(lead?.telefone || "");
    setStatus(lead?.etapa || "pendente"); setPreco(String(lead?.total_valor || 0)); setMoving(false);
  }, [lead]);

  if (!lead) return null;
  const related = contracts.filter((contract) => (contract.email || "").toLowerCase() === lead.email.toLowerCase());
  const latest = related[0];
  const etapaLabel = FUNIL.find((item) => item.id === lead.etapa)?.label || lead.etapa;

  return <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
      <div className="h-2 bg-brand-orange" />
      <div className="p-6">
        <DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl text-brand-blue-dark"><EventAvatar name={lead.nome || lead.email} size={44} /><span>{lead.nome || lead.email}</span></DialogTitle></DialogHeader>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <div><p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Informações do lead</p><div className="grid gap-3 md:grid-cols-2"><FieldInput label="Nome / empresa" value={nome} onChange={setNome} /><FieldInput label="E-mail" value={email} onChange={setEmail} type="email" /><FieldInput label="Telefone" value={telefone} onChange={setTelefone} /></div></div>
            <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4"><div className="flex items-center justify-between gap-3"><div><Label className="text-xs font-black uppercase tracking-widest text-brand-blue-dark">Mover para coluna</Label><p className="mt-1 text-xs text-muted-foreground">A alteração é aplicada imediatamente, como no arraste do card.</p></div>{moving && <span className="text-xs font-bold text-brand-orange">Salvando...</span>}</div><Select value={status} onValueChange={async (value) => { setStatus(value); setMoving(true); await onMove(lead, value); setMoving(false); }} disabled={moving}><SelectTrigger className="mt-3 bg-white"><SelectValue /></SelectTrigger><SelectContent>{FUNIL.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Valor do negócio</Label><Input className="mt-1" type="number" min="0" step="0.01" value={preco} onChange={(event) => setPreco(event.target.value)} /></div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-bold text-brand-blue-dark">Contexto</p><p className="mt-1">{related.length} solicitação(ões) registrada(s) · última atividade {lead.ultima_atividade ? new Date(lead.ultima_atividade).toLocaleDateString("pt-BR") : "sem data"}.</p>{latest?.observacoes && <p className="mt-2 italic">“{latest.observacoes}”</p>}</div>
          </div>
          <aside className="rounded-2xl bg-brand-blue-dark p-5 text-white"><p className="text-xs font-black uppercase tracking-widest text-brand-orange">Resumo</p><p className="mt-3 text-3xl font-black">{fmtBRL(Number(preco) || 0)}</p><p className="mt-1 text-sm text-white/65">valor do negócio</p><div className="mt-6 space-y-3 border-t border-white/15 pt-4 text-sm"><p><span className="text-white/55">Etapa</span><br /><b>{etapaLabel}</b></p><p><span className="text-white/55">Ambientes</span><br /><b>{Array.from(lead.ambientes).map((item) => AMBIENTE_LABEL[item] || item).join(", ") || "Não informado"}</b></p></div></aside>
        </div>
        <DialogFooter className="mt-6 flex-wrap gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Fechar</Button><Button variant="outline" asChild><a href={`mailto:${email}`}><Mail className="mr-2 h-4 w-4" />Enviar e-mail</a></Button>{!lead.email.toLowerCase().includes("woba") && <Button variant="outline" onClick={() => onConvert(lead)}><UserRoundCheck className="mr-2 h-4 w-4" />Converter em cliente</Button>}<Button className="bg-brand-orange text-white" onClick={() => onSave(lead, { nome, email, telefone, status, preco: Number(preco) || 0 })}><CheckCircle2 className="mr-2 h-4 w-4" />Salvar alterações</Button></DialogFooter>
      </div>
    </DialogContent>
  </Dialog>;
}

function FieldInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
