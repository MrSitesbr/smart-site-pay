import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ImageOff, Plus, Pencil, Trash2 } from "lucide-react";
import { getClientColor, readableTextOn } from "@/lib/clientColors";

type Sala = { id: string; nome: string; unidade_id: string | null; foto_url: string | null; unidadeNome: string; abertura: number; fechamento: number };

const ROW_H = 44; // px por hora
const toMin = (t?: string | null) => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AdminRoomDayGantt({
  day, onChangeDay, onClose, reservas, unidadeId, salaId, onEditReserva, onDeleteReserva, onNovaReserva,
}: {
  day: Date;
  onChangeDay: (d: Date) => void;
  onClose: () => void;
  reservas: any[];
  unidadeId: string;
  salaId: string;
  onEditReserva: (r: any) => void;
  onDeleteReserva?: (r: any) => Promise<void> | void;
  onNovaReserva: (d: Date) => void;
}) {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [sel, setSel] = useState<any | null>(null);

  useEffect(() => {
    let q = supabase.from("salas").select("id, nome, unidade_id, foto_url, unidades(nome, horario_abertura, horario_fechamento)").order("nome");
    if (unidadeId !== "todas") q = q.eq("unidade_id", unidadeId);
    q.then(({ data }) => setSalas((data || []).map((s: any) => ({
      id: s.id, nome: s.nome, unidade_id: s.unidade_id, foto_url: s.foto_url,
      unidadeNome: s.unidades?.nome || "",
      abertura: toMin(s.unidades?.horario_abertura || "08:00"),
      fechamento: toMin(s.unidades?.horario_fechamento || "20:00"),
    }))));
  }, [unidadeId]);

  const key = dayKey(day);
  const doDia = useMemo(() => reservas.filter((r) => r.data === key && r.status !== "cancelada"), [reservas, key]);

  const colunas = useMemo(() => {
    let cols = salaId === "todas" ? salas : salas.filter((s) => s.id === salaId);
    const semSala = doDia.filter((r) => !r.sala_id || !salas.some((s) => s.id === r.sala_id));
    if (salaId === "todas" && semSala.length) cols = [...cols, { id: "__sem", nome: "Sem sala definida", unidade_id: null, foto_url: null, unidadeNome: "", abertura: 480, fechamento: 1200 }];
    return cols;
  }, [salas, salaId, doDia]);

  const inicio = colunas.length ? Math.floor(Math.min(...colunas.map((c) => c.abertura)) / 60) * 60 : 480;
  const fim = colunas.length ? Math.ceil(Math.max(...colunas.map((c) => c.fechamento)) / 60) * 60 : 1200;
  const horas: number[] = [];
  for (let m = inicio; m < fim; m += 60) horas.push(m);

  const reservasDaColuna = (id: string) => doDia.filter((r) => id === "__sem" ? (!r.sala_id || !salas.some((s) => s.id === r.sala_id)) : r.sala_id === id);
  const shift = (n: number) => { const d = new Date(day); d.setDate(d.getDate() + n); onChangeDay(d); };
  const cols = `64px repeat(${colunas.length}, minmax(150px, 1fr))`;

  return (
    <div className="mt-4 rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Dia anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <p className="text-sm font-bold capitalize">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
          <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Próximo dia"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onNovaReserva(day)}><Plus className="mr-1 h-4 w-4" />Nova reserva</Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {colunas.length === 0 ? (
        <div className="m-4 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma sala encontrada neste filtro.</div>
      ) : (
        <div className="max-h-[620px] overflow-auto">
          <div className="min-w-[680px]">
            <div className="sticky top-0 z-20 grid border-b-2 bg-muted" style={{ gridTemplateColumns: cols }}>
              <div className="flex items-center px-2 py-2 text-xs font-bold">Hora</div>
              {colunas.map((s) => (
                <div key={s.id} className="border-l-2 px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-11 shrink-0 overflow-hidden rounded border bg-background">
                      {s.foto_url ? <img src={s.foto_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold sm:text-sm">{s.nome}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{s.unidadeNome}</p>
                    </div>
                  </div>
                  {s.id !== "__sem" && <p className="mt-1 text-center text-[10px] text-muted-foreground">{fmt(s.abertura)}–{fmt(s.fechamento)}</p>}
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: cols }}>
              <div>
                {horas.map((h, i) => (
                  <div key={h} className={`flex items-center border-b border-r px-2 text-[11px] font-bold ${i % 2 ? "bg-muted/30" : ""}`} style={{ height: ROW_H }}>{fmt(h)}</div>
                ))}
              </div>
              {colunas.map((s) => (
                <div key={s.id} className="relative border-l" style={{ height: horas.length * ROW_H }}>
                  {horas.map((h, i) => {
                    const fechado = s.id !== "__sem" && (h < s.abertura || h + 60 > s.fechamento);
                    return (
                      <div key={h} onClick={() => !fechado && onNovaReserva(day)}
                        className={`border-b ${fechado ? "bg-muted" : `cursor-pointer hover:bg-primary/10 ${i % 2 ? "bg-muted/30" : ""}`}`}
                        style={{ height: ROW_H }} title={fechado ? "Fora do expediente" : "Clique para nova reserva"} />
                    );
                  })}
                  {reservasDaColuna(s.id).map((r) => {
                    const a = Math.max(toMin(r.hora_inicio), inicio);
                    const b = Math.min(toMin(r.hora_fim), fim);
                    if (b <= a) return null;
                    const bg = getClientColor({ name: r.nome, email: r.email });
                    return (
                      <button key={r.id} type="button" onClick={() => setSel(r)}
                        className="absolute left-1 right-1 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[10px] font-semibold shadow"
                        style={{ top: ((a - inicio) / 60) * ROW_H + 1, height: ((b - a) / 60) * ROW_H - 2, background: bg, color: readableTextOn(bg) }}
                        title={`${r.nome} · ${r.hora_inicio?.slice(0, 5)}–${r.hora_fim?.slice(0, 5)} · ${r.status}`}>
                        <p className="truncate">{r.nome}</p>
                        <p className="truncate opacity-80">{r.hora_inicio?.slice(0, 5)}–{r.hora_fim?.slice(0, 5)} · {r.status}</p>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {sel && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
          <div>
            <p className="font-bold">{sel.nome}</p>
            <p className="text-xs text-muted-foreground">{sel.email} · {sel.telefone} · {sel.hora_inicio?.slice(0, 5)}–{sel.hora_fim?.slice(0, 5)} · {sel.status}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { onEditReserva(sel); setSel(null); }}><Pencil className="mr-1 h-4 w-4" />Editar / trocar cliente</Button>
            {onDeleteReserva && <Button size="sm" variant="destructive" onClick={async () => { await onDeleteReserva(sel); setSel(null); }}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>}
            <Button size="icon" variant="ghost" onClick={() => setSel(null)} aria-label="Fechar detalhes"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
