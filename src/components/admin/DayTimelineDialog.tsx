import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, DollarSign } from "lucide-react";
import EventAvatar from "./EventAvatar";
import { useClientColors } from "@/hooks/useClientColors";
import { getClientColor, readableTextOn, WOBA_COLOR } from "@/lib/clientColors";
import { linkCobrancaWhatsApp, calcularValorReserva, descricaoReserva, descricaoContrato, fmtBRL } from "@/lib/cobranca";

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500", aprovada: "bg-blue-500", confirmada: "bg-blue-500",
  paga: "bg-green-500", realizada: "bg-green-500",
  concluida: "bg-emerald-700", cancelada: "bg-red-500",
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Hora", diaria: "Diária", pacote: "Pacote 10", mensal: "Mensal",
};

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const AMBIENTE_BAR: Record<string, string> = {
  estacao: "bg-blue-500 border-blue-700",
  sala_privativa: "bg-purple-500 border-purple-700",
  sala_reuniao: "bg-orange-500 border-orange-700",
};

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const TOTAL_MIN = (CLOSE_HOUR - OPEN_HOUR) * 60;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtMin(m: number) { return `${pad(Math.floor(m/60))}:${pad(m%60)}`; }

type Bar = {
  kind: "reserva" | "contrato" | "google";
  obj: any;
  startMin: number; // relative to 00:00
  endMin: number;
  ambKey: string;   // rowKey: estacao|sala_privativa|sala_reuniao|contrato|google
  label: string;
  isWoba: boolean;
};

const ROWS: { key: string; label: string; color: string }[] = [
  { key: "estacao", label: "Estação", color: "bg-blue-500" },
  { key: "sala_privativa", label: "Sala Privativa", color: "bg-purple-500" },
  { key: "sala_reuniao", label: "Sala Reunião", color: "bg-orange-500" },
  { key: "contrato", label: "Contratos", color: "bg-emerald-600" },
  { key: "google", label: "Reservas Woba", color: "bg-pink-500" },
];

type Props = {
  day: Date | null;
  onChangeDay: (d: Date) => void;
  onClose: () => void;
  reservas: any[];
  contratos: any[];
  gEvents: any[];
  onDeleteReserva?: (r: any) => Promise<void> | void;
  onDeleteContrato?: (c: any) => Promise<void> | void;
};

export default function DayTimelineDialog({ day, onChangeDay, onClose, reservas, contratos, gEvents, onDeleteReserva, onDeleteContrato }: Props) {
  const [selected, setSelected] = useState<Bar | null>(null);
  const { overrides: colorOverrides } = useClientColors();

  const internalIds = useMemo(() => {
    const s = new Set<string>();
    reservas.forEach((r) => r.google_event_id && s.add(r.google_event_id));
    contratos.forEach((c) => c.google_event_id && s.add(c.google_event_id));
    return s;
  }, [reservas, contratos]);

  const bars = useMemo<Bar[]>(() => {
    if (!day) return [];
    const key = dayKey(day);
    const out: Bar[] = [];
    reservas.forEach((r) => {
      if (r.data !== key) return;
      const [h1, m1] = (r.hora_inicio || "09:00").split(":").map(Number);
      const [h2, m2] = (r.hora_fim || "10:00").split(":").map(Number);
      out.push({
        kind: "reserva", obj: r,
        startMin: h1 * 60 + m1, endMin: h2 * 60 + m2,
        ambKey: r.ambiente, label: r.nome.split(" ")[0],
        isWoba: r.origem === "woba",
      });
    });
    contratos.forEach((c) => {
      const dias: string[] = c.dias_selecionados || [];
      if (!dias.includes(key) && c.data_inicio !== key) return;
      out.push({
        kind: "contrato", obj: c,
        startMin: OPEN_HOUR * 60, endMin: CLOSE_HOUR * 60,
        ambKey: "contrato", label: `${c.nome.split(" ")[0]} · ${AMBIENTE_LABEL[c.ambiente] || c.ambiente}`,
        isWoba: c.origem === "woba",
      });
    });
    gEvents.forEach((g) => {
      if (g.status === "cancelled") return;
      if (internalIds.has(g.id)) return; // já representado como reserva/contrato interno
      const startStr: string | undefined = g.start?.dateTime || g.start?.date;
      if (!startStr || !startStr.startsWith(key)) return;
      const blob = `${g.summary||""} ${g.description||""}`.toLowerCase();
      const isWoba = blob.includes("woba");
      if (!isWoba) return; // apenas eventos da Woba entram nesta visão
      if (g.start?.dateTime) {
        const s = new Date(g.start.dateTime), e = new Date(g.end?.dateTime || g.start.dateTime);
        out.push({
          kind: "google", obj: g,
          startMin: s.getHours()*60+s.getMinutes(), endMin: e.getHours()*60+e.getMinutes(),
          ambKey: "google", label: g.summary || "(sem título)", isWoba: true,
        });
      } else {
        out.push({
          kind: "google", obj: g,
          startMin: OPEN_HOUR*60, endMin: CLOSE_HOUR*60,
          ambKey: "google", label: g.summary || "(dia inteiro)", isWoba: true,
        });
      }
    });
    return out;
  }, [day, reservas, contratos, gEvents]);

  function pctFromMin(m: number) {
    const rel = Math.max(0, Math.min(TOTAL_MIN, m - OPEN_HOUR * 60));
    return (rel / TOTAL_MIN) * 100;
  }

  function shift(delta: number) {
    if (!day) return;
    const d = new Date(day); d.setDate(d.getDate() + delta); onChangeDay(d);
  }

  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i);
  const isToday = day && dayKey(day) === dayKey(new Date());
  const nowLeft = isToday ? pctFromMin(new Date().getHours()*60 + new Date().getMinutes()) : -1;

  // agrupar bars por linha
  const byRow = ROWS.map((r) => ({ ...r, items: bars.filter((b) => b.ambKey === r.key) }));

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <Button size="icon" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="w-5 h-5" /></Button>
            <DialogTitle className="font-heading text-center flex-1 capitalize text-base">
              {day?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </DialogTitle>
            <Button size="icon" variant="ghost" onClick={() => shift(1)}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          <div className="min-w-[720px]">
            {/* Cabeçalho de horas */}
            <div className="flex sticky top-0 bg-background z-10 border-b">
              <div className="w-40 shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r">
                Ambiente
              </div>
              <div className="flex-1 relative">
                <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length - 1}, 1fr)` }}>
                  {hours.slice(0, -1).map((h) => (
                    <div key={h} className="border-r px-1 py-2 text-[10px] text-muted-foreground font-medium">
                      {pad(h)}:00
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Linhas por ambiente */}
            {byRow.map((row) => (
              <div key={row.key} className="flex border-b min-h-[64px] hover:bg-muted/30">
                <div className="w-40 shrink-0 px-3 py-2 border-r flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${row.color}`} />
                  <span className="text-sm font-medium">{row.label}</span>
                  {row.items.length > 0 && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{row.items.length}</span>
                  )}
                </div>
                <div className="flex-1 relative py-2">
                  {/* Grid de fundo */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${hours.length - 1}, 1fr)` }}>
                    {hours.slice(0, -1).map((h) => (
                      <div key={h} className="border-r border-border/50" />
                    ))}
                  </div>

                  {/* Barras */}
                  <div className="relative h-full min-h-[48px]">
                    {row.items.map((b, i) => {
                      const left = pctFromMin(b.startMin);
                      const width = Math.max(2, pctFromMin(b.endMin) - left);
                      const email = b.kind === "google" ? (b.obj.attendees?.[0]?.email as string | undefined) : b.obj.email;
                      const bg = b.isWoba || row.key === "google"
                        ? WOBA_COLOR
                        : getClientColor({ name: b.label, email, overrides: colorOverrides });
                      const fg = readableTextOn(bg);
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setSelected(b)}
                          className="absolute h-9 rounded-md border text-xs px-1.5 flex items-center gap-1 shadow-sm overflow-hidden text-left hover:brightness-110 hover:ring-2 hover:ring-white/60 cursor-pointer transition"
                          style={{ left: `${left}%`, width: `${width}%`, top: (i % 2) * 22, background: bg, color: fg, borderColor: "rgba(0,0,0,0.2)" }}
                          title={`${b.label} · ${fmtMin(b.startMin)}-${fmtMin(b.endMin)} — clique para detalhes`}
                        >
                          <EventAvatar name={b.label} isWoba={b.isWoba} photoUrl={b.kind !== "google" ? b.obj.photo_url : undefined} color={bg} size={18} />
                          <span className="font-medium truncate">{b.label}</span>
                          <span className="opacity-80 text-[10px] ml-auto shrink-0 pl-1 hidden sm:inline">
                            {fmtMin(b.startMin)}-{fmtMin(b.endMin)}
                          </span>
                        </button>
                      );
                    })}
                    {row.items.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/60">
                        livre
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Linha "agora" */}
            {nowLeft >= 0 && nowLeft <= 100 && (
              <div className="flex pointer-events-none">
                <div className="w-40 shrink-0" />
                <div className="flex-1 relative">
                  <div className="absolute -top-[calc(64px*5+40px)] bottom-0" style={{ left: `${nowLeft}%` }}>
                    <div className="w-px h-[calc(64px*5+40px)] bg-red-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legenda + lista rápida com detalhes */}
        <div className="border-t p-3 max-h-52 overflow-y-auto">
          {bars.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">Nenhum evento neste dia.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {bars.sort((a,b) => a.startMin - b.startMin).map((b, i) => {
                const email = b.kind === "google" ? (b.obj.attendees?.[0]?.email as string | undefined) : b.obj.email;
                const dot = b.isWoba || b.kind === "google" ? WOBA_COLOR : getClientColor({ name: b.obj.nome, email, overrides: colorOverrides });
                return (
                  <li key={i}>
                    <button type="button" onClick={() => setSelected(b)} className="w-full flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5 text-left">
                      <span className="font-mono text-muted-foreground w-24 shrink-0">{fmtMin(b.startMin)}–{fmtMin(b.endMin)}</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
                      <span className="font-medium truncate">{b.kind==="google" ? (b.obj.summary || "(sem título)") : b.obj.nome}</span>
                      <span className="text-muted-foreground truncate">
                        {b.kind === "reserva" && `· ${AMBIENTE_LABEL[b.ambKey]} · ${b.obj.tipo==="diaria" ? "Diária" : "Hora"}`}
                        {b.kind === "contrato" && `· ${AMBIENTE_LABEL[b.obj.ambiente]} · Contrato`}
                        {b.kind === "google" && "· Woba"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detalhes do evento clicado */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogScrollContent className="max-w-lg">
            {selected && (() => {
              const b = selected;
              const isGoogle = b.kind === "google";
              const nome = isGoogle ? (b.obj.summary || "Google") : b.obj.nome;
              const ambKey = b.kind === "reserva" ? b.ambKey : b.obj.ambiente;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-heading flex items-center gap-3">
                      <EventAvatar name={nome} isWoba={b.isWoba} photoUrl={!isGoogle ? b.obj.photo_url : undefined} size={40} />
                      <span className="truncate flex-1">Reserva completa</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {isGoogle
                        ? <Badge className="bg-pink-600 text-white">Reserva Woba</Badge>
                        : <>
                            <Badge className={`${STATUS_COLORS[b.obj.status] || "bg-secondary"} text-white`}>{b.obj.status}</Badge>
                            <Badge variant="outline">{AMBIENTE_LABEL[ambKey]}</Badge>
                            {b.kind === "contrato" && <Badge variant="secondary">{PLANO_LABEL[b.obj.plano_tipo]}</Badge>}
                            {b.kind === "reserva" && <Badge variant="secondary">{b.obj.tipo === "diaria" ? "Diária" : "Hora"}</Badge>}
                          </>}
                      {b.isWoba && <Badge className="bg-pink-600 text-white">Woba</Badge>}
                    </div>
                    <div><b>Nome:</b> {nome}</div>
                    {!isGoogle && <div><b>Email:</b> {b.obj.email}</div>}
                    {!isGoogle && <div><b>Telefone:</b> {b.obj.telefone}</div>}
                    {b.kind === "reserva" && (
                      <>
                        <div><b>Data:</b> {new Date(b.obj.data + "T00:00").toLocaleDateString("pt-BR")}</div>
                        <div><b>Horário:</b> {b.obj.hora_inicio.slice(0,5)} — {b.obj.hora_fim.slice(0,5)}</div>
                        <div><b>Tipo:</b> {b.obj.tipo}</div>
                      </>
                    )}
                    {b.kind === "contrato" && (
                      <>
                        {b.obj.data_inicio && <div><b>Início:</b> {new Date(b.obj.data_inicio + "T00:00").toLocaleDateString("pt-BR")}</div>}
                        {b.obj.dias_selecionados?.length > 0 && (
                          <div><b>Dias:</b> {b.obj.dias_selecionados.map((d: string) => new Date(d + "T00:00").toLocaleDateString("pt-BR")).join(" · ")}</div>
                        )}
                        <div><b>Preço:</b> R$ {Number(b.obj.preco).toFixed(2)}</div>
                      </>
                    )}
                    {isGoogle && (
                      <>
                        <div><b>Horário:</b> {fmtMin(b.startMin)} — {fmtMin(b.endMin)}</div>
                        {b.obj.location && <div><b>Local:</b> {b.obj.location}</div>}
                        {b.obj.description && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{b.obj.description}</div>}
                      </>
                    )}
                    {!isGoogle && b.obj.observacoes && <div className="italic text-muted-foreground">"{b.obj.observacoes}"</div>}
                    {!isGoogle && b.obj.admin_notes && <div className="text-xs text-muted-foreground"><b>Notas admin:</b> {b.obj.admin_notes}</div>}
                    {!isGoogle && (
                      <div className="text-[11px] text-muted-foreground pt-2 border-t">
                        Criado em {new Date(b.obj.created_at).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 mt-2">
                    {isGoogle && b.obj.htmlLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={b.obj.htmlLink} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Abrir no Google
                        </a>
                      </Button>
                    )}
                    {!isGoogle && (() => {
                      const valor = b.kind === "reserva"
                        ? calcularValorReserva(b.obj)
                        : Number(b.obj.preco || 0);
                      const desc = b.kind === "reserva" ? descricaoReserva(b.obj) : descricaoContrato(b.obj);
                      const href = linkCobrancaWhatsApp({
                        nome: b.obj.nome, telefone: b.obj.telefone,
                        valor, descricao: desc,
                      });
                      return (
                        <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe57] text-white" asChild>
                          <a href={href} target="_blank" rel="noreferrer">
                            <DollarSign className="w-4 h-4 mr-1" /> Cobrar {fmtBRL(valor)}
                          </a>
                        </Button>
                      );
                    })()}
                    {!isGoogle && (
                      <Button
                        variant="outline" size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                        onClick={async () => {
                          const handler = b.kind === "reserva" ? onDeleteReserva : onDeleteContrato;
                          if (!handler) return;
                          await handler(b.obj);
                          setSelected(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir reserva
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogScrollContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
