import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Search, ExternalLink, Loader2, Eye, Trash2, Plus, UserCheck } from "lucide-react";
import { isBusinessDay, isHoliday, getDateInfo } from "@/lib/holidays";
import { supabase } from "@/integrations/supabase/client";
import { invokeGoogleSync } from "@/lib/googleSync";
import EventAvatar from "./EventAvatar";
import NovaReservaDialog from "./NovaReservaDialog";
import DayTimelineDialog from "./DayTimelineDialog";
import { useClientColors } from "@/hooks/useClientColors";
import { getClientColor, readableTextOn, WOBA_COLOR } from "@/lib/clientColors";
import { CalendarListView } from "./CalendarListView";
import { CalendarGanttView } from "./CalendarGanttView";


const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Hora", diaria: "Diária", pacote: "Pacote 10", mensal: "Mensal",
};
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500", aprovada: "bg-blue-500", confirmada: "bg-blue-500",
  paga: "bg-green-500", realizada: "bg-green-500",
  concluida: "bg-emerald-700", cancelada: "bg-red-500",
};

const WEEKDAYS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function AdminCalendar({ reservas, contratos, onDeleteReserva, onDeleteContrato, onCreated, initialFilter = "geral" }: { reservas: any[]; contratos: any[]; onDeleteReserva?: (r: any) => Promise<void> | void; onDeleteContrato?: (c: any) => Promise<void> | void; onCreated?: () => void; initialFilter?: "geral" | "reservas" | "visitas" }) {
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "gantt">("calendar");
  const [filterType, setFilterType] = useState<"geral" | "reservas" | "visitas">(initialFilter);
  const [month, setMonth] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");
  const [ambiente, setAmbiente] = useState<string>("todos");
  const [status, setStatus] = useState<string>("todos");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [fullView, setFullView] = useState<{ kind: "reserva" | "contrato"; obj: any } | null>(null);
  const [novaDay, setNovaDay] = useState<Date | null>(null);
  const [timelineDay, setTimelineDay] = useState<Date | null>(null);
  const [gEvents, setGEvents] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState<string | null>(null);
  const [showGoogle, setShowGoogle] = useState(true);
  const { overrides: colorOverrides } = useClientColors();
  const [visitantes, setVisitantes] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('unidades').select('id, nome').then(({ data }) => setUnidades(data || []));
    supabase.from('visitantes').select('*, clientes_corp(razao_social), salas(nome, unidade_id)').then(({ data }) => setVisitantes(data || []));
  }, []);

  // IDs de eventos do Google que já foram associados a reservas/contratos internos.
  // Se um desses sumir do banco (reserva excluída), guardamos o id para nunca mais
  // exibi-lo como evento solto do Google, mesmo que a listagem do Google demore a atualizar.
  const knownGoogleIdsRef = useRef<Set<string>>(new Set());
  const [deletedGoogleIds, setDeletedGoogleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set<string>();
    reservas.forEach((r) => r.google_event_id && currentIds.add(r.google_event_id));
    contratos.forEach((c) => c.google_event_id && currentIds.add(c.google_event_id));
    // ids que existiam antes e sumiram agora = foram excluídos
    const removed: string[] = [];
    knownGoogleIdsRef.current.forEach((id) => { if (!currentIds.has(id)) removed.push(id); });
    if (removed.length) {
      setDeletedGoogleIds((prev) => {
        const next = new Set(prev);
        removed.forEach((id) => next.add(id));
        return next;
      });
    }
    knownGoogleIdsRef.current = currentIds;
  }, [reservas, contratos]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setGLoading(true); setGError(null);
      const first = new Date(month.getFullYear(), month.getMonth(), 1);
      const last = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const timeMin = new Date(first); timeMin.setDate(first.getDate() - 7);
      const timeMax = new Date(last); timeMax.setDate(last.getDate() + 7);
      const { data, error } = await invokeGoogleSync({
        action: "list_events", timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(),
      });
      if (cancelled) return;
      if (error || data?.error) setGError((error?.message || data?.error) as string);
      else setGEvents(data?.events || []);
      setGLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [month, reservas.length, contratos.length]);

  const internalIds = useMemo(() => {
    const s = new Set<string>();
    reservas.forEach((r) => r.google_event_id && s.add(r.google_event_id));
    contratos.forEach((c) => c.google_event_id && s.add(c.google_event_id));
    return s;
  }, [reservas, contratos]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    const push = (key: string, ev: any) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    };
    const q = search.trim().toLowerCase();
    const matches = (nome: string, email: string, amb: string, st: string, unidId?: string) => {
      if (selectedUnidade !== "todas" && unidId !== selectedUnidade) return false;
      if (ambiente !== "todos" && amb !== ambiente) return false;
      if (status !== "todos" && st !== status) return false;
      if (q && !nome.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) return false;
      return true;
    };
    if (filterType === "geral" || filterType === "reservas") {
      contratos.forEach((c) => {
        if (!matches(c.nome, c.email, c.ambiente, c.status, c.unidade_id)) return;
        const dias: string[] = c.dias_selecionados || [];
        dias.forEach((d) => push(d, { kind: "contrato", obj: c }));
        if (c.data_inicio && !dias.includes(c.data_inicio)) push(c.data_inicio, { kind: "contrato", obj: c });
      });
      reservas.forEach((r) => {
        if (!matches(r.nome, r.email, r.ambiente, r.status, r.unidade_id)) return;
        push(r.data, { kind: "reserva", obj: r });
      });
    }

    if (filterType === "geral" || filterType === "visitas") {
      visitantes.forEach((v) => {
        const dateKey = v.data_hora_prevista?.slice(0, 10);
        if (!dateKey) return;
        if (selectedUnidade !== "todas" && v.salas?.unidade_id !== selectedUnidade) return;
        if (q && !v.nome.toLowerCase().includes(q) && !v.clientes_corp?.razao_social.toLowerCase().includes(q)) return;
        push(dateKey, { kind: "visita", obj: v });
      });
    }

    if (showGoogle && (filterType === "geral" || filterType === "reservas")) {
      gEvents.forEach((g) => {
        if (g.status === "cancelled") return;
        if (internalIds.has(g.id)) return; 
        if (deletedGoogleIds.has(g.id)) return;
        const startStr: string | undefined = g.start?.dateTime || g.start?.date;
        if (!startStr) return;
        if (q) {
          const hay = `${g.summary || ""} ${g.description || ""} ${(g.attendees||[]).map((a:any)=>a.email).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return;
        }
        const key = startStr.slice(0, 10);
        push(key, { kind: "google", obj: g });
      });
    }
    return map;
  }, [reservas, contratos, visitantes, filterType, gEvents, showGoogle, internalIds, deletedGoogleIds, search, ambiente, status, selectedUnidade]);


  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const goPrev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const selectedInfo = selectedDay ? eventsByDay.get(dayKey(selectedDay)) : undefined;

  return (
    <Card className="overflow-hidden">
      {/* Filtros */}
      <div className="p-4 border-b bg-muted/20 flex flex-wrap gap-3 items-center">
        <div className="flex bg-white p-1 rounded-lg border shadow-sm shrink-0">
          <Button 
            variant={filterType === "geral" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilterType("geral")}
            className="text-xs h-8"
          >
            Geral
          </Button>
          <Button 
            variant={filterType === "reservas" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilterType("reservas")}
            className="text-xs h-8"
          >
            Reservas
          </Button>
          <Button 
            variant={filterType === "visitas" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setFilterType("visitas")}
            className="text-xs h-8"
          >
            Visitas
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1 hidden md:block" />

        <div className="flex bg-white p-1 rounded-lg border shadow-sm shrink-0">
          <Button 
            variant={viewMode === "calendar" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("calendar")}
            className="text-xs h-8"
          >
            Calendário
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("list")}
            className="text-xs h-8"
          >
            Lista
          </Button>
          <Button 
            variant={viewMode === "gantt" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("gantt")}
            className="text-xs h-8"
          >
            Gantt
          </Button>
        </div>

        <div className="flex items-center gap-2 grow">
          <div className="relative grow max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente..." className="pl-9 h-9" />
          </div>
          
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Unidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ambiente} onValueChange={setAmbiente}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Ambiente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ambientes</SelectItem>
              <SelectItem value="estacao">Estação</SelectItem>
              <SelectItem value="sala_privativa">Sala Privativa</SelectItem>
              <SelectItem value="sala_reuniao">Sala Reunião</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())} className="font-heading font-bold h-9">Hoje</Button>
          <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b gap-3 flex-wrap">
        <h2 className="font-heading font-black text-xl capitalize">
          {MONTHS[month.getMonth()]} <span className="text-muted-foreground">{month.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showGoogle} onChange={(e) => setShowGoogle(e.target.checked)} />
            <span className="inline-block w-3 h-3 rounded bg-[#4285F4]" /> Google Agenda
          </label>
          {gLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {gError && <span className="text-red-600" title={gError}>erro Google</span>}
          <span>{Array.from(eventsByDay.values()).reduce((a, v) => a + v.length, 0)} eventos no mês</span>
        </div>
      </div>


      {viewMode === "calendar" ? (
        <>
          <div className="grid grid-cols-7 border-b bg-brand-blue-dark">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-[11px] font-heading font-bold tracking-widest text-white text-center">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 min-h-[600px]">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = d.getTime() === today.getTime();
              const business = isBusinessDay(d);
              const holiday = isHoliday(d);
              const info = getDateInfo(d);
              const events = eventsByDay.get(dayKey(d)) || [];
              const isSunday = i % 7 === 0;
              const isLastRow = i >= 35;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(new Date(d))}
                  onKeyDown={(ev) => { if (ev.key === "Enter") setSelectedDay(new Date(d)); }}
                  className={[
                    "group text-left p-1.5 border-border transition-colors relative flex flex-col gap-1 overflow-hidden min-h-[100px] cursor-pointer",
                    !isSunday && "border-l",
                    !isLastRow && "border-b",
                    inMonth ? "bg-card" : "bg-muted/60",
                    holiday && inMonth && "bg-red-500/15",
                    !business && !holiday && inMonth && "bg-secondary/5",
                    "hover:bg-primary/10",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className={[
                      "text-sm font-heading font-black w-7 h-7 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground shadow-md",
                      !isToday && holiday && inMonth && "text-red-700",
                      !isToday && !holiday && inMonth && "text-foreground",
                      !isToday && !inMonth && "text-muted-foreground/60",
                    ].filter(Boolean).join(" ")}>{d.getDate()}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        role="button"
                        tabIndex={0}
                        title="Ver dia em linha do tempo"
                        onClick={(ev) => { ev.stopPropagation(); setTimelineDay(new Date(d)); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); setTimelineDay(new Date(d)); } }}
                        className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center hover:scale-110 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        title="Nova reserva neste dia"
                        onClick={(ev) => { ev.stopPropagation(); setNovaDay(new Date(d)); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); setNovaDay(new Date(d)); } }}
                        className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                  {info && (
                    <div className={`text-[10px] px-1 truncate font-heading font-bold ${info.holiday ? "text-red-600" : "text-muted-foreground"}`}>{info.name}</div>
                  )}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {events.slice(0, 3).map((e, idx) => {
                      if (e.kind === "google") {
                        const g = e.obj;
                        const t = g.start?.dateTime ? new Date(g.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "dia";
                        const blob = `${g.summary || ""} ${g.description || ""} ${(g.attendees||[]).map((a:any)=>`${a.email||""} ${a.displayName||""}`).join(" ")}`.toLowerCase();
                        const isWoba = blob.includes("woba");
                        const attendee = g.attendees?.find((a: any) => a.email && !a.email.includes("group.calendar")) || g.attendees?.[0];
                        const displayName = attendee?.displayName || attendee?.email || g.summary || "Google";
                        const bg = isWoba ? WOBA_COLOR : getClientColor({ name: displayName, email: attendee?.email, overrides: colorOverrides });
                        const fg = readableTextOn(bg);
                        return (
                          <div key={idx} className="text-[10px] rounded pl-0.5 pr-1.5 py-0.5 truncate font-medium flex items-center gap-1" style={{ background: bg, color: fg }} title={g.summary}>
                            <EventAvatar name={displayName} isWoba={isWoba} color={bg} size={16} />
                            <span className="truncate">{t} · {g.summary || "(sem título)"}</span>
                          </div>
                        );
                      }
                      if (e.kind === "visita") {
                        const v = e.obj;
                        const t = v.data_hora_prevista ? new Date(v.data_hora_prevista).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "visita";
                        const bg = "#f97316"; // Brand Orange
                        return (
                          <div key={idx} className="text-[10px] rounded pl-0.5 pr-1.5 py-0.5 truncate font-medium flex items-center gap-1 bg-brand-orange text-white" title={`Visita: ${v.nome}`}>
                            <UserCheck className="w-3 h-3" />
                            <span className="truncate">{t} · {v.nome}</span>
                          </div>
                        );
                      }
                      const isWobaRow = e.obj.origem === "woba";
                      const ambLabel = AMBIENTE_LABEL[e.obj.ambiente] || e.obj.ambiente;
                      const tipoLabel = e.kind === "contrato" ? PLANO_LABEL[e.obj.plano_tipo] : (e.obj.tipo === "diaria" ? "Diária" : "Hora");
                      const label = `${e.obj.nome.split(" ")[0]} · ${ambLabel} · ${tipoLabel}`;
                      const bg = getClientColor({ name: e.obj.nome, email: e.obj.email, isWoba: isWobaRow, overrides: colorOverrides });
                      const fg = readableTextOn(bg);
                      const statusDot = STATUS_COLORS[e.obj.status] || "bg-secondary";
                      return (
                        <div key={idx} className="text-[10px] rounded pl-0.5 pr-1.5 py-0.5 truncate font-medium flex items-center gap-1" style={{ background: bg, color: fg }} title={`${e.obj.nome} — ${AMBIENTE_LABEL[e.obj.ambiente]} · ${e.obj.status}`}>
                          <EventAvatar name={e.obj.nome} isWoba={isWobaRow} photoUrl={e.obj.photo_url} color={bg} size={16} />
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                    {events.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{events.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : viewMode === "list" ? (
        <CalendarListView 
          events={Array.from(eventsByDay.values()).flat()} 
          onDeleteReserva={onDeleteReserva}
          onDeleteContrato={onDeleteContrato}
          onViewDetails={(kind, obj) => setFullView({ kind, obj })}
        />
      ) : (
        <CalendarGanttView 
          events={Array.from(eventsByDay.values()).flat()} 
          month={month} 
        />
      )}


      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(undefined)}>
        <DialogContent className="max-w-lg">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </DialogTitle>
              </DialogHeader>
              {!selectedInfo || selectedInfo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento nesta data.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {selectedInfo.map((e, idx) => {
                    if (e.kind === "google") {
                      const g = e.obj;
                      const t = g.start?.dateTime
                        ? `${new Date(g.start.dateTime).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} - ${new Date(g.end.dateTime).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`
                        : "Dia inteiro";
                      const blob = `${g.summary || ""} ${g.description || ""} ${(g.attendees||[]).map((a:any)=>`${a.email||""} ${a.displayName||""}`).join(" ")}`.toLowerCase();
                      const isWoba = blob.includes("woba");
                      const attendee = g.attendees?.find((a: any) => a.email && !a.email.includes("group.calendar")) || g.attendees?.[0];
                      const displayName = attendee?.displayName || attendee?.email || g.summary || "Google";
                      return (
                        <div key={idx} className="rounded-xl border p-3 border-l-4 border-l-[#4285F4]">
                          <div className="flex items-start gap-3">
                            <EventAvatar name={displayName} isWoba={isWoba} size={36} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {isWoba
                                  ? <Badge className="bg-pink-600 text-white">Woba</Badge>
                                  : <Badge className="bg-[#4285F4] text-white">Google Agenda</Badge>}
                                {g.location && <Badge variant="outline">{g.location}</Badge>}
                              </div>
                              <p className="font-heading font-bold">{g.summary || "(sem título)"}</p>
                              <p className="text-sm">{t}</p>
                              {g.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{g.description}</p>}
                              {g.htmlLink && (
                                <a href={g.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                                  Abrir no Google <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const isWobaRow = e.obj.origem === "woba";
                    return (
                      <div key={idx} className="rounded-xl border p-3">
                        <div className="flex items-start gap-3">
                          <EventAvatar name={e.obj.nome} isWoba={isWobaRow} photoUrl={e.obj.photo_url} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={`${STATUS_COLORS[e.obj.status]} text-white`}>{e.obj.status}</Badge>
                              <Badge variant="outline">{AMBIENTE_LABEL[e.obj.ambiente]}</Badge>
                              {e.kind === "contrato" && <Badge variant="secondary">{PLANO_LABEL[e.obj.plano_tipo]}</Badge>}
                              {isWobaRow && <Badge className="bg-pink-600 text-white">Woba</Badge>}
                              <div className="ml-auto flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver reserva completa" onClick={() => setFullView({ kind: e.kind, obj: e.obj })}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Excluir reserva"
                                  onClick={async () => {
                                    const handler = e.kind === "reserva" ? onDeleteReserva : onDeleteContrato;
                                    if (!handler) return;
                                    await handler(e.obj);
                                    setSelectedDay(undefined);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="font-heading font-bold">{e.obj.nome}</p>
                            <p className="text-xs text-muted-foreground">{e.obj.email} · {e.obj.telefone}</p>
                            {e.kind === "reserva" && <p className="text-sm mt-1">{e.obj.hora_inicio.slice(0,5)} - {e.obj.hora_fim.slice(0,5)}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhes completos da reserva/contrato */}
      <Dialog open={!!fullView} onOpenChange={(o) => !o && setFullView(null)}>
        <DialogContent className="max-w-lg">
          {fullView && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-3">
                  <EventAvatar name={fullView.obj.nome} isWoba={fullView.obj.origem === "woba"} photoUrl={fullView.obj.photo_url} size={40} />
                  <span>Reserva completa</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${STATUS_COLORS[fullView.obj.status]} text-white`}>{fullView.obj.status}</Badge>
                  <Badge variant="outline">{AMBIENTE_LABEL[fullView.obj.ambiente]}</Badge>
                  {fullView.kind === "contrato" && <Badge variant="secondary">{PLANO_LABEL[fullView.obj.plano_tipo]}</Badge>}
                  {fullView.obj.origem === "woba" && <Badge className="bg-blue-600 text-white">Woba</Badge>}
                </div>
                <div><b>Nome:</b> {fullView.obj.nome}</div>
                <div><b>Email:</b> {fullView.obj.email}</div>
                <div><b>Telefone:</b> {fullView.obj.telefone}</div>
                {fullView.kind === "reserva" ? (
                  <>
                    <div><b>Data:</b> {new Date(fullView.obj.data + "T00:00").toLocaleDateString("pt-BR")}</div>
                    <div><b>Horário:</b> {fullView.obj.hora_inicio.slice(0,5)} — {fullView.obj.hora_fim.slice(0,5)}</div>
                    <div><b>Tipo:</b> {fullView.obj.tipo}</div>
                  </>
                ) : (
                  <>
                    {fullView.obj.data_inicio && <div><b>Início:</b> {new Date(fullView.obj.data_inicio + "T00:00").toLocaleDateString("pt-BR")}</div>}
                    {fullView.obj.dias_selecionados?.length > 0 && (
                      <div><b>Dias:</b> {fullView.obj.dias_selecionados.map((d: string) => new Date(d + "T00:00").toLocaleDateString("pt-BR")).join(" · ")}</div>
                    )}
                    <div><b>Preço:</b> R$ {Number(fullView.obj.preco).toFixed(2)}</div>
                  </>
                )}
                {fullView.obj.observacoes && <div className="italic text-muted-foreground">"{fullView.obj.observacoes}"</div>}
                {fullView.obj.admin_notes && <div className="text-xs text-muted-foreground"><b>Notas admin:</b> {fullView.obj.admin_notes}</div>}
                <div className="text-[11px] text-muted-foreground pt-2 border-t">Criado em {new Date(fullView.obj.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline" size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  onClick={async () => {
                    const handler = fullView.kind === "reserva" ? onDeleteReserva : onDeleteContrato;
                    if (!handler) return;
                    await handler(fullView.obj);
                    setFullView(null);
                    setSelectedDay(undefined);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir reserva
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <NovaReservaDialog
        open={!!novaDay}
        onOpenChange={(o) => !o && setNovaDay(null)}
        date={novaDay}
        reservas={reservas}
        contratos={contratos}
        onCreated={() => { onCreated?.(); }}
      />

      <DayTimelineDialog
        day={timelineDay}
        onChangeDay={(d) => setTimelineDay(d)}
        onClose={() => setTimelineDay(null)}
        reservas={reservas}
        contratos={contratos}
        gEvents={gEvents.filter((g: any) => !deletedGoogleIds.has(g.id))}
        onDeleteReserva={onDeleteReserva}
        onDeleteContrato={onDeleteContrato}
      />
    </Card>
  );
}
