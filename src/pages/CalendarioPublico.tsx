import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, LockKeyhole, MessageCircle, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReservaDialog, { CONSULTA_STORAGE_KEY } from "@/components/ReservaDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isBusinessDay } from "@/lib/holidays";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SalaPublica = { id: string; nome: string; unidade_id: string | null; unidadeNome: string };
type UnidadePublica = { id: string; nome: string };
type Ocupacao = { sala_id: string; data: string; hora_inicio: string; hora_fim: string; color_slot: number };
type DadosConsulta = { nome: string; email: string; whatsapp: string; tipoNegocio: string };

const HORAS = Array.from({ length: 10 }, (_, index) => 8 + index);
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CORES = ["bg-primary", "bg-secondary", "bg-destructive", "bg-accent", "bg-foreground", "bg-muted-foreground"];
const WHATSAPP = "5513988050358";
const isoDate = (date: Date) => format(date, "yyyy-MM-dd");
const horario = (hora: number) => `${String(hora).padStart(2, "0")}:00`;
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
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [dadosConsulta, setDadosConsulta] = useState<DadosConsulta | null>(() => lerConsulta());
  const [consultaAberta, setConsultaAberta] = useState(() => !lerConsulta());

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from("salas").select("id, nome, unidade_id, status").in("status", ["disponivel", "ativa"]).order("nome"),
      supabase.from("unidades").select("id, nome").ilike("status", "ativ%").order("nome"),
      supabase.auth.getSession(),
    ]).then(([salasResponse, unidadesResponse, sessaoResponse]) => {
      if (!ativo) return;
      if (salasResponse.error) toast({ title: "Não foi possível carregar as salas", description: salasResponse.error.message, variant: "destructive" });
      const listaUnidades = unidadesResponse.data || [];
      const nomes = new Map(listaUnidades.map((unidade) => [unidade.id, unidade.nome]));
      setUnidades(listaUnidades);
      setSalas((salasResponse.data || []).map((sala) => ({ id: sala.id, nome: sala.nome, unidade_id: sala.unidade_id, unidadeNome: sala.unidade_id ? nomes.get(sala.unidade_id) || "Unidade" : "Unidade" })));
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
    const { data, error } = await supabase.rpc("get_public_room_availability", { p_start_date: isoDate(startOfMonth(mes)), p_end_date: isoDate(endOfMonth(mes)), p_sala_id: salaId === "todas" ? null : salaId });
    if (error) { toast({ title: "Não foi possível consultar a agenda", description: error.message, variant: "destructive" }); setOcupacoes([]); }
    else setOcupacoes((data || []) as Ocupacao[]);
    setCarregandoAgenda(false);
  }, [mes, salaId]);
  useEffect(() => { void carregarAgenda(); }, [carregarAgenda]);

  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) }), [mes]);
  const ocupacoesDoDia = ocupacoes.filter((item) => item.data === isoDate(dia));
  const diaBloqueado = isBefore(dia, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(dia)}T12:00:00`));
  const salasGantt = salaId === "todas" ? salasFiltradas : salasFiltradas.filter((sala) => sala.id === salaId);
  const ocupacaoNoHorario = (id: string, inicio: string, fim: string) => ocupacoesDoDia.find((item) => item.sala_id === id && inicio < item.hora_fim.slice(0, 5) && fim > item.hora_inicio.slice(0, 5));

  async function solicitar(id: string, inicio: string, fim: string) {
    if (!autenticado) { toast({ title: "Entre na sua conta", description: "O pedido de reserva é exclusivo para clientes cadastrados e autorizados." }); navigate("/auth"); return; }
    setSolicitando(`${id}-${inicio}`);
    const { error } = await supabase.rpc("request_authenticated_reservation", { p_sala_id: id, p_data: isoDate(dia), p_hora_inicio: inicio, p_hora_fim: fim });
    if (error) toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
    else { toast({ title: "Reserva solicitada", description: "O horário ficou pendente até a confirmação da equipe." }); await carregarAgenda(); }
    setSolicitando(null);
  }

  function abrirWhatsApp(sala: SalaPublica, inicio: string, fim: string) {
    const dados = dadosConsulta || lerConsulta();
    if (!dados) { setConsultaAberta(true); return; }
    const texto = `Olá! Quero consultar uma reserva no Coworking 013.\n\nNome: ${dados.nome}\nE-mail: ${dados.email}\nWhatsApp: ${dados.whatsapp}\nTipo de negócio: ${dados.tipoNegocio}\nUnidade: ${sala.unidadeNome}\nSala: ${sala.nome}\nData: ${format(dia, "dd/MM/yyyy")}\nHorário: ${inicio} às ${fim}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  return <div className="min-h-screen bg-muted/30">
    <Navbar />
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl"><p className="mb-2 font-heading text-sm font-bold uppercase text-primary">Agendamento</p><h1 className="font-heading text-3xl font-black sm:text-4xl">Agenda de salas</h1><p className="mt-3 text-muted-foreground">Veja todas as salas ou filtre por unidade. Reservas aparecem sem nomes ou dados dos clientes.</p></div>
      <section className="mb-6 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div><label className="mb-2 block text-sm font-semibold">Unidade</label><Select value={unidadeId} onValueChange={setUnidadeId} disabled={carregandoSalas}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as unidades</SelectItem>{unidades.map((unidade) => <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-2 block text-sm font-semibold">Sala</label><Select value={salaId} onValueChange={setSalaId} disabled={carregandoSalas}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as salas</SelectItem>{salasFiltradas.map((sala) => <SelectItem key={sala.id} value={sala.id}>{sala.nome} · {sala.unidadeNome}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setMes((atual) => subMonths(atual, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button><p className="min-w-40 text-center font-heading font-bold capitalize">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p><Button variant="outline" size="icon" onClick={() => setMes((atual) => addMonths(atual, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button></div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">{DIAS_SEMANA.map((nome) => <div key={nome} className="py-2 text-center text-xs font-bold text-muted-foreground sm:text-sm">{nome}</div>)}{Array.from({ length: getDay(startOfMonth(mes)) }).map((_, index) => <div key={`empty-${index}`} />)}{dias.map((data) => { const selecionado = isSameDay(data, dia); const bloqueado = isBefore(data, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(data)}T12:00:00`)); const qtd = ocupacoes.filter((item) => item.data === isoDate(data) && salasFiltradas.some((sala) => sala.id === item.sala_id)).length; return <Button key={isoDate(data)} variant={selecionado ? "default" : "outline"} className="h-16 flex-col gap-1 p-1 sm:h-20" onClick={() => setDia(data)} disabled={bloqueado}><span className="text-base font-bold">{format(data, "d")}</span><span className="text-[10px] font-medium sm:text-xs">{bloqueado ? "Fechado" : qtd ? `${qtd} ocupado${qtd > 1 ? "s" : ""}` : "Livre"}</span></Button>; })}</div>
      </section>
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-label="Gantt de horários do dia">
        <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></div><div><h2 className="font-heading text-lg font-bold capitalize">{format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2><p className="text-sm text-muted-foreground">Horários por sala</p></div></div>
        {carregandoAgenda ? <div className="flex min-h-56 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando agenda...</div> : diaBloqueado ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Não há atendimento nesta data.</div> : salasGantt.length === 0 ? <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma sala encontrada neste filtro.</div> : <div className="overflow-x-auto"><div className="min-w-[1540px]"><div className="grid border-b" style={{ gridTemplateColumns: `220px repeat(${HORAS.length}, minmax(132px, 1fr))` }}><div className="p-3 text-sm font-bold">Sala</div>{HORAS.map((hora) => <div key={hora} className="border-l p-3 text-center text-xs font-bold text-muted-foreground">{horario(hora)}</div>)}</div>{salasGantt.map((sala) => <div key={sala.id} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: `220px repeat(${HORAS.length}, minmax(132px, 1fr))` }}><div className="p-3"><p className="text-sm font-bold">{sala.nome}</p><p className="text-xs text-muted-foreground">{sala.unidadeNome}</p></div>{HORAS.map((hora) => { const inicio = horario(hora), fim = horario(hora + 1), ocupacao = ocupacaoNoHorario(sala.id, inicio, fim), chave = `${sala.id}-${inicio}`; return <div key={inicio} className="min-h-20 border-l p-1.5">{ocupacao ? <div className={`flex h-full min-h-16 items-center justify-center rounded-md px-1 text-center text-xs font-bold text-primary-foreground ${CORES[ocupacao.color_slot % CORES.length]}`}><LockKeyhole className="mr-1 h-3.5 w-3.5" /> Indisponível</div> : <div className="flex h-full min-h-16 items-center justify-center gap-1"><Button size="icon" variant="outline" onClick={() => abrirWhatsApp(sala, inicio, fim)} aria-label={`Consultar ${sala.nome} por WhatsApp às ${inicio}`}><MessageCircle className="h-4 w-4" /></Button><Button size="sm" onClick={() => void solicitar(sala.id, inicio, fim)} disabled={solicitando !== null} aria-label={`Solicitar ${sala.nome} às ${inicio}`}>{solicitando === chave ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /><span>{autenticado ? "Solicitar" : "Entrar"}</span></>}</Button></div>}</div>; })}</div>)}</div></div>}
      </section>
    </main>
    <Footer />
    <ReservaDialog open={consultaAberta} onOpenChange={(aberta) => { if (dadosConsulta || aberta) setConsultaAberta(aberta); }} onSuccess={() => { const dados = lerConsulta(); setDadosConsulta(dados); setConsultaAberta(false); }} />
  </div>;
}