import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, LockKeyhole, LogIn, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReservaDialog, { CONSULTA_STORAGE_KEY } from "@/components/ReservaDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isBusinessDay } from "@/lib/holidays";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { consultaSchema, type DadosConsulta } from "@/lib/consultaValidation";

type SalaPublica = { id: string; nome: string; unidade_id: string | null; unidadeNome: string };
type UnidadePublica = { id: string; nome: string };
type Ocupacao = { sala_id: string; data: string; hora_inicio: string; hora_fim: string; color_slot: number };
type Selecao = { salaId: string; inicioIndex: number; fimIndex: number };
type Periodo = { id: string; salaId: string; data: string; inicio: string; fim: string };

const UNIDADES_PERMANENTES = new Set([
  "66a610f6-1f6b-4673-903d-80aa57657982",
  "40840fbd-f575-4ff7-9e6d-1e9231985ce6",
]);
const SLOTS = Array.from({ length: 20 }, (_, index) => 8 * 60 + index * 30);
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CORES = ["bg-primary", "bg-secondary", "bg-destructive", "bg-accent", "bg-foreground", "bg-muted-foreground"];
const WHATSAPP = "5513988050358";
const SELECAO_STORAGE_KEY = "coworking013_selecao_agenda";
const MAX_PERIODOS = 20;
const isoDate = (date: Date) => format(date, "yyyy-MM-dd");
const horarioMinutos = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const minutos = (valor: string) => { const [h, m] = valor.slice(0, 5).split(":").map(Number); return h * 60 + m; };

function lerConsulta(): DadosConsulta | null {
  try {
    const valor = consultaSchema.safeParse(JSON.parse(localStorage.getItem(CONSULTA_STORAGE_KEY) || "null"));
    return valor.success ? valor.data : null;
  } catch { return null; }
}

export default function CalendarioPublico() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [dia, setDia] = useState(startOfDay(new Date()));
  const [salas, setSalas] = useState<SalaPublica[]>([]);
  const [unidades, setUnidades] = useState<UnidadePublica[]>([]);
  const [unidadeId, setUnidadeId] = useState("todas");
  const [salaId, setSalaId] = useState("todas");
  const [ocupacoes, setOcupacoes] = useState<Ocupacao[]>([]);
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [dadosConsulta, setDadosConsulta] = useState<DadosConsulta | null>(() => lerConsulta());
  const [consultaAberta, setConsultaAberta] = useState(() => !lerConsulta());
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [dadosEditados, setDadosEditados] = useState<DadosConsulta>(() => lerConsulta() || { nome: "", email: "", whatsapp: "", tipoNegocio: "" });
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const arrastandoRef = useRef(false);
  const selecaoRef = useRef<Selecao | null>(null);

  const atualizarSelecao = (valor: Selecao | null) => { selecaoRef.current = valor; setSelecao(valor); };

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from("salas").select("id, nome, unidade_id, status").in("status", ["disponivel", "ativa"]).order("nome"),
      supabase.from("unidades").select("id, nome").ilike("status", "ativ%").order("nome"),
      supabase.auth.getSession(),
    ]).then(([salasResponse, unidadesResponse, sessaoResponse]) => {
      if (!ativo) return;
      if (salasResponse.error) toast({ title: "Não foi possível carregar as salas", description: salasResponse.error.message, variant: "destructive" });
      const listaUnidades = (unidadesResponse.data || []).filter((unidade) => !UNIDADES_PERMANENTES.has(unidade.id));
      const nomes = new Map(listaUnidades.map((unidade) => [unidade.id, unidade.nome]));
      setUnidades(listaUnidades);
      setSalas((salasResponse.data || []).filter((sala) => Boolean(sala.unidade_id && nomes.has(sala.unidade_id))).map((sala) => ({ id: sala.id, nome: sala.nome, unidade_id: sala.unidade_id, unidadeNome: nomes.get(String(sala.unidade_id)) || "Unidade" })));
      setAutenticado(Boolean(sessaoResponse.data.session));
      setCarregandoSalas(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAutenticado(Boolean(session)));
    return () => { ativo = false; listener.subscription.unsubscribe(); };
  }, []);

  const salasFiltradas = useMemo(() => salas.filter((sala) => unidadeId === "todas" || sala.unidade_id === unidadeId), [salas, unidadeId]);
  useEffect(() => { if (salaId !== "todas" && !salasFiltradas.some((sala) => sala.id === salaId)) setSalaId("todas"); }, [salaId, salasFiltradas]);

  const carregarAgenda = useCallback(async () => {
    setCarregandoAgenda(true);
    const { data, error } = await supabase.rpc("get_public_room_availability", { p_start_date: isoDate(startOfMonth(mes)), p_end_date: isoDate(endOfMonth(mes)), p_sala_id: salaId === "todas" ? undefined : salaId });
    if (error) { toast({ title: "Não foi possível consultar a agenda", description: error.message, variant: "destructive" }); setOcupacoes([]); }
    else setOcupacoes((data || []) as Ocupacao[]);
    setCarregandoAgenda(false);
  }, [mes, salaId]);
  useEffect(() => { void carregarAgenda(); }, [carregarAgenda]);

  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) }), [mes]);
  const ocupacoesDoDia = ocupacoes.filter((item) => item.data === isoDate(dia));
  const diaBloqueado = isBefore(dia, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(dia)}T12:00:00`));
  const salasGantt = salaId === "todas" ? salasFiltradas : salasFiltradas.filter((sala) => sala.id === salaId);
  const ocupacaoNoSlot = (id: string, index: number) => {
    const inicio = SLOTS[index], fim = inicio + 30;
    return ocupacoesDoDia.find((item) => item.sala_id === id && inicio < minutos(item.hora_fim) && fim > minutos(item.hora_inicio));
  };
  const periodoNoSlot = (id: string, index: number) => {
    const inicio = SLOTS[index], fim = inicio + 30;
    return periodos.find((item) => item.salaId === id && item.data === isoDate(dia) && inicio < minutos(item.fim) && fim > minutos(item.inicio));
  };
  const intervaloLivre = (id: string, a: number, b: number) => {
    const inicio = Math.min(a, b), fim = Math.max(a, b);
    return Array.from({ length: fim - inicio + 1 }, (_, offset) => inicio + offset).every((index) => !ocupacaoNoSlot(id, index) && !periodoNoSlot(id, index));
  };
  const slotSelecionado = (id: string, index: number) => Boolean(periodoNoSlot(id, index)) || (selecao?.salaId === id && index >= Math.min(selecao.inicioIndex, selecao.fimIndex) && index <= Math.max(selecao.inicioIndex, selecao.fimIndex));

  const adicionarSelecao = useCallback((atual: Selecao) => {
    const inicio = horarioMinutos(SLOTS[Math.min(atual.inicioIndex, atual.fimIndex)]);
    const fim = horarioMinutos(SLOTS[Math.max(atual.inicioIndex, atual.fimIndex)] + 30);
    const novo: Periodo = { id: `${isoDate(dia)}-${inicio}-${fim}`, salaId: atual.salaId, data: isoDate(dia), inicio, fim };
    setPeriodos((lista) => lista.some((item) => item.id === novo.id) ? lista : [...lista, novo].sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`)));
    setConfirmacaoAberta(true);
  }, [dia]);

  useEffect(() => {
    const finalizar = () => {
      if (!arrastandoRef.current) return;
      arrastandoRef.current = false;
      const atual = selecaoRef.current;
      if (atual) adicionarSelecao(atual);
    };
    window.addEventListener("pointerup", finalizar);
    window.addEventListener("pointercancel", finalizar);
    return () => { window.removeEventListener("pointerup", finalizar); window.removeEventListener("pointercancel", finalizar); };
  }, [adicionarSelecao]);

  useEffect(() => {
    if (carregandoSalas || salas.length === 0) return;
    try {
      const pendente = JSON.parse(sessionStorage.getItem(SELECAO_STORAGE_KEY) || "null") as { periodos?: Periodo[]; dados?: DadosConsulta } | null;
      const validos = (pendente?.periodos || []).filter((item) => salas.some((sala) => sala.id === item.salaId) && /^\d{4}-\d{2}-\d{2}$/.test(item.data) && /^\d{2}:\d{2}$/.test(item.inicio) && /^\d{2}:\d{2}$/.test(item.fim)).slice(0, MAX_PERIODOS);
      if (!validos.length) return;
      const data = new Date(`${validos[0].data}T12:00:00`);
      setDia(startOfDay(data)); setMes(startOfMonth(data));
      setPeriodos(validos);
      const dadosValidos = consultaSchema.safeParse(pendente?.dados);
      if (dadosValidos.success) setDadosEditados(dadosValidos.data);
      setConfirmacaoAberta(true);
      sessionStorage.removeItem(SELECAO_STORAGE_KEY);
    } catch { sessionStorage.removeItem(SELECAO_STORAGE_KEY); }
  }, [carregandoSalas, salas]);

  const salaSelecionada = selecao ? salas.find((sala) => sala.id === selecao.salaId) : null;
  const inicioSelecionado = selecao ? horarioMinutos(SLOTS[Math.min(selecao.inicioIndex, selecao.fimIndex)]) : "";
  const fimSelecionado = selecao ? horarioMinutos(SLOTS[Math.max(selecao.inicioIndex, selecao.fimIndex)] + 30) : "";
  const salaDosPeriodos = periodos.length ? salas.find((sala) => sala.id === periodos[0].salaId) : salaSelecionada;

  function iniciarSelecao(id: string, index: number) {
    if (ocupacaoNoSlot(id, index) || periodoNoSlot(id, index)) return;
    if (periodos.length && periodos[0].salaId !== id) {
      toast({ title: "Escolha a mesma sala", description: "Envie esta solicitação ou remova os períodos antes de escolher outra sala." });
      return;
    }
    if (periodos.length >= MAX_PERIODOS) {
      toast({ title: "Limite atingido", description: `Você pode enviar até ${MAX_PERIODOS} períodos por solicitação.` });
      return;
    }
    arrastandoRef.current = true;
    setConfirmacaoAberta(false);
    atualizarSelecao({ salaId: id, inicioIndex: index, fimIndex: index });
  }

  function ampliarSelecao(id: string, index: number) {
    const atual = selecaoRef.current;
    if (!arrastandoRef.current || !atual || atual.salaId !== id || !intervaloLivre(id, atual.inicioIndex, index)) return;
    atualizarSelecao({ ...atual, fimIndex: index });
  }

  async function solicitar() {
    if (!periodos.length || !salaDosPeriodos) return;
    const dadosValidos = consultaSchema.safeParse(dadosEditados);
    if (!dadosValidos.success) { toast({ title: "Revise seus dados", description: dadosValidos.error.issues[0]?.message, variant: "destructive" }); return; }
    localStorage.setItem(CONSULTA_STORAGE_KEY, JSON.stringify(dadosValidos.data));
    if (!autenticado) {
      sessionStorage.setItem(SELECAO_STORAGE_KEY, JSON.stringify({ periodos, dados: dadosValidos.data }));
      navigate(`/auth?redirect=${encodeURIComponent("/agendamento")}`);
      return;
    }
    setSolicitando(true);
    const { error } = await supabase.rpc("request_authenticated_reservations", {
      p_sala_id: salaDosPeriodos.id,
      p_periodos: periodos.map((item) => ({ data: item.data, hora_inicio: item.inicio, hora_fim: item.fim })),
      p_nome: dadosValidos.data.nome,
      p_email: dadosValidos.data.email,
      p_whatsapp: dadosValidos.data.whatsapp,
      p_tipo_negocio: dadosValidos.data.tipoNegocio,
    });
    if (error) toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
    else { toast({ title: "Reservas solicitadas", description: `${periodos.length} período${periodos.length > 1 ? "s ficaram" : " ficou"} pendente${periodos.length > 1 ? "s" : ""} até a confirmação da equipe.` }); setConfirmacaoAberta(false); atualizarSelecao(null); setPeriodos([]); await carregarAgenda(); }
    setSolicitando(false);
  }

  function abrirWhatsApp() {
    if (!salaDosPeriodos || !periodos.length) return;
    const validacao = consultaSchema.safeParse(dadosEditados);
    if (!validacao.success) { toast({ title: "Revise seus dados", description: validacao.error.issues[0]?.message, variant: "destructive" }); return; }
    const dados = validacao.data;
    localStorage.setItem(CONSULTA_STORAGE_KEY, JSON.stringify(dados)); setDadosConsulta(dados);
    const lista = periodos.map((item, index) => `${index + 1}. ${format(new Date(`${item.data}T12:00:00`), "dd/MM/yyyy")} — ${item.inicio} às ${item.fim}`).join("\n");
    const texto = `Olá! Quero consultar uma reserva no Coworking 013.\n\nNome: ${dados.nome}\nE-mail: ${dados.email}\nWhatsApp: ${dados.whatsapp}\nTipo de negócio: ${dados.tipoNegocio}\nUnidade: ${salaDosPeriodos.unidadeNome}\nSala: ${salaDosPeriodos.nome}\n\nDatas e horários:\n${lista}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  function removerPeriodo(id: string) {
    setPeriodos((lista) => {
      const atualizada = lista.filter((item) => item.id !== id);
      if (!atualizada.length) setConfirmacaoAberta(false);
      return atualizada;
    });
  }

  return <div className="min-h-screen bg-muted/30">
    <Navbar />
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl"><p className="mb-2 font-heading text-sm font-bold uppercase text-primary">Agendamento</p><h1 className="font-heading text-3xl font-black sm:text-4xl">Agenda de salas</h1><p className="mt-3 text-muted-foreground">Escolha uma data e arraste pelos horários livres. As reservas aparecem sem dados dos clientes.</p></div>
      <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div><label className="mb-2 block text-sm font-semibold">Unidade</label><Select value={unidadeId} onValueChange={setUnidadeId} disabled={carregandoSalas}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as unidades</SelectItem>{unidades.map((unidade) => <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-2 block text-sm font-semibold">Sala</label><Select value={salaId} onValueChange={setSalaId} disabled={carregandoSalas}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as salas</SelectItem>{salasFiltradas.map((sala) => <SelectItem key={sala.id} value={sala.id}>{sala.nome} · {sala.unidadeNome}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setMes((atual) => subMonths(atual, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button><p className="min-w-40 text-center font-heading font-bold capitalize">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p><Button variant="outline" size="icon" onClick={() => setMes((atual) => addMonths(atual, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button></div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">{DIAS_SEMANA.map((nome) => <div key={nome} className="py-2 text-center text-xs font-bold text-muted-foreground sm:text-sm">{nome}</div>)}{Array.from({ length: getDay(startOfMonth(mes)) }).map((_, index) => <div key={`empty-${index}`} />)}{dias.map((data) => { const selecionado = isSameDay(data, dia); const bloqueado = isBefore(data, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(data)}T12:00:00`)); const qtd = ocupacoes.filter((item) => item.data === isoDate(data) && salasFiltradas.some((sala) => sala.id === item.sala_id)).length; return <Button key={isoDate(data)} variant={selecionado ? "default" : "outline"} className="h-16 flex-col gap-1 p-1 sm:h-20" onClick={() => { setDia(data); atualizarSelecao(null); }} disabled={bloqueado}><span className="text-base font-bold">{format(data, "d")}</span><span className="text-[10px] font-medium sm:text-xs">{bloqueado ? "Fechado" : qtd ? `${qtd} ocupado${qtd > 1 ? "s" : ""}` : "Livre"}</span></Button>; })}</div>
      </section>
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-label="Agenda de horários do dia">
        <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-bold capitalize">{format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2><p className="text-sm text-muted-foreground">Clique e arraste para selecionar um período</p></div></div>
        {carregandoAgenda ? <div className="flex min-h-56 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando agenda...</div> : diaBloqueado ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Não há atendimento nesta data.</div> : salasGantt.length === 0 ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma sala encontrada neste filtro.</div> : <div className="overflow-x-auto select-none"><div className="min-w-[720px]" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="p-3 text-xs font-bold text-muted-foreground">Hora</div>{salasGantt.map((sala) => <div key={sala.id} className="border-l p-3 text-center"><p className="text-sm font-bold">{sala.nome}</p><p className="text-xs text-muted-foreground">{sala.unidadeNome}</p></div>)}</div>{SLOTS.map((slot, index) => <div key={slot} className="grid" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="border-b p-2 text-xs font-semibold text-muted-foreground">{horarioMinutos(slot)}</div>{salasGantt.map((sala) => { const ocupacao = ocupacaoNoSlot(sala.id, index); const selecionado = slotSelecionado(sala.id, index); return <div key={sala.id} role="button" tabIndex={ocupacao ? -1 : 0} aria-label={ocupacao ? `${sala.nome}, ${horarioMinutos(slot)}, indisponível` : `${sala.nome}, ${horarioMinutos(slot)}, disponível`} onPointerDown={(event) => { event.preventDefault(); iniciarSelecao(sala.id, index); }} onPointerEnter={() => ampliarSelecao(sala.id, index)} onKeyDown={(event) => { if (!ocupacao && !periodoNoSlot(sala.id, index) && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); iniciarSelecao(sala.id, index); arrastandoRef.current = false; adicionarSelecao({ salaId: sala.id, inicioIndex: index, fimIndex: index }); } }} className={`relative min-h-12 border-b border-l transition-colors ${ocupacao ? `${CORES[ocupacao.color_slot % CORES.length]} cursor-not-allowed text-primary-foreground` : selecionado ? "bg-primary/20 ring-2 ring-inset ring-primary cursor-grabbing" : "cursor-crosshair bg-card hover:bg-primary/10"}`}>{ocupacao ? <div className="flex h-full items-center justify-center px-2 text-xs font-bold"><LockKeyhole className="mr-1 h-3.5 w-3.5" />Indisponível</div> : selecionado ? <span className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" /> : null}</div>; })}</div>)}</div></div>}
      </section>
    </main>
    <Footer />
    <Dialog open={confirmacaoAberta} onOpenChange={(aberta) => { setConfirmacaoAberta(aberta); if (!aberta) atualizarSelecao(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading text-2xl font-black">Confirmar solicitação</DialogTitle><DialogDescription>Edite seus dados e confira todos os períodos escolhidos.</DialogDescription></DialogHeader>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="confirmar-nome">Nome completo</Label><Input id="confirmar-nome" maxLength={100} value={dadosEditados.nome} onChange={(e) => setDadosEditados((atual) => ({ ...atual, nome: e.target.value }))} /></div>
            <div><Label htmlFor="confirmar-email">E-mail</Label><Input id="confirmar-email" type="email" maxLength={255} value={dadosEditados.email} onChange={(e) => setDadosEditados((atual) => ({ ...atual, email: e.target.value }))} /></div>
            <div><Label htmlFor="confirmar-whatsapp">WhatsApp</Label><Input id="confirmar-whatsapp" type="tel" maxLength={30} value={dadosEditados.whatsapp} onChange={(e) => setDadosEditados((atual) => ({ ...atual, whatsapp: e.target.value }))} /></div>
            <div><Label htmlFor="confirmar-negocio">Tipo de negócio</Label><Input id="confirmar-negocio" maxLength={120} value={dadosEditados.tipoNegocio} onChange={(e) => setDadosEditados((atual) => ({ ...atual, tipoNegocio: e.target.value }))} /></div>
          </div>
          {salaDosPeriodos && <div className="rounded-md border bg-muted/40 p-4"><p className="font-heading text-lg font-bold">{salaDosPeriodos.nome}</p><p className="text-sm text-muted-foreground">{salaDosPeriodos.unidadeNome}</p><div className="mt-3 space-y-2">{periodos.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"><div><p className="font-semibold">{format(new Date(`${item.data}T12:00:00`), "dd/MM/yyyy")}</p><p className="text-sm text-muted-foreground">{item.inicio} às {item.fim}</p></div><Button variant="ghost" size="icon" aria-label="Remover período" onClick={() => removerPeriodo(item.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div>}
          <Button variant="outline" className="w-full" onClick={() => { setConfirmacaoAberta(false); atualizarSelecao(null); }} disabled={periodos.length >= MAX_PERIODOS}><Plus className="mr-2 h-4 w-4" />Adicionar outra data ou horário</Button>
        </div>
        <DialogFooter className="gap-2 sm:space-x-0"><Button variant="outline" onClick={abrirWhatsApp} disabled={!periodos.length}><MessageCircle className="mr-2 h-4 w-4" />Enviar por WhatsApp</Button><Button onClick={() => void solicitar()} disabled={solicitando || !periodos.length}>{solicitando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : autenticado ? <Send className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}{autenticado ? "Solicitar períodos" : "Entrar ou cadastrar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ReservaDialog open={consultaAberta} onOpenChange={(aberta) => { if (dadosConsulta || aberta) setConsultaAberta(aberta); }} onSuccess={() => { const dados = lerConsulta(); setDadosConsulta(dados); if (dados) setDadosEditados(dados); setConsultaAberta(false); if (selecaoRef.current) setConfirmacaoAberta(true); }} />
  </div>;
}