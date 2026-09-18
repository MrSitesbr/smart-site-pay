import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, LockKeyhole, LogIn, MessageCircle, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReservaDialog, { CONSULTA_STORAGE_KEY } from "@/components/ReservaDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isBusinessDay } from "@/lib/holidays";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SalaPublica = { id: string; nome: string; unidade_id: string | null; unidadeNome: string };
type UnidadePublica = { id: string; nome: string };
type Ocupacao = { sala_id: string; data: string; hora_inicio: string; hora_fim: string; color_slot: number };
type DadosConsulta = { nome: string; email: string; whatsapp: string; tipoNegocio: string };
type Selecao = { salaId: string; inicioIndex: number; fimIndex: number };

const UNIDADES_PERMANENTES = new Set([
  "66a610f6-1f6b-4673-903d-80aa57657982",
  "40840fbd-f575-4ff7-9e6d-1e9231985ce6",
]);
const SLOTS = Array.from({ length: 20 }, (_, index) => 8 * 60 + index * 30);
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CORES = ["bg-primary", "bg-secondary", "bg-destructive", "bg-accent", "bg-foreground", "bg-muted-foreground"];
const WHATSAPP = "5513988050358";
const SELECAO_STORAGE_KEY = "coworking013_selecao_agenda";
const isoDate = (date: Date) => format(date, "yyyy-MM-dd");
const horarioMinutos = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const minutos = (valor: string) => { const [h, m] = valor.slice(0, 5).split(":").map(Number); return h * 60 + m; };

function lerConsulta(): DadosConsulta | null {
  try {
    const valor = JSON.parse(localStorage.getItem(CONSULTA_STORAGE_KEY) || "null");
    return valor?.nome && valor?.email && valor?.whatsapp && valor?.tipoNegocio ? valor : null;
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
  const intervaloLivre = (id: string, a: number, b: number) => {
    const inicio = Math.min(a, b), fim = Math.max(a, b);
    return Array.from({ length: fim - inicio + 1 }, (_, offset) => inicio + offset).every((index) => !ocupacaoNoSlot(id, index));
  };
  const slotSelecionado = (id: string, index: number) => selecao?.salaId === id && index >= Math.min(selecao.inicioIndex, selecao.fimIndex) && index <= Math.max(selecao.inicioIndex, selecao.fimIndex);

  useEffect(() => {
    const finalizar = () => {
      if (!arrastandoRef.current) return;
      arrastandoRef.current = false;
      if (selecaoRef.current) setConfirmacaoAberta(true);
    };
    window.addEventListener("pointerup", finalizar);
    window.addEventListener("pointercancel", finalizar);
    return () => { window.removeEventListener("pointerup", finalizar); window.removeEventListener("pointercancel", finalizar); };
  }, []);

  useEffect(() => {
    if (carregandoSalas || salas.length === 0) return;
    try {
      const pendente = JSON.parse(sessionStorage.getItem(SELECAO_STORAGE_KEY) || "null") as { data?: string; salaId?: string; inicio?: string; fim?: string } | null;
      if (!pendente?.data || !pendente.salaId || !pendente.inicio || !pendente.fim) return;
      const salaExiste = salas.some((sala) => sala.id === pendente.salaId);
      const inicioIndex = SLOTS.indexOf(minutos(pendente.inicio));
      const fimIndex = SLOTS.indexOf(minutos(pendente.fim) - 30);
      if (!salaExiste || inicioIndex < 0 || fimIndex < inicioIndex) { sessionStorage.removeItem(SELECAO_STORAGE_KEY); return; }
      const data = new Date(`${pendente.data}T12:00:00`);
      setDia(startOfDay(data)); setMes(startOfMonth(data));
      atualizarSelecao({ salaId: pendente.salaId, inicioIndex, fimIndex });
      setConfirmacaoAberta(true);
      sessionStorage.removeItem(SELECAO_STORAGE_KEY);
    } catch { sessionStorage.removeItem(SELECAO_STORAGE_KEY); }
  }, [carregandoSalas, salas]);

  const salaSelecionada = selecao ? salas.find((sala) => sala.id === selecao.salaId) : null;
  const inicioSelecionado = selecao ? horarioMinutos(SLOTS[Math.min(selecao.inicioIndex, selecao.fimIndex)]) : "";
  const fimSelecionado = selecao ? horarioMinutos(SLOTS[Math.max(selecao.inicioIndex, selecao.fimIndex)] + 30) : "";

  function iniciarSelecao(id: string, index: number) {
    if (ocupacaoNoSlot(id, index)) return;
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
    if (!selecao || !salaSelecionada) return;
    if (!autenticado) {
      sessionStorage.setItem(SELECAO_STORAGE_KEY, JSON.stringify({ data: isoDate(dia), salaId: selecao.salaId, inicio: inicioSelecionado, fim: fimSelecionado }));
      navigate(`/auth?redirect=${encodeURIComponent("/agendamento")}`);
      return;
    }
    setSolicitando(true);
    const { error } = await supabase.rpc("request_authenticated_reservation", { p_sala_id: selecao.salaId, p_data: isoDate(dia), p_hora_inicio: inicioSelecionado, p_hora_fim: fimSelecionado });
    if (error) toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
    else { toast({ title: "Reserva solicitada", description: "O horário ficou pendente até a confirmação da equipe." }); setConfirmacaoAberta(false); atualizarSelecao(null); await carregarAgenda(); }
    setSolicitando(false);
  }

  function abrirWhatsApp() {
    if (!salaSelecionada) return;
    const dados = dadosConsulta || lerConsulta();
    if (!dados) { setConfirmacaoAberta(false); setConsultaAberta(true); return; }
    const texto = `Olá! Quero consultar uma reserva no Coworking 013.\n\nNome: ${dados.nome}\nE-mail: ${dados.email}\nWhatsApp: ${dados.whatsapp}\nTipo de negócio: ${dados.tipoNegocio}\nUnidade: ${salaSelecionada.unidadeNome}\nSala: ${salaSelecionada.nome}\nData: ${format(dia, "dd/MM/yyyy")}\nHorário: ${inicioSelecionado} às ${fimSelecionado}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
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
        {carregandoAgenda ? <div className="flex min-h-56 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando agenda...</div> : diaBloqueado ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Não há atendimento nesta data.</div> : salasGantt.length === 0 ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma sala encontrada neste filtro.</div> : <div className="overflow-x-auto select-none"><div className="min-w-[720px]" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="p-3 text-xs font-bold text-muted-foreground">Hora</div>{salasGantt.map((sala) => <div key={sala.id} className="border-l p-3 text-center"><p className="text-sm font-bold">{sala.nome}</p><p className="text-xs text-muted-foreground">{sala.unidadeNome}</p></div>)}</div>{SLOTS.map((slot, index) => <div key={slot} className="grid" style={{ gridTemplateColumns: `76px repeat(${salasGantt.length}, minmax(180px, 1fr))` }}><div className="border-b p-2 text-xs font-semibold text-muted-foreground">{horarioMinutos(slot)}</div>{salasGantt.map((sala) => { const ocupacao = ocupacaoNoSlot(sala.id, index); const selecionado = slotSelecionado(sala.id, index); return <div key={sala.id} role="button" tabIndex={ocupacao ? -1 : 0} aria-label={ocupacao ? `${sala.nome}, ${horarioMinutos(slot)}, indisponível` : `${sala.nome}, ${horarioMinutos(slot)}, disponível`} onPointerDown={(event) => { event.preventDefault(); iniciarSelecao(sala.id, index); }} onPointerEnter={() => ampliarSelecao(sala.id, index)} onKeyDown={(event) => { if (!ocupacao && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); iniciarSelecao(sala.id, index); arrastandoRef.current = false; setConfirmacaoAberta(true); } }} className={`relative min-h-12 border-b border-l transition-colors ${ocupacao ? `${CORES[ocupacao.color_slot % CORES.length]} cursor-not-allowed text-primary-foreground` : selecionado ? "bg-primary/20 ring-2 ring-inset ring-primary cursor-grabbing" : "cursor-crosshair bg-card hover:bg-primary/10"}`}>{ocupacao ? <div className="flex h-full items-center justify-center px-2 text-xs font-bold"><LockKeyhole className="mr-1 h-3.5 w-3.5" />Indisponível</div> : selecionado ? <span className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" /> : null}</div>; })}</div>)}</div></div>}
      </section>
    </main>
    <Footer />
    <Dialog open={confirmacaoAberta} onOpenChange={(aberta) => { setConfirmacaoAberta(aberta); if (!aberta) atualizarSelecao(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading text-2xl font-black">Confirmar horário</DialogTitle><DialogDescription>Confira o período escolhido antes de continuar.</DialogDescription></DialogHeader>
        {salaSelecionada && <div className="rounded-md border bg-muted/40 p-4"><p className="font-heading text-lg font-bold">{salaSelecionada.nome}</p><p className="text-sm text-muted-foreground">{salaSelecionada.unidadeNome}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Data</p><p className="font-semibold">{format(dia, "dd/MM/yyyy")}</p></div><div><p className="text-muted-foreground">Horário</p><p className="font-semibold">{inicioSelecionado} às {fimSelecionado}</p></div></div></div>}
        <DialogFooter className="gap-2 sm:space-x-0"><Button variant="outline" onClick={abrirWhatsApp}><MessageCircle className="mr-2 h-4 w-4" />Enviar por WhatsApp</Button><Button onClick={() => void solicitar()} disabled={solicitando}>{solicitando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : autenticado ? <Send className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}{autenticado ? "Solicitar reserva" : "Entrar ou cadastrar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ReservaDialog open={consultaAberta} onOpenChange={(aberta) => { if (dadosConsulta || aberta) setConsultaAberta(aberta); }} onSuccess={() => { const dados = lerConsulta(); setDadosConsulta(dados); setConsultaAberta(false); if (selecaoRef.current) setConfirmacaoAberta(true); }} />
  </div>;
}