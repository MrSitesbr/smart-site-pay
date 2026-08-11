import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  WOBA_NIVEIS, WOBA_SALA_TIERS, WobaSalaTier, WOBA_REPASSE_PRIVATIVO_HORA,
  valorDayPassPorNivel, dataPrevistaPagamento, fmtBRL,
} from "@/lib/woba";
import {
  loadWobaCfg, WOBA_LS_KEY, mapGoogleEventsToWoba, fetchWobaEventsYear,
  type WobaEvento, type WobaProduto,
} from "@/lib/wobaEvents";
import { Save, Download, CheckCircle2, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { invokeGoogleSync } from "@/lib/googleSync";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Closing = {
  id: string; ano: number; mes: number; nivel_repasse: number;
  valor_total: number; valor_repasse: number; qtd_reservas: number;
  data_prevista: string | null; data_pagamento: string | null;
  status: string; observacoes: string | null;
};

const PRODUTO_LABEL: Record<WobaProduto, string> = {
  day_pass: "Day Pass",
  sala_reuniao: "Sala de Reunião",
  privativo: "Sala Privativa / Evento",
};


export default function AdminWobaRepasses(_: { reservas: any[]; contratos: any[] }) {
  const now = new Date();
  const [cfg, setCfg] = useState(loadWobaCfg);
  const [nivel, setNivel] = useState<number>(1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [closings, setClosings] = useState<Closing[]>([]);
  const [loading, setLoading] = useState(false);
  const [gEvents, setGEvents] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(WOBA_LS_KEY, JSON.stringify(cfg)); }, [cfg]);


  async function fetchClosings() {
    setLoading(true);
    const { data, error } = await (supabase.from("woba_closings") as any)
      .select("*").eq("ano", year).order("mes");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setClosings((data || []) as Closing[]);
    setLoading(false);
  }
  useEffect(() => { fetchClosings(); /* eslint-disable-next-line */ }, [year]);

  async function fetchGoogle() {
    setGLoading(true); setGError(null);
    try {
      const timeMin = new Date(year, 0, 1).toISOString();
      const timeMax = new Date(year + 1, 0, 1).toISOString();
      const { data, error } = await invokeGoogleSync({ action: "list_events", timeMin, timeMax, calendarId: cfg.calendarId || "primary" },
      });
      if (error) throw error;
      setGEvents((data as any)?.events || []);
    } catch (e: any) {
      setGError(e?.message || "Falha ao carregar eventos");
      setGEvents([]);
    } finally { setGLoading(false); }
  }
  useEffect(() => { fetchGoogle(); /* eslint-disable-next-line */ }, [year, cfg.calendarId]);

  const wobaEventos: WobaEvento[] = useMemo(
    () => mapGoogleEventsToWoba(gEvents, cfg, nivel),
    [gEvents, cfg, nivel],
  );


  // Agregação por mês
  const porMes = useMemo(() => {
    const arr = new Array(12).fill(0).map(() => ({
      qtd: 0, dayPass: 0, salaReuniao: 0, privativo: 0,
      bruto: 0, repasse: 0,
    }));
    wobaEventos.forEach((e) => {
      if (e.start.getFullYear() !== year) return;
      const m = e.start.getMonth();
      arr[m].qtd++;
      arr[m].bruto += e.valor;
      arr[m].repasse += e.repasse;
      if (e.produto === "day_pass") arr[m].dayPass++;
      else if (e.produto === "sala_reuniao") arr[m].salaReuniao++;
      else arr[m].privativo++;
    });
    return arr;
  }, [wobaEventos, year]);

  const totalAno = useMemo(() => ({
    qtd: porMes.reduce((s, m) => s + m.qtd, 0),
    bruto: porMes.reduce((s, m) => s + m.bruto, 0),
    repasse: porMes.reduce((s, m) => s + m.repasse, 0),
    pago: closings.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor_repasse), 0),
    aReceber: closings.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor_repasse), 0),
  }), [porMes, closings]);

  function findClosing(m: number) { return closings.find((c) => c.mes === m + 1); }

  async function saveFechamento(m: number) {
    const agg = porMes[m];
    const prev = dataPrevistaPagamento(year, m);
    const payload = {
      ano: year, mes: m + 1, nivel_repasse: nivel,
      valor_total: agg.bruto,
      valor_repasse: agg.repasse,
      qtd_reservas: agg.qtd,
      data_prevista: prev.toISOString().slice(0, 10),
      status: findClosing(m)?.status || "a_receber",
    };
    const existing = findClosing(m);
    const q = existing
      ? (supabase.from("woba_closings") as any).update(payload).eq("id", existing.id)
      : (supabase.from("woba_closings") as any).insert(payload);
    const { error } = await q;
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Fechamento salvo" }); fetchClosings(); }
  }

  async function updateClosing(id: string, patch: Partial<Closing>) {
    const { error } = await (supabase.from("woba_closings") as any).update(patch).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchClosings();
  }

  async function fecharTodos() {
    for (let m = 0; m < 12; m++) {
      if (porMes[m].qtd === 0 && !findClosing(m)) continue;
      await saveFechamento(m);
    }
    toast({ title: "Todos os meses atualizados" });
  }

  function exportCSV() {
    const rows = [["Mês","Produto","Cliente","Início","Fim","Horas","Critério","Base Woba","Repasse","Prev. pagamento"]];
    wobaEventos
      .filter((e) => e.start.getFullYear() === year)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .forEach((e) => {
        rows.push([
          MESES[e.start.getMonth()],
          PRODUTO_LABEL[e.produto],
          e.cliente || e.title,
          e.start.toLocaleString("pt-BR"),
          e.end.toLocaleString("pt-BR"),
          e.horas.toFixed(1),
          e.criterio,
          e.valor.toFixed(2),
          e.repasse.toFixed(2),
          dataPrevistaPagamento(year, e.start.getMonth()).toISOString().slice(0, 10),
        ]);
      });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `woba_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);
  const [openMes, setOpenMes] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-orange-500/5 to-blue-500/5 border-orange-500/20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Repasse Woba · via Google Agenda</p>
            <p className="font-heading font-black text-lg">Fechamento mensal — {year}</p>
            <p className="text-xs text-muted-foreground">
              Day Pass: <b>{fmtBRL(valorDayPassPorNivel(nivel))}</b>/reserva · Sala de Reunião ({WOBA_SALA_TIERS[cfg.salaTier].label}): <b>{fmtBRL(WOBA_SALA_TIERS[cfg.salaTier].hora)}</b>/h ou <b>{fmtBRL(WOBA_SALA_TIERS[cfg.salaTier].diaria)}</b>/diária · Sala Privativa: <b>{fmtBRL(Number(cfg.repasseHoraPrivativo || WOBA_REPASSE_PRIVATIVO_HORA))}</b>/hora.
              Pagamento no 5º dia útil do 2º mês subsequente.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Nível</label>
              <Select value={String(nivel)} onValueChange={(v) => setNivel(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WOBA_NIVEIS.map((n) => (
                    <SelectItem key={n.nivel} value={String(n.nivel)}>
                      N{n.nivel} — {fmtBRL(n.valor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Ano</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchGoogle} disabled={gLoading} className="mt-4">
              <RefreshCw className={`w-4 h-4 mr-2 ${gLoading ? "animate-spin" : ""}`} /> Atualizar agenda
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Calendário (ID)</label>
            <Input value={cfg.calendarId} onChange={(e) => setCfg({ ...cfg, calendarId: e.target.value })} placeholder="primary ou id@group.calendar.google.com" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Filtro Woba (palavra-chave)</label>
            <Input value={cfg.filtro} onChange={(e) => setCfg({ ...cfg, filtro: e.target.value })} placeholder='ex.: "woba"' />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tamanho Sala Reunião</label>
            <Select value={cfg.salaTier} onValueChange={(v) => setCfg({ ...cfg, salaTier: v as WobaSalaTier })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(WOBA_SALA_TIERS) as WobaSalaTier[]).map((k) => (
                  <SelectItem key={k} value={k}>{WOBA_SALA_TIERS[k].label} — {fmtBRL(WOBA_SALA_TIERS[k].hora)}/h · {fmtBRL(WOBA_SALA_TIERS[k].diaria)}/dia</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Repasse/h Sala Privativa</label>
            <Input type="number" value={cfg.repasseHoraPrivativo} onChange={(e) => setCfg({ ...cfg, repasseHoraPrivativo: Number(e.target.value) })} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Os eventos Woba não precisam conter valores: o fechamento identifica o produto agendado e aplica a tabela de repasse pela duração da reserva.
        </p>
        {gError && <p className="text-xs text-red-600 mt-2">Google Agenda: {gError}</p>}
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase font-bold text-muted-foreground">Eventos Woba</p>
          <p className="font-heading font-black text-2xl">{totalAno.qtd}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase font-bold text-muted-foreground">Base Woba</p>
          <p className="font-heading font-black text-2xl">{fmtBRL(totalAno.bruto)}</p>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-500/30">
          <p className="text-xs uppercase font-bold text-muted-foreground">Repasse (Pago)</p>
          <p className="font-heading font-black text-2xl text-green-700">{fmtBRL(totalAno.pago)}</p>
        </Card>
        <Card className="p-4 bg-yellow-500/5 border-yellow-500/30">
          <p className="text-xs uppercase font-bold text-muted-foreground">A receber</p>
          <p className="font-heading font-black text-2xl text-yellow-700">{fmtBRL(totalAno.aReceber)}</p>
        </Card>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
        <Button size="sm" onClick={fecharTodos}><Save className="w-4 h-4 mr-2" /> Gerar/atualizar todos</Button>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-heading font-bold">Mês</th>
              <th className="p-3 font-heading font-bold">Eventos</th>
              <th className="p-3 font-heading font-bold">Base Woba</th>
              <th className="p-3 font-heading font-bold">Repasse Woba</th>
              <th className="p-3 font-heading font-bold">Prev. pagamento</th>
              <th className="p-3 font-heading font-bold">Status</th>
              <th className="p-3 font-heading font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {porMes.map((agg, m) => {
              const c = findClosing(m);
              const prev = c?.data_prevista ? new Date(c.data_prevista + "T00:00") : dataPrevistaPagamento(year, m);
              const isEmpty = agg.qtd === 0 && !c;
              const open = openMes === m;
              return (
                <React.Fragment key={m}>
                  <tr className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setOpenMes(open ? null : m)}>
                    <td className="p-3 font-heading font-bold">{MESES[m]}</td>
                    <td className="p-3">
                      {agg.qtd}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({agg.dayPass}d · {agg.salaReuniao}r · {agg.privativo}p)
                      </span>
                    </td>
                    <td className="p-3">{fmtBRL(agg.bruto)}</td>
                    <td className="p-3 font-heading font-black text-green-700">{fmtBRL(agg.repasse)}</td>
                    <td className="p-3 text-xs">{prev.toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">
                      {c ? (
                        c.status === "pago"
                          ? <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Pago{c.data_pagamento ? ` · ${new Date(c.data_pagamento+"T00:00").toLocaleDateString("pt-BR")}` : ""}</Badge>
                          : <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />A receber</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end flex-wrap">
                        {!isEmpty && (
                          <Button size="sm" variant="outline" onClick={() => saveFechamento(m)}>
                            {c ? "Atualizar" : "Fechar"}
                          </Button>
                        )}
                        {c && c.status !== "pago" && (
                          <Button size="sm" onClick={() => updateClosing(c.id, { status: "pago", data_pagamento: new Date().toISOString().slice(0,10) })}>
                            Marcar pago
                          </Button>
                        )}
                        {c && c.status === "pago" && (
                          <Button size="sm" variant="outline" onClick={() => updateClosing(c.id, { status: "a_receber", data_pagamento: null })}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-muted/10">
                      <td colSpan={7} className="p-3">
                        <div className="space-y-1">
                          {wobaEventos.filter((e) => e.start.getFullYear() === year && e.start.getMonth() === m)
                            .sort((a, b) => a.start.getTime() - b.start.getTime())
                            .map((e) => (
                              <div key={e.id} className="flex items-center gap-2 text-xs p-2 rounded border bg-background">
                                <Badge variant="outline" className="whitespace-nowrap">{PRODUTO_LABEL[e.produto]}</Badge>
                                <span className="font-semibold flex-1 truncate">{e.title}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {e.start.toLocaleDateString("pt-BR")} {e.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {e.horas.toFixed(1)}h
                                </span>
                                <span className="text-muted-foreground whitespace-nowrap">{e.criterio}</span>
                                <span className="whitespace-nowrap">{fmtBRL(e.valor)}</span>
                                <span className="font-bold text-green-700 whitespace-nowrap">{fmtBRL(e.repasse)}</span>
                                {e.htmlLink && (
                                  <a href={e.htmlLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          {wobaEventos.filter((e) => e.start.getFullYear() === year && e.start.getMonth() === m).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Nenhum evento Woba neste mês.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>

      {(loading || gLoading) && <p className="text-xs text-muted-foreground text-center">Carregando…</p>}
      {!gLoading && wobaEventos.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum evento Woba encontrado no Google Agenda com o filtro <b>“{cfg.filtro}”</b> em {year}.
          Ajuste a palavra-chave ou o ID do calendário acima.
        </Card>
      )}
    </div>
  );
}
