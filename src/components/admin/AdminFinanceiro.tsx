import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Building2, RefreshCw, ExternalLink } from "lucide-react";
import { loadWobaCfg, mapGoogleEventsToWoba, fetchWobaEventsYear, type WobaEvento } from "@/lib/wobaEvents";
import { dataPrevistaPagamento } from "@/lib/woba";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const AMBIENTE_LABEL: Record<string, string> = { estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião" };
const PLANO_LABEL: Record<string, string> = { hora: "Hora", diaria: "Diária", pacote: "Pacote 10", mensal: "Mensal" };
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PRODUTO_LABEL: Record<string, string> = { day_pass: "Day Pass", sala_reuniao: "Sala Reunião", privativo: "Privativa/Evento" };

export default function AdminFinanceiro({ contratos }: { contratos: any[] }) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [cfg] = useState(loadWobaCfg);
  const [nivel] = useState<number>(1);
  const [gEvents, setGEvents] = useState<any[]>([]);
  const [wobaClosings, setWobaClosings] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState(false);

  async function loadWoba() {
    setGLoading(true);
    try {
      const [evs, cls] = await Promise.all([
        fetchWobaEventsYear(year, cfg).catch(() => []),
        import("@/integrations/supabase/client").then(({ supabase }) =>
          (supabase.from("woba_closings") as any).select("*").eq("ano", year).then((r: any) => r.data || []),
        ),
      ]);
      setGEvents(evs);
      setWobaClosings(cls);
    } finally { setGLoading(false); }
  }
  useEffect(() => { loadWoba(); /* eslint-disable-next-line */ }, [year]);

  const wobaEventos: WobaEvento[] = useMemo(
    () => mapGoogleEventsToWoba(gEvents, cfg, nivel),
    [gEvents, cfg, nivel],
  );

  const wobaPorMes = useMemo(() => {
    const arr = new Array(12).fill(0).map(() => ({ qtd: 0, repasse: 0 }));
    wobaEventos.forEach((e) => {
      if (e.start.getFullYear() !== year) return;
      const m = e.start.getMonth();
      arr[m].qtd++; arr[m].repasse += e.repasse;
    });
    return arr;
  }, [wobaEventos, year]);

  const stats = useMemo(() => {
    let receita_paga = 0, receita_pendente = 0, receita_cancelada = 0;
    const meses = new Array(12).fill(0).map(() => ({ pago: 0, pendente: 0, woba: 0, wobaPago: 0 }));
    const porAmbiente: Record<string, number> = {};
    const porPlano: Record<string, number> = {};

    contratos.forEach((c) => {
      const d = c.data_inicio ? new Date(c.data_inicio + "T00:00") : new Date(c.created_at);
      if (d.getFullYear() !== year) return;
      const preco = Number(c.preco);
      const mes = d.getMonth();
      if (c.status === "paga" || c.status === "concluida") {
        receita_paga += preco; meses[mes].pago += preco;
        porAmbiente[c.ambiente] = (porAmbiente[c.ambiente] || 0) + preco;
        porPlano[c.plano_tipo] = (porPlano[c.plano_tipo] || 0) + preco;
      } else if (c.status === "cancelada") receita_cancelada += preco;
      else { receita_pendente += preco; meses[mes].pendente += preco; }
    });

    // Repasses Woba por mês (todos "a receber" por padrão, salvo se woba_closings marcar pago)
    let wobaAReceber = 0, wobaPago = 0;
    wobaPorMes.forEach((wm, m) => {
      const closing = wobaClosings.find((c: any) => c.mes === m + 1);
      const pago = closing?.status === "pago";
      if (pago) { wobaPago += wm.repasse; meses[m].wobaPago += wm.repasse; }
      else { wobaAReceber += wm.repasse; meses[m].woba += wm.repasse; }
    });

    return { receita_paga, receita_pendente, receita_cancelada, meses, porAmbiente, porPlano, wobaAReceber, wobaPago };
  }, [contratos, year, wobaPorMes, wobaClosings]);

  const maxMes = Math.max(1, ...stats.meses.map((m) => m.pago + m.pendente + m.woba + m.wobaPago));

  function exportCSV() {
    const rows = [["Data","Cliente","Email","Ambiente","Plano","Valor","Status","Origem"]];
    contratos.forEach((c) => {
      const d = c.data_inicio || c.created_at.slice(0,10);
      rows.push([d, c.nome, c.email, AMBIENTE_LABEL[c.ambiente] || c.ambiente, PLANO_LABEL[c.plano_tipo] || c.plano_tipo, String(c.preco), c.status, "direto"]);
    });
    wobaEventos.filter((e) => e.start.getFullYear() === year).forEach((e) => {
      rows.push([
        e.start.toISOString().slice(0,10),
        e.cliente || e.title, "",
        PRODUTO_LABEL[e.produto], "Woba",
        e.repasse.toFixed(2),
        wobaClosings.find((c: any) => c.mes === e.start.getMonth() + 1)?.status === "pago" ? "pago" : "a_receber",
        "woba",
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financeiro_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const years = Array.from(new Set(contratos.map((c) => new Date(c.created_at).getFullYear()))).sort((a,b) => b-a);
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear());

  const [openMes, setOpenMes] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadWoba} disabled={gLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${gLoading ? "animate-spin" : ""}`} /> Atualizar Woba
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
      </div>

      <div>
        <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">Receita interna (direto)</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-5 bg-green-500/5 border-green-500/30">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Recebido</p>
            <p className="font-heading font-black text-3xl text-green-600 mt-1">{fmtBRL(stats.receita_paga)}</p>
          </Card>
          <Card className="p-5 bg-yellow-500/5 border-yellow-500/30">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">A receber</p>
            <p className="font-heading font-black text-3xl text-yellow-600 mt-1">{fmtBRL(stats.receita_pendente)}</p>
          </Card>
          <Card className="p-5 bg-red-500/5 border-red-500/30">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Cancelado</p>
            <p className="font-heading font-black text-3xl text-red-600 mt-1">{fmtBRL(stats.receita_cancelada)}</p>
          </Card>
        </div>
      </div>

      <div>
        <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">Repasses Woba (externo — não entra no caixa interno)</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-5 bg-blue-700/5 border-blue-700/30">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Woba pago</p>
            <p className="font-heading font-black text-3xl text-blue-700 mt-1">{fmtBRL(stats.wobaPago)}</p>
          </Card>
          <Card className="p-5 bg-blue-400/5 border-blue-400/30">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Woba previsto</p>
            <p className="font-heading font-black text-3xl text-blue-600 mt-1">{fmtBRL(stats.wobaAReceber)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">5º dia útil do 2º mês subsequente</p>
          </Card>
        </div>
      </div>

      <Card className="p-5 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">Total do ano até o momento {year === now.getFullYear() ? `(até ${now.toLocaleDateString("pt-BR")})` : ""}</p>
            <p className="font-heading font-black text-4xl mt-1">{fmtBRL(stats.receita_paga + stats.receita_pendente + stats.wobaPago + stats.wobaAReceber)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">Interno: </span><b className="font-heading">{fmtBRL(stats.receita_paga + stats.receita_pendente)}</b></div>
            <div><span className="text-muted-foreground">Woba: </span><b className="font-heading text-blue-700">{fmtBRL(stats.wobaPago + stats.wobaAReceber)}</b></div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-secondary" />
          <h3 className="font-heading font-black text-lg">Receita mensal — {year}</h3>
        </div>
        <div className="grid grid-cols-12 gap-2 h-48 items-end">
          {stats.meses.map((m, i) => {
            const total = m.pago + m.pendente + m.woba + m.wobaPago;
            const hPago = (m.pago / maxMes) * 100;
            const hPend = (m.pendente / maxMes) * 100;
            const hWoba = (m.woba / maxMes) * 100;
            const hWobaPago = (m.wobaPago / maxMes) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-1 h-full">
                <div className="flex-1 w-full flex flex-col justify-end rounded-t overflow-hidden bg-muted/30">
                  {hPend > 0 && <div className="bg-yellow-500" style={{ height: `${hPend}%` }} title={`Direto pend: ${fmtBRL(m.pendente)}`} />}
                  {hWoba > 0 && <div className="bg-blue-400" style={{ height: `${hWoba}%` }} title={`Woba a receber: ${fmtBRL(m.woba)}`} />}
                  {hWobaPago > 0 && <div className="bg-blue-700" style={{ height: `${hWobaPago}%` }} title={`Woba pago: ${fmtBRL(m.wobaPago)}`} />}
                  {hPago > 0 && <div className="bg-green-500" style={{ height: `${hPago}%` }} title={`Direto pago: ${fmtBRL(m.pago)}`} />}
                </div>
                <span className="text-[10px] font-heading font-bold text-muted-foreground">{MONTHS[i]}</span>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{total > 0 ? fmtBRL(total).replace("R$","") : ""}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm" />Direto pago</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-500 rounded-sm" />Direto pendente</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-700 rounded-sm" />Woba pago</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-400 rounded-sm" />Woba a receber</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-heading font-black text-lg">Repasses Woba — {year}</h3>
          <Badge variant="outline" className="ml-auto">{wobaEventos.filter(e => e.start.getFullYear() === year).length} eventos</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2 font-heading font-bold">Mês</th>
                <th className="p-2 font-heading font-bold">Eventos</th>
                <th className="p-2 font-heading font-bold">Repasse</th>
                <th className="p-2 font-heading font-bold">Prev. pagto</th>
                <th className="p-2 font-heading font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {wobaPorMes.map((wm, m) => {
                if (wm.qtd === 0) return null;
                const closing = wobaClosings.find((c: any) => c.mes === m + 1);
                const pago = closing?.status === "pago";
                const prev = dataPrevistaPagamento(year, m);
                const open = openMes === m;
                const evs = wobaEventos.filter(e => e.start.getFullYear() === year && e.start.getMonth() === m);
                return (
                  <>
                    <tr key={m} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setOpenMes(open ? null : m)}>
                      <td className="p-2 font-heading font-bold">{MONTHS[m]}</td>
                      <td className="p-2">{wm.qtd}</td>
                      <td className="p-2 font-heading font-black text-blue-700">{fmtBRL(wm.repasse)}</td>
                      <td className="p-2 text-xs">{prev.toLocaleDateString("pt-BR")}</td>
                      <td className="p-2">
                        {pago
                          ? <Badge className="bg-green-500 text-white">Pago</Badge>
                          : <Badge className="bg-yellow-500 text-white">A receber</Badge>}
                      </td>
                    </tr>
                    {open && evs.map((e) => (
                      <tr key={e.id} className="bg-muted/10 text-xs">
                        <td></td>
                        <td className="p-2" colSpan={2}>
                          <Badge variant="outline" className="mr-2">{PRODUTO_LABEL[e.produto]}</Badge>
                          {e.title}
                        </td>
                        <td className="p-2">{e.start.toLocaleDateString("pt-BR")} · {e.horas.toFixed(1)}h</td>
                        <td className="p-2">
                          <span className="mr-2 font-bold text-blue-700">{fmtBRL(e.repasse)}</span>
                          {e.htmlLink && <a href={e.htmlLink} target="_blank" rel="noreferrer" className="text-blue-600 inline-flex"><ExternalLink className="w-3 h-3" /></a>}
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
              {wobaEventos.filter(e => e.start.getFullYear() === year).length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum evento Woba encontrado. Ajuste o filtro na aba <b>Repasses Woba</b>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-heading font-black mb-3">Receita por ambiente</h3>
          {Object.entries(stats.porAmbiente).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : Object.entries(stats.porAmbiente).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
              <span>{AMBIENTE_LABEL[k]}</span>
              <span className="font-heading font-black">{fmtBRL(v)}</span>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h3 className="font-heading font-black mb-3">Receita por plano</h3>
          {Object.entries(stats.porPlano).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : Object.entries(stats.porPlano).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
              <span>{PLANO_LABEL[k]}</span>
              <span className="font-heading font-black">{fmtBRL(v)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
