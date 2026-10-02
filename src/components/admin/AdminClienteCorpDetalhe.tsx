import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, User, Building2, CreditCard, Users, Edit2, Mail, Phone, Briefcase, FileText, KeyRound, Eye, EyeOff, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NovoVisitanteDialog from "./NovoVisitanteDialog";
import { DocumentUpload } from "./DocumentUpload";
import ClientAvatarEditor from "./ClientAvatarEditor";
import AdminReservaEditDialog from "./AdminReservaEditDialog";
import type { Database } from "@/integrations/supabase/types";
import { friendlyError } from "@/lib/appErrors";
import { passwordSchema } from "@/lib/validation";

type ClientReservation = Omit<Database["public"]["Tables"]["reservations"]["Row"], "status"> & {
  status: string;
  salas?: { nome: string | null } | null;
  unidades?: { nome: string | null } | null;
};

function exportReservations(reservations: ClientReservation[], clientName: string) {
  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["Data", "Início", "Fim", "Status", "Ambiente", "Tipo", "Unidade", "Sala", "Valor"],
    ...reservations.map((reservation) => [
      reservation.data,
      reservation.hora_inicio?.slice(0, 5),
      reservation.hora_fim?.slice(0, 5),
      reservation.status,
      reservation.ambiente,
      reservation.tipo,
      reservation.unidades?.nome || reservation.unidade_id,
      reservation.salas?.nome || reservation.sala_id,
      reservation.valor,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `reservas-${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminClienteCorpDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cliente, setCliente] = useState<any>({
    razao_social: "",
    responsavel_nome: "",
    responsavel_email: "",
    responsavel_telefone: "",
    responsavel_cpf: "",
    cnpj: "",
    avatar_url: null,
    unidade_id: null,
    plano_id: null,
    documentos: []
  });
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<ClientReservation[]>([]);
  const [reservationStatus, setReservationStatus] = useState("todos");
  const [reservationView, setReservationView] = useState<"upcoming" | "previous">("upcoming");
  const [reservationPage, setReservationPage] = useState(1);
  const [editingReservation, setEditingReservation] = useState<ClientReservation | null>(null);
  const [usoPlano, setUsoPlano] = useState({ horas: 0, reservas: 0, solicitacoes: 0 });
  const [editingFunc, setEditingFunc] = useState<any>(null);
  const [showNovoVisita, setShowNovoVisita] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [confirmAccessPassword, setConfirmAccessPassword] = useState("");
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
  const filteredReservations = useMemo(() => reservas.filter((reserva) => reservationStatus === "todos" || reserva.status === reservationStatus), [reservas, reservationStatus]);
  const upcomingReservations = filteredReservations
    .filter((reserva) => reserva.data > todayKey || (reserva.data === todayKey && reserva.hora_fim?.slice(0, 5) >= currentTime))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora_inicio.localeCompare(b.hora_inicio))
    .slice(0, 30);
  const previousReservations = filteredReservations
    .filter((reserva) => reserva.data < todayKey || (reserva.data === todayKey && reserva.hora_fim?.slice(0, 5) < currentTime))
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora_inicio.localeCompare(a.hora_inicio));
  const reservationPageCount = Math.max(1, Math.ceil(previousReservations.length / 15));
  const currentReservationPage = Math.min(reservationPage, reservationPageCount);
  const visibleReservations = reservationView === "upcoming"
    ? upcomingReservations
    : previousReservations.slice((currentReservationPage - 1) * 15, currentReservationPage * 15);
  const exportableReservations = reservationView === "upcoming" ? upcomingReservations : previousReservations;

  useEffect(() => {
    setReservationPage((page) => Math.min(page, reservationPageCount));
  }, [reservationPageCount]);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [cliRes, uniRes, planRes] = await Promise.all([
        supabase.from('clientes_corp').select('*').eq('id', id).single(),
        supabase.from('unidades').select('id, nome'),
        supabase.from('planos').select('id, nome')
      ]);

      if (cliRes.error) throw cliRes.error;
      setCliente(cliRes.data);
      setUnidades(uniRes.data || []);
      setPlanos(planRes.data || []);

      const [funcRes, visRes, reservaRes, contratoRes] = await Promise.all([
        supabase.from('funcionarios_cliente').select('*').eq('cliente_corp_id', id),
        supabase.from('visitantes').select('*, salas(nome)').eq('cliente_corp_id', id),
        supabase.from('reservations').select('*, salas(nome), unidades(nome)').eq('cliente_corp_id', id).order('data', { ascending: false }).order('hora_inicio'),
        supabase.from('contract_requests').select('id, status').eq('cliente_corp_id', id)
      ]);

      setFuncionarios(funcRes.data || []);
      setVisitantes(visRes.data || []);
      setReservas((reservaRes.data || []) as ClientReservation[]);
      const reservasAtivas = (reservaRes.data || []).filter((r: any) => r.status !== 'cancelada');
      const horas = reservasAtivas.reduce((total: number, r: any) => {
        const [startHour, startMinute] = String(r.hora_inicio || '00:00').slice(0, 5).split(':').map(Number);
        const [endHour, endMinute] = String(r.hora_fim || '00:00').slice(0, 5).split(':').map(Number);
        return total + Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
      }, 0);
      setUsoPlano({ horas, reservas: reservasAtivas.length, solicitacoes: (contratoRes.data || []).length });
    } catch (error: any) {
      toast.error(friendlyError(error, "Não foi possível carregar os dados do cliente."));
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('clientes_corp').update({
      razao_social: cliente.razao_social,
      responsavel_nome: cliente.responsavel_nome,
      responsavel_email: cliente.responsavel_email,
      responsavel_telefone: cliente.responsavel_telefone,
      endereco: cliente.endereco,
      responsavel_cpf: cliente.responsavel_cpf,
      cnpj: cliente.cnpj,
      avatar_url: cliente.avatar_url,
      unidade_id: cliente.unidade_id,
      plano_id: cliente.plano_id,
      documentos: cliente.documentos || []
    }).eq('id', id);

    if (error) toast.error(friendlyError(error, "Não foi possível salvar os dados do cliente."));
    else toast.success("Cliente atualizado");
    setSaving(false);
  }

  async function saveFunc() {
    if (!editingFunc?.nome) return toast.error("Nome é obrigatório");
    
    // Ensure cliente_corp_id is present
    const payload = { ...editingFunc, cliente_corp_id: id };
    
    const { error } = editingFunc.id 
      ? await supabase.from('funcionarios_cliente').update(payload).eq('id', editingFunc.id)
      : await supabase.from('funcionarios_cliente').insert([payload]);
    
    if (error) toast.error(friendlyError(error, "Não foi possível salvar o colaborador."));
    else {
      toast.success("Colaborador salvo");
      setEditingFunc(null);
      fetchData();
    }
  }

  async function saveAccessPassword() {
    const passwordResult = passwordSchema.safeParse(accessPassword);
    if (!passwordResult.success) return toast.error(passwordResult.error.issues[0]?.message || "Informe uma senha válida.");
    if (accessPassword !== confirmAccessPassword) return toast.error("As senhas não conferem.");
    if (!id) return toast.error("Cliente não identificado. Reabra a ficha e tente novamente.");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return toast.error("Sessão administrativa expirada. Entre novamente no painel.");
    setSavingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-client-password", {
        body: { cliente_id: id, password: accessPassword },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const response = data as { ok?: boolean; error?: string } | null;
      if (error) {
        const errorResponse = (error as { context?: Response }).context;
        const errorBody = errorResponse instanceof Response
          ? await errorResponse.clone().json().catch(() => null) as { error?: string } | null
          : null;
        const detail = typeof errorBody?.error === "string" ? errorBody.error : error.message;
        throw new Error(detail || "Não foi possível atualizar a senha. Tente novamente.");
      }
      if (response?.error) throw new Error(response.error);
      if (!response?.ok) throw new Error("A senha não foi confirmada pelo sistema.");
      toast.success("Senha de acesso atualizada e confirmada");
      setAccessPassword("");
      setConfirmAccessPassword("");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha");
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteFunc(fid: string) {
    if (!confirm("Excluir colaborador?")) return;
    const { error } = await supabase.from('funcionarios_cliente').delete().eq('id', fid);
    if (error) toast.error(friendlyError(error, "Não foi possível remover o colaborador."));
    else {
      toast.success("Colaborador removido");
      fetchData();
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <h2 className="text-3xl font-heading font-black text-brand-blue-dark uppercase">{cliente.razao_social}</h2>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:w-[760px]">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="contrato">Unidade & Plano</TabsTrigger>
          <TabsTrigger value="reservas">Reservas ({reservas.length})</TabsTrigger>
          <TabsTrigger value="funcionarios">Colaboradores</TabsTrigger>
          <TabsTrigger value="visitantes">Visitantes</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <Card className="p-6 grid gap-4">
            <ClientAvatarEditor
              clientId={id || cliente.id || ""}
              name={cliente.razao_social || cliente.responsavel_nome || "Cliente"}
              value={cliente.avatar_url}
              onChange={(avatar_url) => setCliente({ ...cliente, avatar_url })}
              size={72}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={cliente.razao_social} onChange={e => setCliente({...cliente, razao_social: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={cliente.cnpj || ''} onChange={e => setCliente({...cliente, cnpj: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={cliente.responsavel_nome || ''} onChange={e => setCliente({...cliente, responsavel_nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CPF do Responsável</Label>
                <Input value={cliente.responsavel_cpf || ''} onChange={e => setCliente({...cliente, responsavel_cpf: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={cliente.responsavel_email || ''} onChange={e => setCliente({...cliente, responsavel_email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Whatsapp</Label>
                <Input value={cliente.responsavel_telefone || ''} onChange={e => setCliente({...cliente, responsavel_telefone: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2 lg:col-span-4">
                <Label>Endereço</Label>
                <Input value={cliente.endereco || ''} onChange={e => setCliente({...cliente, endereco: e.target.value})} placeholder="Rua, número, bairro, cidade e CEP" />
              </div>
            </div>
            
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-brand-orange" />
                <Label className="text-lg font-bold">Documentos do Responsável</Label>
              </div>
              <DocumentUpload 
                value={cliente.documentos || []} 
                onChange={docs => setCliente({...cliente, documentos: docs})} 
              />
            </div>

            <Button className="w-fit mt-4" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
            <div className="border-t pt-4 space-y-3">
              <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Senha de acesso do cliente</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Input type={showAccessPassword ? "text" : "password"} value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder="Nova senha" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowAccessPassword((visible) => !visible)} aria-label={showAccessPassword ? "Ocultar senha" : "Mostrar senha"} title={showAccessPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showAccessPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input type={showAccessPassword ? "text" : "password"} value={confirmAccessPassword} onChange={e => setConfirmAccessPassword(e.target.value)} placeholder="Confirmar nova senha" autoComplete="new-password" />
                <p className="text-xs text-muted-foreground sm:col-span-2">Mínimo de 8 caracteres, com letra, número e símbolo.</p>
                <Button onClick={saveAccessPassword} disabled={savingPassword} className="sm:col-span-2 sm:w-fit">
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Definir senha"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contrato" className="mt-6">
          <Card className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground italic">Selecione a unidade e plano principal contratado por este cliente.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={cliente.unidade_id || ""} 
                  onValueChange={val => setCliente({...cliente, unidade_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a Unidade" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select 
                  value={cliente.plano_id || ""} 
                  onValueChange={val => setCliente({...cliente, plano_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o Plano" /></SelectTrigger>
                  <SelectContent>
                    {planos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>Salvar Vinculação</Button>
            <div className="border-t pt-4">
              <h3 className="font-heading font-bold mb-3">Uso do plano</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Horas reservadas</p><p className="text-2xl font-black">{usoPlano.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Reservas ativas</p><p className="text-2xl font-black">{usoPlano.reservas}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Solicitações</p><p className="text-2xl font-black">{usoPlano.solicitacoes}</p></div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reservas" className="mt-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant={reservationView === "upcoming" ? "default" : "outline"} onClick={() => { setReservationView("upcoming"); setReservationPage(1); }}>
                  Próximas 30
                </Button>
                <Button variant={reservationView === "previous" ? "default" : "outline"} onClick={() => { setReservationView("previous"); setReservationPage(1); }}>
                  Anteriores ({previousReservations.length})
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={reservationStatus} onValueChange={(value) => { setReservationStatus(value); setReservationPage(1); }}>
                  <SelectTrigger className="w-40" aria-label="Filtrar reservas por status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => exportReservations(exportableReservations, cliente.razao_social || "cliente")} disabled={!exportableReservations.length}>
                  <Download className="mr-2 h-4 w-4" /> Exportar planilha
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              {visibleReservations.map((reserva) => (
                <div key={reserva.id} className="grid gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                    <div>
                      <p className="font-semibold">{new Date(`${reserva.data}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">{reserva.hora_inicio?.slice(0, 5)}–{reserva.hora_fim?.slice(0, 5)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{reserva.unidades?.nome || "Unidade não definida"} · {reserva.salas?.nome || "Sala não definida"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{reserva.ambiente} · {reserva.tipo}</p>
                    </div>
                    <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${reserva.status === "cancelada" ? "bg-red-100 text-red-700" : reserva.status === "confirmada" ? "bg-blue-100 text-blue-700" : reserva.status === "realizada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                      {reserva.status}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar reserva" aria-label={`Editar reserva de ${reserva.data}`} onClick={() => setEditingReservation(reserva)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {visibleReservations.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {reservas.length === 0
                    ? "Não há reservas vinculadas por ID a esta empresa. Reservas antigas sem vínculo não são associadas automaticamente."
                    : reservationView === "upcoming" ? "Nenhuma reserva futura para este filtro." : "Nenhuma reserva anterior para este filtro."}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>{reservationView === "upcoming" ? `${upcomingReservations.length} próximas reservas exibidas` : `${previousReservations.length} reservas anteriores`}</p>
              {reservationView === "previous" && (
                <div className="flex items-center gap-2">
                  <span>Página {currentReservationPage} de {reservationPageCount}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Reservas anteriores" disabled={currentReservationPage <= 1} onClick={() => setReservationPage(currentReservationPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Mais reservas anteriores" disabled={currentReservationPage >= reservationPageCount} onClick={() => setReservationPage(currentReservationPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="funcionarios" className="mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Colaboradores Autorizados</h3>
              <Button size="sm" onClick={() => setEditingFunc({ nome: "", cargo: "", telefone: "", cliente_corp_id: id })}><Plus className="w-4 h-4 mr-2" /> Novo Colaborador</Button>
            </div>
            <div className="grid gap-2">
              {funcionarios.map(f => (
                <div key={f.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{f.cargo} · {f.telefone || f.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingFunc(f)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFunc(f.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {funcionarios.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum colaborador cadastrado.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="visitantes" className="mt-6">
          <Card className="p-6 space-y-4">
             <div className="flex justify-between items-center">
              <h3 className="font-bold">Visitantes</h3>
              <Button size="sm" variant="outline" onClick={() => setShowNovoVisita(true)}><Plus className="w-4 h-4 mr-2" /> Novo Visitante</Button>
            </div>
            <div className="grid gap-2">
              {visitantes.map(v => (
                <div key={v.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{v.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {v.data_hora_prevista
                        ? `${v.salas?.nome ? v.salas.nome + " · " : ""}${new Date(v.data_hora_prevista).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
                        : "Cadastro sem agendamento"}
                    </p>
                  </div>
                </div>
              ))}
              {visitantes.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum visitante registrado.</p>}

            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingFunc} onOpenChange={() => setEditingFunc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFunc?.id ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={editingFunc?.nome || ""} onChange={e => setEditingFunc({...editingFunc, nome: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Cargo</Label>
              <Input value={editingFunc?.cargo || ""} onChange={e => setEditingFunc({...editingFunc, cargo: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Whatsapp</Label>
              <Input value={editingFunc?.telefone || ""} onChange={e => setEditingFunc({...editingFunc, telefone: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFunc(null)}>Cancelar</Button>
            <Button onClick={saveFunc}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoVisitanteDialog 
        open={showNovoVisita} 
        onOpenChange={setShowNovoVisita} 
        onCreated={fetchData}
        clienteCorpId={id}
        initialClienteCorpId={id}
        date={new Date()}
      />
      <AdminReservaEditDialog
        open={!!editingReservation}
        reserva={editingReservation}
        onOpenChange={(open) => !open && setEditingReservation(null)}
        onSaved={(updatedReservation) => {
          setReservas((current) => current.map((reserva) => reserva.id === updatedReservation.id ? { ...reserva, ...updatedReservation } : reserva));
          setEditingReservation(null);
        }}
      />
    </div>
  );
}
