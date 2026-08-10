import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LogOut, Loader2, RefreshCw, LayoutDashboard, Calendar, Users, Briefcase, DollarSign, BarChart3, Building2, FileText, BookOpen, Trash2, CalendarCheck, ClipboardList, Save, Settings } from "lucide-react";
import AdminCalendar from "@/components/admin/AdminCalendar";
import AdminClientes from "@/components/admin/AdminClientes";
import AdminFinanceiro from "@/components/admin/AdminFinanceiro";
import AdminERP from "@/components/admin/AdminERP";
import AdminWobaRepasses from "@/components/admin/AdminWobaRepasses";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminArtigos from "@/components/admin/AdminArtigos";
import AdminServicos from "@/components/admin/AdminServicos";
import AdminUnidades from "@/components/admin/AdminUnidades";
import AdminPaginas from "@/components/admin/AdminPaginas";
import AdminClientesCorp from "@/components/admin/AdminClientesCorp";
import AdminFuncionarios from "@/components/admin/AdminFuncionarios";
import AdminVisitantes from "@/components/admin/AdminVisitantes";
import AdminLocacaoFixa from "@/components/admin/AdminLocacaoFixa";
import AdminPlanosHoras from "@/components/admin/AdminPlanosHoras";
import AdminSettings from "@/components/admin/AdminSettings";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { linkCobrancaWhatsApp, linkWhatsAppWeb, calcularValorReserva, descricaoReserva, descricaoContrato, fmtBRL as fmtBRLCob } from "@/lib/cobranca";



type Reserva = {
  id: string; nome: string; email: string; telefone: string;
  ambiente: string; tipo: string; data: string;
  hora_inicio: string; hora_fim: string; status: string;
  observacoes: string | null; created_at: string; origem?: string;
};

type Contrato = {
  id: string; user_id: string; nome: string; email: string; telefone: string;
  ambiente: string; plano_tipo: string; preco: number;
  dias_selecionados: string[]; data_inicio: string | null;
  status: string; payment_link: string | null; pix_codigo: string | null;
  admin_notes: string | null; observacoes: string | null; created_at: string; origem?: string;
};

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Por Hora", diaria: "Diária", pacote: "Pacote 10", mensal: "Mensal",
};
const RES_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500", confirmada: "bg-blue-500",
  realizada: "bg-green-500", cancelada: "bg-red-500",
};
const CONTRATO_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500", aprovada: "bg-blue-500",
  paga: "bg-green-500", concluida: "bg-emerald-700", cancelada: "bg-red-500",
};

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");


  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth-admin"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles || []).some((r: any) => r.role === "admin");
      
      if (!admin) {
        await supabase.auth.signOut();
        navigate("/auth-admin");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchReservas(), fetchContratos()]);
      setLoading(false);
    })();
  }, [navigate]);

  async function fetchReservas() {
    const { data, error } = await supabase.from("reservations").select("*").order("data", { ascending: false }).order("hora_inicio");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setReservas(data as Reserva[]);
  }
  async function fetchContratos() {
    const { data, error } = await supabase.from("contract_requests").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setContratos((data || []) as any);
  }

  async function syncGoogle(type: "reserva" | "contrato", id: string, silent = false) {
    const { data, error } = await supabase.functions.invoke("sync-google-calendar", { body: { action: "upsert", type, id } });
    if (error || data?.error) {
      if (!silent) toast({ title: "Erro no Google Agenda", description: (error?.message || data?.error) as string, variant: "destructive" });
      return false;
    }
    if (!silent) toast({ title: "Sincronizado com Google Agenda" });
    return true;
  }

  async function syncAll() {
    toast({ title: "Sincronizando…", description: "Enviando eventos ao Google Agenda" });
    const { data, error } = await supabase.functions.invoke("sync-google-calendar", { body: { action: "sync_all" } });
    if (error || data?.error) {
      toast({ title: "Erro", description: (error?.message || data?.error) as string, variant: "destructive" });
    } else {
      const results = data?.results || [];
      const ok = results.filter((r: any) => !r.error).length;
      toast({ title: `Google Agenda: ${ok}/${results.length} eventos sincronizados` });
      fetchReservas(); fetchContratos();
    }
  }

  async function updateReserva(id: string, status: string) {
    // Update direto via RLS (admin tem policy de UPDATE) — evita dependência da edge function.
    const { error } = await (supabase.from("reservations") as any).update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    // Se cancelou, remove o evento no Google Agenda.
    if (status === "cancelada") {
      const r = reservas.find((x) => x.id === id) as any;
      const gId = r?.google_event_id;
      const cid = r?.google_calendar_id;
      if (gId) {
        const { error: gErr } = await supabase.functions.invoke("sync-google-calendar", { body: { action: "delete_event", eventId: gId, calendarId: cid } });
        if (gErr) toast({ title: "Aviso: evento pode continuar no Google Agenda", description: gErr.message, variant: "destructive" });
        else await (supabase.from("reservations") as any).update({ google_event_id: null }).eq("id", id);
      }
    } else {
      await syncGoogle("reserva", id, true);
    }
    fetchReservas();
  }

  async function saveContrato(c: Contrato, patch: Record<string, any>) {
    const { error } = await (supabase.from("contract_requests") as any).update(patch).eq("id", c.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Solicitação atualizada" });
      await syncGoogle("contrato", c.id, true);
      fetchContratos();
    }
  }

  async function setOrigem(type: "reserva" | "contrato", id: string, origem: string) {
    const table = type === "reserva" ? "reservations" : "contract_requests";
    const { error } = await (supabase.from(table as any) as any).update({ origem }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Origem: ${origem}` });
      type === "reserva" ? fetchReservas() : fetchContratos();
    }
  }

  async function deleteReserva(r: Reserva) {
    if (!confirm(`Excluir a reserva de ${r.nome} em ${new Date(r.data+"T00:00").toLocaleDateString("pt-BR")} ${r.hora_inicio.slice(0,5)}? Esta ação não pode ser desfeita.`)) return;
    const gId = (r as any).google_event_id;
    const cid = (r as any).google_calendar_id;
    if (gId) {
      const { error: gErr } = await supabase.functions.invoke("sync-google-calendar", { body: { action: "delete_event", eventId: gId, calendarId: cid } });
      if (gErr) {
        toast({ title: "Não foi possível remover no Google Agenda", description: gErr.message + " — reserva não excluída para evitar inconsistência.", variant: "destructive" });
        return;
      }
    }
    const { error } = await (supabase.from("reservations") as any).delete().eq("id", r.id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else { toast({ title: "Reserva excluída (Google Agenda também)" }); fetchReservas(); }
  }

  async function deleteContrato(c: Contrato) {
    if (!confirm(`Excluir a solicitação de ${c.nome}? Esta ação não pode ser desfeita.`)) return;
    const gId = (c as any).google_event_id;
    const cid = (c as any).google_calendar_id;
    if (gId) {
      const { error: gErr } = await supabase.functions.invoke("sync-google-calendar", { body: { action: "delete_event", eventId: gId, calendarId: cid } });
      if (gErr) {
        toast({ title: "Não foi possível remover no Google Agenda", description: gErr.message + " — solicitação não excluída.", variant: "destructive" });
        return;
      }
    }
    const { error } = await (supabase.from("contract_requests") as any).delete().eq("id", c.id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else { toast({ title: "Solicitação excluída (Google Agenda também)" }); fetchContratos(); }
  }

  async function logout() { await supabase.auth.signOut(); navigate("/auth"); }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="font-heading font-bold text-xl mb-2">Acesso negado</h2>
          <p className="text-sm text-muted-foreground mb-4">Sua conta não tem permissão de administrador.</p>
          <Button onClick={logout} variant="outline">Sair</Button>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
    { title: "Calendários", icon: Calendar, id: "calendario" },
    { title: "Contratações", icon: Briefcase, id: "contratos" },
    { title: "Reservas", icon: ClipboardList, id: "reservas" },
    { title: "CRM Clientes Corp", icon: Users, id: "clientes_corp" },
    { title: "Funcionários", icon: Users, id: "funcionarios" },
    { title: "Visitantes", icon: Users, id: "visitantes" },
    { title: "Locação Fixa", icon: Briefcase, id: "locacao_fixa" },
    { title: "CRM Leads", icon: Users, id: "clientes" },
    { title: "Planos Horas", icon: ClipboardList, id: "planos_horas" },
    { title: "Financeiro", icon: DollarSign, id: "financeiro" },
    { title: "ERP Ocupação", icon: BarChart3, id: "erp" },
    { title: "Repasses Woba", icon: Building2, id: "woba" },
    { title: "Artigos (Blog)", icon: BookOpen, id: "artigos" },
    { title: "Serviços", icon: FileText, id: "servicos" },
    { title: "Unidades", icon: Building2, id: "unidades" },
    { title: "Páginas", icon: FileText, id: "paginas" },
    { title: "Configurações", icon: Settings, id: "configuracoes" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f0f0f1]">
        <Sidebar className="border-r border-brand-blue-dark/10 bg-[#2c3338] text-[#eee]">
          <SidebarContent className="bg-[#2c3338]">
            <SidebarGroup>
              <SidebarGroupLabel className="text-white/40 px-4 py-4 font-black uppercase text-[10px] tracking-widest">
                Admin CoWorking
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-brand-orange hover:text-white ${
                          activeTab === item.id ? "bg-brand-orange text-white" : "text-[#eee] hover:bg-white/10"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <div className="mt-8 pt-4 border-t border-white/10">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sair do Painel</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </div>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <h2 className="font-heading font-black text-brand-blue-dark">
                {menuItems.find(i => i.id === activeTab)?.title}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={syncAll} className="h-8 border-brand-blue-dark/20 text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white">
                <CalendarCheck className="w-4 h-4 mr-2" /> Sincronizar Google
              </Button>
              <Button size="sm" variant="outline" onClick={() => { fetchReservas(); fetchContratos(); }} className="h-8 w-8 p-0">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <div className="h-8 w-px bg-border mx-1" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white font-black text-xs">
                  A
                </div>
                <span className="text-sm font-bold text-muted-foreground hidden sm:inline">Admin</span>
              </div>
            </div>
          </header>

          <main className="p-8">
            {activeTab === "dashboard" && <AdminDashboard reservas={reservas} contratos={contratos} />}
            {activeTab === "calendario" && <AdminCalendar reservas={reservas} contratos={contratos} onDeleteReserva={deleteReserva} onDeleteContrato={deleteContrato} onCreated={fetchReservas} />}
            {activeTab === "contratos" && (
              <div className="space-y-3">
                {contratos.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma solicitação ainda.</Card>}
                {contratos.map((c) => <ContratoCard key={c.id} c={c} onSave={saveContrato} onDelete={deleteContrato} />)}
              </div>
            )}
            {activeTab === "reservas" && (
              <div className="space-y-3">
                {reservas.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma reserva encontrada.</Card>}
                {reservas.map((r) => (
                  <Card key={r.id} className="p-4 border-none shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={`${RES_COLORS[r.status]} text-white border-none`}>{r.status}</Badge>
                          <Badge variant="outline" className="border-brand-blue-dark/20 text-brand-blue-dark">{AMBIENTE_LABEL[r.ambiente]}</Badge>
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">{r.tipo === "hora" ? "Hora" : "Diária"}</Badge>
                          {r.origem === "woba" && <Badge className="bg-pink-500 text-white border-none">Woba</Badge>}
                        </div>
                        <p className="font-heading font-black text-brand-blue-dark text-lg">{r.nome}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {new Date(r.data + "T00:00").toLocaleDateString("pt-BR")} · {r.hora_inicio.slice(0,5)} - {r.hora_fim.slice(0,5)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{r.email} · {r.telefone}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select value={r.status} onValueChange={(v) => updateReserva(r.id, v)}>
                          <SelectTrigger className="w-40 border-brand-blue-dark/10 h-9 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="confirmada">Confirmada</SelectItem>
                            <SelectItem value="realizada">Realizada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-brand-blue-dark" onClick={() => syncGoogle("reserva", r.id)} title="Sincronizar Google">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteReserva(r)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {activeTab === "clientes_corp" && <AdminClientesCorp />}
            {activeTab === "funcionarios" && <AdminFuncionarios />}
            {activeTab === "visitantes" && <AdminVisitantes />}
            {activeTab === "locacao_fixa" && <AdminLocacaoFixa contratos={contratos} />}
            {activeTab === "clientes" && <AdminClientes reservas={reservas} contratos={contratos} />}
            {activeTab === "planos_horas" && <AdminPlanosHoras />}
            {activeTab === "financeiro" && <AdminFinanceiro contratos={contratos} />}
            {activeTab === "erp" && <AdminERP reservas={reservas} contratos={contratos} />}
            {activeTab === "woba" && <AdminWobaRepasses reservas={reservas} contratos={contratos} />}
            {activeTab === "artigos" && <AdminArtigos />}
            {activeTab === "servicos" && <AdminServicos />}
            {activeTab === "unidades" && <AdminUnidades />}
            {activeTab === "paginas" && <AdminPaginas />}
            {activeTab === "configuracoes" && <AdminSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}



function ContratoCard({ c, onSave, onDelete }: { c: Contrato; onSave: (c: Contrato, patch: Record<string, any>) => void; onDelete: (c: Contrato) => void }) {
  const [status, setStatus] = useState(c.status);
  const [link, setLink] = useState(c.payment_link || "");
  const [pix, setPix] = useState(c.pix_codigo || "");
  const [notes, setNotes] = useState(c.admin_notes || "");
  const dias = c.dias_selecionados || [];

  const waMsg = encodeURIComponent(
    `Olá ${c.nome}! Sobre sua solicitação de ${PLANO_LABEL[c.plano_tipo]} — ${AMBIENTE_LABEL[c.ambiente]} (${fmtBRL(Number(c.preco))}), acesse seu painel: ${window.location.origin}/painel`
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge className={`${CONTRATO_COLORS[c.status]} text-white`}>{c.status}</Badge>
        <Badge variant="outline">{AMBIENTE_LABEL[c.ambiente]}</Badge>
        <Badge variant="secondary">{PLANO_LABEL[c.plano_tipo]}</Badge>
        {c.origem === "woba" && <Badge className="bg-blue-600 text-white">Woba</Badge>}
        <span className="ml-auto font-heading font-black text-xl">{fmtBRL(Number(c.preco))}</span>
      </div>
      <p className="font-heading font-bold">{c.nome}</p>
      <p className="text-xs text-muted-foreground">{c.email} · {c.telefone}</p>
      {c.data_inicio && <p className="text-sm mt-1"><span className="text-muted-foreground">Início: </span>{new Date(c.data_inicio + "T00:00").toLocaleDateString("pt-BR")}</p>}
      {dias.length > 0 && (
        <p className="text-sm mt-1"><span className="text-muted-foreground">Dias: </span>{dias.map((d) => new Date(d + "T00:00").toLocaleDateString("pt-BR")).join(" · ")}</p>
      )}
      {c.observacoes && <p className="text-xs italic mt-1">"{c.observacoes}"</p>}

      <div className="grid md:grid-cols-2 gap-3 mt-4 pt-4 border-t">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Link de pagamento (opcional)</label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Chave/Código PIX (opcional)</label>
          <Input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="chave pix ou copia e cola" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Observações internas (visível ao cliente)</label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" onClick={() => onSave(c, { status, payment_link: link || null, pix_codigo: pix || null, admin_notes: notes || null })} className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Save className="w-4 h-4 mr-2" /> Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSave(c, { origem: c.origem === "woba" ? "direto" : "woba" })}>
          {c.origem === "woba" ? "Desmarcar Woba" : "Marcar como Woba"}
        </Button>
        <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe57] text-white" asChild>
          <a target="_blank" rel="noreferrer" href={linkCobrancaWhatsApp({ nome: c.nome, telefone: c.telefone, valor: Number(c.preco || 0), descricao: descricaoContrato(c) })}>
            <DollarSign className="w-4 h-4 mr-1" /> Cobrar {fmtBRLCob(Number(c.preco || 0))}
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a target="_blank" rel="noreferrer" href={linkWhatsAppWeb(c.telefone, decodeURIComponent(waMsg))}>
            WhatsApp cliente
          </a>
        </Button>
        <Button size="sm" variant="outline" className="ml-auto text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(c)}>
          <Trash2 className="w-4 h-4 mr-2" /> Excluir
        </Button>
      </div>
    </Card>
  );
}
