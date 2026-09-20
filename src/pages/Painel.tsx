import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, LogOut, ExternalLink, Copy, Home, ArrowRight, Building2, FileText, LifeBuoy, Calculator, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NovoVisitanteDialog from "@/components/admin/NovoVisitanteDialog";
import MeusDados from "@/components/painel/MeusDados";
import Colaboradores from "@/components/painel/Colaboradores";
import VisitantesCliente from "@/components/painel/VisitantesCliente";
import MeuPlano from "@/components/painel/MeuPlano";
import DocumentosCliente from "@/components/painel/DocumentosCliente";
import SuporteCliente from "@/components/painel/SuporteCliente";
import PainelAgendamento from "@/components/painel/PainelAgendamento";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Espaço de Trabalho",
  sala_privativa: "Sala Privativa",
  sala_reuniao: "Sala de Reunião",
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Por Hora", diaria: "Diária Avulsa", pacote: "Pacote 10 Diárias", mensal: "Plano Mensal",
};
const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-yellow-500", aprovada: "bg-blue-500",
  paga: "bg-green-500", concluida: "bg-emerald-700", cancelada: "bg-red-500",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação", aprovada: "Aprovada — pagar",
  paga: "Pagamento confirmado", concluida: "Concluída", cancelada: "Cancelada",
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

/** Preços oficiais — devem espelhar PricingSection */
const PRICING: Record<string, Record<string, number | null>> = {
  estacao:        { hora: 20, diaria: 65,  pacote: 485,  mensal: 580 },
  sala_privativa: { hora: 40, diaria: 150, pacote: 1000, mensal: 1400 },
  sala_reuniao:   { hora: 90, diaria: 450, pacote: null, mensal: null },
};
const AMBIENTES = ["estacao", "sala_privativa", "sala_reuniao"] as const;
const PLANOS = ["hora", "diaria", "pacote", "mensal"] as const;

export default function Painel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [cliente, setCliente] = useState<any>(null);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [plano, setPlano] = useState<any>(null);
  const [horasCalculadas, setHorasCalculadas] = useState(1);
  const [accessBlocked, setAccessBlocked] = useState<string | null>(null);
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [editingFunc, setEditingFunc] = useState<any>(null);
  const [editingVisitante, setEditingVisitante] = useState<any>(null);
  const [showNovoVisitante, setShowNovoVisitante] = useState(false);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [requestedAmbiente, setRequestedAmbiente] = useState<(typeof AMBIENTES)[number]>("estacao");
  const [requestedPlano, setRequestedPlano] = useState<(typeof PLANOS)[number]>("mensal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth?redirect=/painel"); return; }
      setUser(session.user);
      const { data: clienteData } = await (supabase.from("clientes_corp") as any).select("*, unidades(nome), planos(*), salas(nome)").eq("user_id", session.user.id).maybeSingle();
      if (clienteData && clienteData.status_acesso !== "aprovado") {
        setAccessBlocked(clienteData.status_acesso === "recusado" ? "Seu cadastro foi recusado. Entre em contato com a equipe." : "Seu cadastro está em análise. A equipe liberará o acesso após revisar seus dados.");
        setLoading(false);
        return;
      }
      setCliente(clienteData);
      const [c, r, f, v, p] = await Promise.all([
        supabase.from("contract_requests").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("reservations").select("*").eq("email", session.user.email!).order("data", { ascending: false }),
        clienteData ? supabase.from("funcionarios_cliente").select("*").eq("cliente_corp_id", clienteData.id) : Promise.resolve({ data: [] } as any),
        clienteData ? supabase.from("visitantes").select("*, salas(nome)").eq("cliente_corp_id", clienteData.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] } as any),
        clienteData?.plano_id ? supabase.from("planos").select("*").eq("id", clienteData.plano_id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      if (c.error) toast({ title: "Erro", description: c.error.message, variant: "destructive" });
      else setContratos(c.data || []);
      if (!r.error) setReservas(r.data || []);
      setFuncionarios(f.data || []);
      setVisitantes(v.data || []);
      setPlano(p.data || null);
      setLoading(false);
    })();
  }, [navigate]);



  async function logout() { await supabase.auth.signOut(); navigate("/auth"); }
  function copyPix(code: string) { navigator.clipboard.writeText(code); toast({ title: "Código PIX copiado" }); }

  async function refreshClientRecords() {
    if (!cliente?.id) return;
    const [funcRes, visRes] = await Promise.all([
      supabase.from("funcionarios_cliente").select("*").eq("cliente_corp_id", cliente.id),
      supabase.from("visitantes").select("*, salas(nome)").eq("cliente_corp_id", cliente.id).order("created_at", { ascending: false }),
    ]);
    setFuncionarios(funcRes.data || []);
    setVisitantes(visRes.data || []);
  }

  async function saveCliente() {
    if (!editingCliente?.razao_social?.trim()) {
      toast({ title: "Informe a razão social", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("clientes_corp").update({
      razao_social: editingCliente.razao_social.trim(),
      cnpj: editingCliente.cnpj || null,
      responsavel_nome: editingCliente.responsavel_nome || null,
      responsavel_cpf: editingCliente.responsavel_cpf || null,
      responsavel_email: editingCliente.responsavel_email || null,
      responsavel_telefone: editingCliente.responsavel_telefone || null,
    }).eq("id", cliente.id).select("*, unidades(nome), planos(nome), salas(nome)").single();
    if (error) toast({ title: "Erro ao salvar dados", description: error.message, variant: "destructive" });
    else {
      setCliente(data);
      setEditingCliente(null);
      toast({ title: "Dados atualizados" });
    }
    setSaving(false);
  }

  async function saveFunc() {
    if (!editingFunc?.nome?.trim()) {
      toast({ title: "Informe o nome do colaborador", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: editingFunc.nome.trim(),
      cargo: editingFunc.cargo || null,
      telefone: editingFunc.telefone || null,
      email: editingFunc.email || null,
      cliente_corp_id: cliente.id,
    };
    const query = editingFunc.id
      ? supabase.from("funcionarios_cliente").update(payload).eq("id", editingFunc.id)
      : supabase.from("funcionarios_cliente").insert(payload);
    const { error } = await query;
    if (error) toast({ title: "Erro ao salvar colaborador", description: error.message, variant: "destructive" });
    else {
      setEditingFunc(null);
      await refreshClientRecords();
      toast({ title: "Colaborador salvo" });
    }
    setSaving(false);
  }

  async function deleteFunc(id: string) {
    if (!confirm("Excluir este colaborador?")) return;
    const { error } = await supabase.from("funcionarios_cliente").delete().eq("id", id).eq("cliente_corp_id", cliente.id);
    if (error) toast({ title: "Erro ao excluir colaborador", description: error.message, variant: "destructive" });
    else { await refreshClientRecords(); toast({ title: "Colaborador removido" }); }
  }

  async function saveVisitante() {
    if (!editingVisitante?.nome?.trim()) {
      toast({ title: "Informe o nome do visitante", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("visitantes").update({
      nome: editingVisitante.nome.trim(),
      documento: editingVisitante.documento || null,
      observacoes: editingVisitante.observacoes || null,
    }).eq("id", editingVisitante.id).eq("cliente_corp_id", cliente.id);
    if (error) toast({ title: "Erro ao salvar visitante", description: error.message, variant: "destructive" });
    else {
      setEditingVisitante(null);
      await refreshClientRecords();
      toast({ title: "Visitante atualizado" });
    }
    setSaving(false);
  }

  async function deleteVisitante(id: string) {
    if (!confirm("Excluir este visitante?")) return;
    const { error } = await supabase.from("visitantes").delete().eq("id", id).eq("cliente_corp_id", cliente.id);
    if (error) toast({ title: "Erro ao excluir visitante", description: error.message, variant: "destructive" });
    else { await refreshClientRecords(); toast({ title: "Visitante removido" }); }
  }

  async function requestPlanChange() {
    const preco = PRICING[requestedAmbiente]?.[requestedPlano] ?? null;
    if (preco === null || !user || !cliente) return;
    setSaving(true);
    const { data, error } = await supabase.from("contract_requests").insert({
      user_id: user.id,
      nome: cliente.responsavel_nome || user.user_metadata?.nome || user.email,
      email: cliente.responsavel_email || user.email,
      telefone: cliente.responsavel_telefone || user.user_metadata?.telefone || "",
      nicho: user.user_metadata?.nicho || null,
      ambiente: requestedAmbiente,
      plano_tipo: requestedPlano,
      preco,
      observacoes: `Solicitação de troca de plano. Plano atual: ${plano?.nome || cliente.planos?.nome || "não informado"}.`,
      dias_selecionados: [],
      data_inicio: null,
      status: "pendente",
    }).select().single();
    if (error) {
      toast({ title: "Erro ao solicitar troca", description: error.message, variant: "destructive" });
    } else {
      setContratos((prev) => [data, ...prev]);
      setShowPlanChange(false);
      toast({ title: "Solicitação enviada", description: "A equipe analisará a troca do seu plano." });
    }
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (accessBlocked) return <div className="min-h-screen flex items-center justify-center p-4"><Card className="max-w-md p-8 text-center"><Building2 className="w-10 h-10 mx-auto mb-4 text-secondary" /><h1 className="font-heading font-black text-xl mb-2">Acesso aguardando liberação</h1><p className="text-muted-foreground mb-6">{accessBlocked}</p><Button onClick={logout}>Sair</Button></Card></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-brand-blue-dark text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading font-black text-2xl">Meu Painel</h1>
            <p className="text-xs text-white/60">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/")} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <Home className="w-4 h-4 mr-2" /> Site
            </Button>
            <Button size="sm" variant="outline" onClick={logout} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-[1600px]">
        <Tabs defaultValue="calendario">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="dados">Meus dados</TabsTrigger>
            <TabsTrigger value="colaboradores">Colaboradores ({funcionarios.length})</TabsTrigger>
            <TabsTrigger value="visitantes">Visitantes ({visitantes.length})</TabsTrigger>
            <TabsTrigger value="plano">Meu plano</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="suporte">Suporte</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="lista">Minhas solicitações ({contratos.length})</TabsTrigger>
            <TabsTrigger value="canceladas">
              Canceladas ({contratos.filter((c) => c.status === "cancelada").length + reservas.filter((r) => r.status === "cancelada").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2"><div className="flex items-start justify-between gap-4"><h2 className="font-heading font-black text-xl mb-3">{cliente?.razao_social || "Empresa vinculada"}</h2><Button size="sm" variant="outline" onClick={() => setEditingCliente({ ...cliente })}><Pencil className="w-4 h-4 mr-2" /> Editar informações</Button></div><div className="grid gap-2 text-sm"><p><span className="text-muted-foreground">Responsável:</span> {cliente?.responsavel_nome || "-"}</p><p><span className="text-muted-foreground">E-mail:</span> {cliente?.responsavel_email || user?.email}</p><p><span className="text-muted-foreground">WhatsApp:</span> {cliente?.responsavel_telefone || "-"}</p><p><span className="text-muted-foreground">Unidade:</span> {cliente?.unidades?.nome || "-"}</p><p><span className="text-muted-foreground">Plano:</span> {cliente?.planos?.nome || "-"} · <span className="text-muted-foreground">Sala:</span> {cliente?.salas?.nome || "-"}</p></div></Card>
            </div>
          </TabsContent>

          <TabsContent value="colaboradores"><Card className="p-5"><div className="flex items-center justify-between gap-4 mb-4"><h2 className="font-heading font-black text-xl">Colaboradores autorizados</h2><Button size="sm" onClick={() => setEditingFunc({ nome: "", cargo: "", telefone: "", email: "" })}><Plus className="w-4 h-4 mr-2" /> Adicionar</Button></div>{funcionarios.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{funcionarios.map(f => <div key={f.id} className="border rounded-lg p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{f.nome}</p><p className="text-sm text-muted-foreground">{f.cargo || "Colaborador autorizado"}</p>{f.email && <p className="text-xs text-muted-foreground mt-1">{f.email}</p>}</div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setEditingFunc({ ...f })} aria-label="Editar colaborador"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFunc(f.id)} aria-label="Excluir colaborador"><Trash2 className="w-4 h-4" /></Button></div></div></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>}</Card></TabsContent>

          <TabsContent value="visitantes"><Card className="p-5"><div className="flex items-center justify-between gap-4 mb-4"><h2 className="font-heading font-black text-xl">Visitantes</h2><Button size="sm" onClick={() => setShowNovoVisitante(true)}><Plus className="w-4 h-4 mr-2" /> Adicionar</Button></div>{visitantes.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visitantes.map(v => <div key={v.id} className="border rounded-lg p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{v.nome}</p><p className="text-xs text-muted-foreground">{v.salas?.nome || "Sem sala"}{v.data_hora_prevista ? ` · ${new Date(v.data_hora_prevista).toLocaleString("pt-BR")}` : ""}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setEditingVisitante({ ...v })} aria-label="Editar visitante"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteVisitante(v.id)} aria-label="Excluir visitante"><Trash2 className="w-4 h-4" /></Button></div></div></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum visitante registrado.</p>}</Card></TabsContent>

          <TabsContent value="plano"><Card className="p-5 max-w-2xl"><div className="flex items-center justify-between gap-4 mb-4"><div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-secondary" /><h2 className="font-heading font-black text-xl">Meu plano e calculadora de horas</h2></div><Button size="sm" onClick={() => setShowPlanChange(true)}>Solicitar troca de plano</Button></div><p className="text-sm text-muted-foreground mb-4">{plano?.nome || cliente?.planos?.nome || "Plano não informado"}</p><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-muted p-4"><p className="text-xs text-muted-foreground">Horas contratadas</p><p className="text-3xl font-black">{plano?.quantidade_horas ?? "-"}h</p></div><div className="rounded-lg bg-muted p-4"><p className="text-xs text-muted-foreground">Valor do plano</p><p className="text-3xl font-black">{plano?.preco ? fmtBRL(Number(plano.preco)) : "-"}</p></div></div><div className="mt-5 border-t pt-4"><label className="text-sm font-medium">Quantidade de horas para simular</label><input type="number" min="1" max={plano?.quantidade_horas || 999} value={horasCalculadas} onChange={e => setHorasCalculadas(Math.max(1, Number(e.target.value) || 1))} className="mt-2 w-full rounded-md border bg-background px-3 py-2" /><p className="mt-2 text-sm text-muted-foreground">Estimativa proporcional: {plano?.preco && plano?.quantidade_horas ? fmtBRL(Number(plano.preco) / Number(plano.quantidade_horas) * horasCalculadas) : "cadastre um plano para calcular"}.</p></div></Card></TabsContent>

          <TabsContent value="documentos"><Card className="p-5"><div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-secondary" /><h2 className="font-heading font-black text-xl">Documentos da empresa</h2></div>{cliente?.documentos?.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cliente.documentos.map((url: string, index: number) => <a key={url + index} href={url} target="_blank" rel="noreferrer" className="border rounded-lg overflow-hidden hover:border-secondary"><img src={url} alt={`Documento ${index + 1}`} className="aspect-[3/4] w-full object-cover" /></a>)}</div> : <p className="text-sm text-muted-foreground">Nenhum documento disponibilizado pela equipe.</p>}</Card></TabsContent>

          <TabsContent value="suporte"><Card className="p-5 max-w-2xl"><div className="flex items-center gap-2 mb-3"><LifeBuoy className="w-5 h-5 text-secondary" /><h2 className="font-heading font-black text-xl">Suporte</h2></div><p className="text-sm text-muted-foreground mb-4">Precisa de ajuda com sua unidade, plano ou reserva?</p><Button asChild><a href="mailto:contato@coworking013.com.br?subject=Suporte%20do%20painel">Entrar em contato</a></Button></Card></TabsContent>

          {/* CALENDÁRIO — idêntico ao público com filtros e Gantt */}
          <TabsContent value="calendario">
            <PainelAgendamento
              cliente={cliente}
              user={user}
              onRefresh={async () => {
                const { data, error } = await supabase
                  .from("reservations")
                  .select("*")
                  .eq("email", user?.email)
                  .order("data", { ascending: false });
                if (!error) setReservas(data || []);
              }}
            />
          </TabsContent>


          {/* LISTA */}
          <TabsContent value="lista">
            {contratos.length === 0 && (
              <Card className="p-10 text-center">
                <p className="text-muted-foreground mb-4">Você ainda não tem solicitações.</p>
                <Button onClick={() => navigate("/#planos")} className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Ver planos <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            )}

            <div className="grid gap-4">
              {contratos.map((r) => {
                const dias: string[] = r.dias_selecionados || [];
                return (
                  <Card key={r.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className={`${STATUS_STYLE[r.status]} text-white`}>{STATUS_LABEL[r.status] || r.status}</Badge>
                      <Badge variant="outline">{AMBIENTE_LABEL[r.ambiente]}</Badge>
                      <Badge variant="secondary">{PLANO_LABEL[r.plano_tipo]}</Badge>
                      <span className="ml-auto font-heading font-black text-xl">{fmtBRL(Number(r.preco))}</span>
                    </div>

                    {r.data_inicio && (
                      <p className="text-sm"><span className="text-muted-foreground">Início: </span>{new Date(r.data_inicio + "T00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                    {dias.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Dias reservados: </span>
                        {dias.map((d) => new Date(d + "T00:00").toLocaleDateString("pt-BR")).join(" · ")}
                      </div>
                    )}
                    {r.observacoes && <p className="text-xs italic text-muted-foreground mt-1">"{r.observacoes}"</p>}

                    {(r.status === "aprovada" || r.status === "paga") && (r.payment_link || r.pix_codigo) && (
                      <div className="mt-4 rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-3">
                        <p className="font-heading font-bold text-sm">Fatura de pagamento</p>
                        {r.payment_link && (
                          <Button asChild size="sm" className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90">
                            <a href={r.payment_link} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" /> Abrir link de pagamento
                            </a>
                          </Button>
                        )}
                        {r.pix_codigo && (
                          <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                            <code className="text-xs flex-1 truncate">{r.pix_codigo}</code>
                            <Button size="sm" variant="outline" onClick={() => copyPix(r.pix_codigo)}>
                              <Copy className="w-3 h-3 mr-1" /> Copiar PIX
                            </Button>
                          </div>
                        )}
                        {r.admin_notes && <p className="text-xs text-muted-foreground">{r.admin_notes}</p>}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground mt-3">
                      Solicitado em {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* CANCELADAS */}
          <TabsContent value="canceladas">
            {(() => {
              const cContratos = contratos.filter((c) => c.status === "cancelada");
              const cReservas = reservas.filter((r) => r.status === "cancelada");
              if (cContratos.length === 0 && cReservas.length === 0) {
                return <Card className="p-10 text-center text-muted-foreground">Nenhuma reserva cancelada.</Card>;
              }
              return (
                <div className="grid gap-3">
                  {cReservas.map((r) => (
                    <Card key={r.id} className="p-4 border-red-200 bg-red-50/40">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className="bg-red-500 text-white">Cancelada</Badge>
                        <Badge variant="outline">{AMBIENTE_LABEL[r.ambiente]}</Badge>
                        <span className="ml-auto text-sm text-muted-foreground">
                          {new Date(r.data + "T00:00").toLocaleDateString("pt-BR")} · {r.hora_inicio.slice(0,5)}–{r.hora_fim.slice(0,5)}
                        </span>
                      </div>
                      {r.observacoes && <p className="text-xs italic text-muted-foreground">"{r.observacoes}"</p>}
                    </Card>
                  ))}
                  {cContratos.map((c) => (
                    <Card key={c.id} className="p-4 border-red-200 bg-red-50/40">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className="bg-red-500 text-white">Cancelada</Badge>
                        <Badge variant="outline">{AMBIENTE_LABEL[c.ambiente]}</Badge>
                        <Badge variant="secondary">{PLANO_LABEL[c.plano_tipo]}</Badge>
                        <span className="ml-auto font-heading font-black">{fmtBRL(Number(c.preco))}</span>
                      </div>
                      {c.data_inicio && <p className="text-sm"><span className="text-muted-foreground">Início: </span>{new Date(c.data_inicio + "T00:00").toLocaleDateString("pt-BR")}</p>}
                      {c.observacoes && <p className="text-xs italic text-muted-foreground mt-1">"{c.observacoes}"</p>}
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editingCliente} onOpenChange={(open) => !open && setEditingCliente(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar informações</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2"><Label>Razão social</Label><Input value={editingCliente?.razao_social || ""} onChange={(e) => setEditingCliente({ ...editingCliente, razao_social: e.target.value })} /></div>
              <div className="grid gap-2"><Label>CNPJ</Label><Input value={editingCliente?.cnpj || ""} onChange={(e) => setEditingCliente({ ...editingCliente, cnpj: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Responsável</Label><Input value={editingCliente?.responsavel_nome || ""} onChange={(e) => setEditingCliente({ ...editingCliente, responsavel_nome: e.target.value })} /></div>
              <div className="grid gap-2"><Label>CPF do responsável</Label><Input value={editingCliente?.responsavel_cpf || ""} onChange={(e) => setEditingCliente({ ...editingCliente, responsavel_cpf: e.target.value })} /></div>
              <div className="grid gap-2"><Label>E-mail</Label><Input type="email" value={editingCliente?.responsavel_email || ""} onChange={(e) => setEditingCliente({ ...editingCliente, responsavel_email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>WhatsApp</Label><Input value={editingCliente?.responsavel_telefone || ""} onChange={(e) => setEditingCliente({ ...editingCliente, responsavel_telefone: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditingCliente(null)}>Cancelar</Button><Button onClick={saveCliente} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingFunc} onOpenChange={(open) => !open && setEditingFunc(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingFunc?.id ? "Editar colaborador" : "Adicionar colaborador"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2"><Label>Nome</Label><Input value={editingFunc?.nome || ""} onChange={(e) => setEditingFunc({ ...editingFunc, nome: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Cargo</Label><Input value={editingFunc?.cargo || ""} onChange={(e) => setEditingFunc({ ...editingFunc, cargo: e.target.value })} /></div>
              <div className="grid gap-2"><Label>WhatsApp</Label><Input value={editingFunc?.telefone || ""} onChange={(e) => setEditingFunc({ ...editingFunc, telefone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>E-mail</Label><Input type="email" value={editingFunc?.email || ""} onChange={(e) => setEditingFunc({ ...editingFunc, email: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditingFunc(null)}>Cancelar</Button><Button onClick={saveFunc} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingVisitante} onOpenChange={(open) => !open && setEditingVisitante(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar visitante</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2"><Label>Nome</Label><Input value={editingVisitante?.nome || ""} onChange={(e) => setEditingVisitante({ ...editingVisitante, nome: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Documento</Label><Input value={editingVisitante?.documento || ""} onChange={(e) => setEditingVisitante({ ...editingVisitante, documento: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Observações</Label><Input value={editingVisitante?.observacoes || ""} onChange={(e) => setEditingVisitante({ ...editingVisitante, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditingVisitante(null)}>Cancelar</Button><Button onClick={saveVisitante} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <NovoVisitanteDialog
          open={showNovoVisitante}
          onOpenChange={setShowNovoVisitante}
          clienteCorpId={cliente?.id}
          initialClienteCorpId={cliente?.id}
          date={new Date()}
          onCreated={refreshClientRecords}
        />

        <Dialog open={showPlanChange} onOpenChange={setShowPlanChange}>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar troca de plano</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2"><Label>Ambiente</Label><select value={requestedAmbiente} onChange={(e) => { const ambiente = e.target.value as (typeof AMBIENTES)[number]; setRequestedAmbiente(ambiente); if (PRICING[ambiente]?.[requestedPlano] === null) setRequestedPlano("diaria"); }} className="h-10 rounded-md border bg-background px-3 text-sm">{AMBIENTES.map((ambiente) => <option key={ambiente} value={ambiente}>{AMBIENTE_LABEL[ambiente]}</option>)}</select></div>
              <div className="grid gap-2"><Label>Plano desejado</Label><select value={requestedPlano} onChange={(e) => setRequestedPlano(e.target.value as (typeof PLANOS)[number])} className="h-10 rounded-md border bg-background px-3 text-sm">{PLANOS.map((tipo) => <option key={tipo} value={tipo} disabled={PRICING[requestedAmbiente]?.[tipo] === null}>{PLANO_LABEL[tipo]}{PRICING[requestedAmbiente]?.[tipo] === null ? " (indisponível)" : ` - ${fmtBRL(PRICING[requestedAmbiente][tipo] as number)}`}</option>)}</select></div>
              <p className="text-sm text-muted-foreground">A troca ficará pendente para análise da equipe. O plano atual não será alterado até a aprovação.</p>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowPlanChange(false)}>Cancelar</Button><Button onClick={requestPlanChange} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar solicitação"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

