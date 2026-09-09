import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, LogOut, ExternalLink, Copy, Home, CalendarPlus, ArrowRight, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isBusinessDay, isHoliday, getDateInfo } from "@/lib/holidays";

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

function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d; }

export default function Painel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const [cliente, setCliente] = useState<any>(null);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [accessBlocked, setAccessBlocked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth?redirect=/painel"); return; }
      setUser(session.user);
      const { data: clienteData } = await (supabase.from("clientes_corp") as any).select("*, unidades(nome), planos(nome), salas(nome)").eq("user_id", session.user.id).maybeSingle();
      if (clienteData && clienteData.status_acesso !== "aprovado") {
        setAccessBlocked(clienteData.status_acesso === "recusado" ? "Seu cadastro foi recusado. Entre em contato com a equipe." : "Seu cadastro está em análise. A equipe liberará o acesso após revisar seus dados.");
        setLoading(false);
        return;
      }
      setCliente(clienteData);
      const [c, r, f, v] = await Promise.all([
        supabase.from("contract_requests").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
        supabase.from("reservations").select("*").eq("email", session.user.email!).order("data", { ascending: false }),
        clienteData ? supabase.from("funcionarios_cliente").select("*").eq("cliente_corp_id", clienteData.id) : Promise.resolve({ data: [] } as any),
        clienteData ? supabase.from("visitantes").select("*, salas(nome)").eq("cliente_corp_id", clienteData.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] } as any),
      ]);
      if (c.error) toast({ title: "Erro", description: c.error.message, variant: "destructive" });
      else setContratos(c.data || []);
      if (!r.error) setReservas(r.data || []);
      setFuncionarios(f.data || []);
      setVisitantes(v.data || []);
      setLoading(false);
    })();
  }, [navigate]);

  // Aggregate dates that have anything from the user
  const eventsByDay = useMemo(() => {
    const map = new Map<string, { contratos: any[]; reservas: any[] }>();
    const push = (key: string, kind: "contratos" | "reservas", obj: any) => {
      if (!map.has(key)) map.set(key, { contratos: [], reservas: [] });
      map.get(key)![kind].push(obj);
    };
    contratos.forEach((c) => {
      const dias: string[] = c.dias_selecionados || [];
      dias.forEach((d: string) => push(d, "contratos", c));
      if (c.data_inicio && !dias.includes(c.data_inicio)) push(c.data_inicio, "contratos", c);
    });
    reservas.forEach((r) => push(r.data, "reservas", r));
    return map;
  }, [contratos, reservas]);

  const eventDates = useMemo(
    () => Array.from(eventsByDay.keys()).map((k) => new Date(k + "T00:00")),
    [eventsByDay]
  );

  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`
    : "";
  const selectedInfo = selectedKey ? eventsByDay.get(selectedKey) : undefined;
  const selectedIsBusiness = selectedDay ? isBusinessDay(selectedDay) : false;
  const selectedInPast = selectedDay ? selectedDay < todayStart() : false;

  async function logout() { await supabase.auth.signOut(); navigate("/auth"); }
  function copyPix(code: string) { navigator.clipboard.writeText(code); toast({ title: "Código PIX copiado" }); }

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
          <TabsList className="mb-6">
            <TabsTrigger value="empresa">Minha empresa</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="lista">Minhas solicitações ({contratos.length})</TabsTrigger>
            <TabsTrigger value="canceladas">
              Canceladas ({contratos.filter((c) => c.status === "cancelada").length + reservas.filter((r) => r.status === "cancelada").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2"><h2 className="font-heading font-black text-xl mb-3">{cliente?.razao_social || "Empresa vinculada"}</h2><div className="grid gap-2 text-sm"><p><span className="text-muted-foreground">Responsável:</span> {cliente?.responsavel_nome || "-"}</p><p><span className="text-muted-foreground">E-mail:</span> {cliente?.responsavel_email || user?.email}</p><p><span className="text-muted-foreground">WhatsApp:</span> {cliente?.responsavel_telefone || "-"}</p><p><span className="text-muted-foreground">Unidade:</span> {cliente?.unidades?.nome || "-"}</p><p><span className="text-muted-foreground">Plano:</span> {cliente?.planos?.nome || "-"} · <span className="text-muted-foreground">Sala:</span> {cliente?.salas?.nome || "-"}</p></div></Card>
              <Card className="p-5"><h3 className="font-heading font-bold mb-3">Colaboradores ({funcionarios.length})</h3>{funcionarios.length ? <div className="space-y-2">{funcionarios.map(f => <div key={f.id} className="border-b pb-2 text-sm"><p className="font-medium">{f.nome}</p><p className="text-xs text-muted-foreground">{f.cargo || f.email || f.telefone || "Colaborador autorizado"}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>}</Card>
              <Card className="p-5 lg:col-span-3"><h3 className="font-heading font-bold mb-3">Visitantes ({visitantes.length})</h3>{visitantes.length ? <div className="grid gap-2 sm:grid-cols-2">{visitantes.map(v => <div key={v.id} className="border rounded-lg p-3 text-sm"><p className="font-medium">{v.nome}</p><p className="text-xs text-muted-foreground">{v.salas?.nome || "Sem sala"}{v.data_hora_prevista ? ` · ${new Date(v.data_hora_prevista).toLocaleString("pt-BR")}` : ""}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum visitante registrado.</p>}</Card>
            </div>
          </TabsContent>

          {/* CALENDÁRIO — estilo Google Calendar (mês maximizado) */}
          <TabsContent value="calendario">
            <GoogleStyleCalendar
              month={month}
              setMonth={setMonth}
              eventsByDay={eventsByDay}
              onSelectDay={setSelectedDay}
            />

            <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(undefined)}>
              <DialogContent className="max-w-lg">
                {selectedDay && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="font-heading">
                        <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                          {selectedDay.toLocaleDateString("pt-BR", { weekday: "long" })}
                        </span>
                        <span className="text-2xl font-black">
                          {selectedDay.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </DialogTitle>
                    </DialogHeader>

                    {selectedIsBusiness && !selectedInPast && (
                      <InlineReservaForm
                        user={user}
                        date={selectedDay}
                        onDone={(newContrato) => {
                          setContratos((prev) => [newContrato, ...prev]);
                          setSelectedDay(undefined);
                        }}
                      />
                    )}
                    {!selectedIsBusiness && (
                      <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        Este dia não está disponível para reserva (final de semana ou feriado).
                      </div>
                    )}
                    {selectedIsBusiness && selectedInPast && (
                      <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        Data no passado — não é possível criar reserva.
                      </div>
                    )}

                    {selectedInfo && (selectedInfo.contratos.length > 0 || selectedInfo.reservas.length > 0) ? (
                      <div className="space-y-3 mt-2 max-h-[50vh] overflow-y-auto">
                        {selectedInfo.contratos.map((c) => (
                          <div key={c.id} className="rounded-xl border border-border p-3">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={`${STATUS_STYLE[c.status]} text-white`}>{STATUS_LABEL[c.status] || c.status}</Badge>
                              <Badge variant="outline">{AMBIENTE_LABEL[c.ambiente]}</Badge>
                              <Badge variant="secondary">{PLANO_LABEL[c.plano_tipo]}</Badge>
                              <span className="ml-auto font-heading font-black">{fmtBRL(Number(c.preco))}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Dia incluído no seu plano</p>
                          </div>
                        ))}
                        {selectedInfo.reservas.map((r) => (
                          <div key={r.id} className="rounded-xl border border-border p-3">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className="bg-blue-500 text-white">{r.status}</Badge>
                              <Badge variant="outline">{AMBIENTE_LABEL[r.ambiente]}</Badge>
                            </div>
                            <p className="text-sm">{r.hora_inicio.slice(0,5)} - {r.hora_fim.slice(0,5)}</p>
                          </div>
                        ))}
                      </div>
                    ) : selectedIsBusiness && !selectedInPast ? (
                      <p className="text-sm text-muted-foreground">Nada agendado para este dia.</p>
                    ) : null}
                  </>
                )}
              </DialogContent>
            </Dialog>
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
      </main>
    </div>
  );
}

/* ============ GOOGLE-CALENDAR-STYLE MONTH VIEW ============ */
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function GoogleStyleCalendar({
  month, setMonth, eventsByDay, onSelectDay,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  eventsByDay: Map<string, { contratos: any[]; reservas: any[] }>;
  onSelectDay: (d: Date) => void;
}) {
  const today = todayStart();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay()); // back to Sunday
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const goPrev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () => setMonth(new Date());

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="rounded-full font-heading font-bold">Hoje</Button>
          <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-5 h-5" /></Button>
          <h2 className="font-heading font-black text-2xl ml-2 capitalize">
            {MONTH_NAMES[month.getMonth()]} <span className="text-muted-foreground font-bold">{month.getFullYear()}</span>
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-secondary" />Suas reservas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/30" /><span className="text-red-600 font-bold">Feriado</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted" />Fim de semana</span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b bg-brand-blue-dark">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-[11px] font-heading font-bold tracking-widest text-white text-center">
            {w}
          </div>
        ))}
      </div>

      {/* Grid — 6 rows × 7 cols, maximized */}
      <div className="grid grid-cols-7 grid-rows-6 h-[calc(100vh-260px)] min-h-[600px]">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = d.getTime() === today.getTime();
          const business = isBusinessDay(d);
          const holiday = isHoliday(d);
          const dateInfo = getDateInfo(d);
          const isPast = d < today;
          const key = dayKey(d);
          const info = eventsByDay.get(key);
          const events = [
            ...(info?.contratos.map((c) => ({ kind: "contrato" as const, obj: c })) || []),
            ...(info?.reservas.map((r) => ({ kind: "reserva" as const, obj: r })) || []),
          ];
          const isSunday = i % 7 === 0;
          const isLastRow = i >= 35;

          return (
            <button
              key={i}
              onClick={() => onSelectDay(new Date(d))}
              className={[
                "text-left p-1.5 border-border transition-colors relative flex flex-col gap-1 overflow-hidden",
                !isSunday && "border-l",
                !isLastRow && "border-b",
                inMonth ? "bg-card" : "bg-muted/60",
                holiday && inMonth && "bg-red-500/15",
                !business && !holiday && inMonth && "bg-secondary/5",
                "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary",
              ].filter(Boolean).join(" ")}
              title={dateInfo?.name}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    "text-sm font-heading font-black w-7 h-7 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground shadow-md",
                    !isToday && holiday && inMonth && "text-red-700",
                    !isToday && !holiday && !inMonth && "text-muted-foreground/60",
                    !isToday && !holiday && inMonth && isPast && "text-muted-foreground",
                    !isToday && !holiday && inMonth && !isPast && "text-foreground",
                  ].filter(Boolean).join(" ")}
                >
                  {d.getDate()}
                </span>
              </div>

              {dateInfo && (
                <div
                  className={`text-[10px] leading-tight px-1 truncate font-heading font-bold ${
                    dateInfo.holiday ? "text-red-600" : "text-muted-foreground"
                  }`}
                  title={dateInfo.name}
                >
                  {dateInfo.name}
                </div>
              )}

              <div className="flex-1 space-y-1 overflow-hidden">
                {events.slice(0, 3).map((e, idx) => {
                  const label = e.kind === "contrato"
                    ? `${PLANO_LABEL[e.obj.plano_tipo] || ""} · ${AMBIENTE_LABEL[e.obj.ambiente] || ""}`
                    : `${e.obj.hora_inicio?.slice(0,5)} ${AMBIENTE_LABEL[e.obj.ambiente] || ""}`;
                  const color = e.kind === "contrato"
                    ? (STATUS_STYLE[e.obj.status] || "bg-secondary")
                    : "bg-blue-500";
                  return (
                    <div
                      key={idx}
                      className={`${color} text-white text-[10px] leading-tight rounded px-1.5 py-0.5 truncate font-medium`}
                      title={label}
                    >
                      {label}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{events.length - 3} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ============ INLINE RESERVATION FORM (dentro do modal do dia) ============ */
function InlineReservaForm({
  user, date, onDone,
}: {
  user: any;
  date: Date;
  onDone: (novo: any) => void;
}) {
  const [ambiente, setAmbiente] = useState<string>("estacao");
  const [plano, setPlano] = useState<string>("diaria");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const preco = PRICING[ambiente]?.[plano] ?? null;
  const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

  async function submit() {
    if (preco === null) {
      toast({ title: "Combinação indisponível", description: "Este plano não está disponível para esse ambiente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      user_id: user.id,
      nome: user.user_metadata?.nome || user.email,
      email: user.email,
      telefone: user.user_metadata?.telefone || null,
      nicho: user.user_metadata?.nicho || null,
      ambiente,
      plano_tipo: plano,
      preco,
      data_inicio: dateKey,
      dias_selecionados: [dateKey],
      observacoes: plano === "hora" ? `Horário solicitado: ${horaInicio} - ${horaFim}` : null,
      status: "pendente",
    };
    const { data, error } = await supabase.from("contract_requests").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação enviada!", description: "Aguarde a aprovação do admin." });
    onDone(data);
  }

  return (
    <div className="rounded-2xl border border-border p-4 space-y-4 bg-muted/20">
      <div>
        <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">Qual espaço?</p>
        <div className="grid grid-cols-3 gap-2">
          {AMBIENTES.map((a) => (
            <button
              key={a}
              onClick={() => setAmbiente(a)}
              className={`text-xs font-heading font-bold rounded-xl p-2 border transition ${
                ambiente === a
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card hover:bg-accent/50 border-border"
              }`}
            >
              {AMBIENTE_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">Qual formato?</p>
        <div className="grid grid-cols-2 gap-2">
          {PLANOS.map((p) => {
            const price = PRICING[ambiente]?.[p];
            const disabled = price === null;
            return (
              <button
                key={p}
                disabled={disabled}
                onClick={() => setPlano(p)}
                className={`text-left rounded-xl p-3 border transition ${
                  disabled
                    ? "opacity-40 cursor-not-allowed bg-muted"
                    : plano === p
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-card hover:bg-accent/50 border-border"
                }`}
              >
                <div className="text-xs font-heading font-bold">{PLANO_LABEL[p]}</div>
                <div className="text-sm font-black mt-0.5">
                  {price === null ? "Indisponível" : fmtBRL(price)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {plano === "hora" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-heading font-bold">
            Início
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-heading font-bold">
            Fim
            <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          </label>
        </div>
      )}

      {(plano === "pacote" || plano === "mensal") && (
        <p className="text-[11px] text-muted-foreground">
          Você está solicitando o início do plano nesta data. Os demais dias serão combinados com o admin após a aprovação.
        </p>
      )}

      <Button
        onClick={submit}
        disabled={saving || preco === null}
        className="w-full rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
        Enviar solicitação {preco !== null && `— ${fmtBRL(preco)}`}
      </Button>
    </div>
  );
}


