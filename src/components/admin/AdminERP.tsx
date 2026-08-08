import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isBusinessDay } from "@/lib/holidays";

const AMBIENTES = ["estacao", "sala_privativa", "sala_reuniao"] as const;
const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação de Trabalho",
  sala_privativa: "Sala Privativa",
  sala_reuniao: "Sala de Reunião",
};
// Capacidade estimada por dia útil (ajustável)
const CAPACIDADE: Record<string, number> = { estacao: 15, sala_privativa: 3, sala_reuniao: 4 };
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function AdminERP({ contratos, reservas }: { contratos: any[]; reservas: any[] }) {
  const [month, setMonth] = useState<Date>(new Date());

  const stats = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(y, m, i));

    // ocupação por dia por ambiente
    const ocupacao: Record<string, Record<string, number>> = {};
    AMBIENTES.forEach((a) => { ocupacao[a] = {}; days.forEach((d) => { ocupacao[a][dayKey(d)] = 0; }); });

    contratos.forEach((c) => {
      if (c.status === "cancelada") return;
      const dias: string[] = c.dias_selecionados || [];
      dias.forEach((d) => {
        const dd = new Date(d + "T00:00");
        if (dd.getFullYear() === y && dd.getMonth() === m) {
          if (ocupacao[c.ambiente]?.[d] !== undefined) ocupacao[c.ambiente][d]++;
        }
      });
    });
    reservas.forEach((r) => {
      if (r.status === "cancelada") return;
      const dd = new Date(r.data + "T00:00");
      if (dd.getFullYear() === y && dd.getMonth() === m) {
        if (ocupacao[r.ambiente]?.[r.data] !== undefined) ocupacao[r.ambiente][r.data]++;
      }
    });

    // médias e picos
    const resumo = AMBIENTES.map((a) => {
      const businessDays = days.filter((d) => isBusinessDay(d));
      const total = businessDays.reduce((acc, d) => acc + (ocupacao[a][dayKey(d)] || 0), 0);
      const cap = CAPACIDADE[a] * businessDays.length;
      const ocupPct = cap > 0 ? Math.round((total / cap) * 100) : 0;
      const pico = Math.max(0, ...days.map((d) => ocupacao[a][dayKey(d)] || 0));
      return { ambiente: a, total, ocupPct, pico, businessDays: businessDays.length };
    });

    return { days, ocupacao, resumo };
  }, [contratos, reservas, month]);

  const goPrev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())} className="font-heading font-bold">Hoje</Button>
          <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="w-5 h-5" /></Button>
          <h2 className="font-heading font-black text-xl capitalize ml-2">
            {MONTHS[month.getMonth()]} <span className="text-muted-foreground">{month.getFullYear()}</span>
          </h2>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.resumo.map((r) => (
          <Card key={r.ambiente} className="p-5">
            <p className="text-xs font-heading font-bold uppercase tracking-widest text-muted-foreground">{AMBIENTE_LABEL[r.ambiente]}</p>
            <p className="font-heading font-black text-3xl mt-1">{r.ocupPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">Ocupação média · Capacidade {CAPACIDADE[r.ambiente]}/dia</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${Math.min(100, r.ocupPct)}%` }} />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span><span className="text-muted-foreground">Reservas: </span><strong>{r.total}</strong></span>
              <span><span className="text-muted-foreground">Pico dia: </span><strong>{r.pico}</strong></span>
              <span><span className="text-muted-foreground">Dias úteis: </span><strong>{r.businessDays}</strong></span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 overflow-x-auto">
        <h3 className="font-heading font-black mb-3">Ocupação diária por ambiente</h3>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-heading font-bold text-muted-foreground pr-2">Ambiente</th>
              {stats.days.map((d) => (
                <th key={dayKey(d)} className={`text-center font-heading font-bold w-8 ${!isBusinessDay(d) ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                  {d.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AMBIENTES.map((a) => (
              <tr key={a} className="border-t">
                <td className="py-2 pr-2 font-heading font-bold whitespace-nowrap">{AMBIENTE_LABEL[a]}</td>
                {stats.days.map((d) => {
                  const key = dayKey(d);
                  const n = stats.ocupacao[a][key] || 0;
                  const cap = CAPACIDADE[a];
                  const pct = cap > 0 ? Math.min(100, (n / cap) * 100) : 0;
                  const bg = n === 0 ? "bg-muted/30" : pct >= 100 ? "bg-red-500 text-white" : pct >= 70 ? "bg-orange-500 text-white" : "bg-green-500/70 text-white";
                  return (
                    <td key={key} className="p-0.5">
                      <div className={`${bg} rounded text-center py-1 text-[10px] font-bold`} title={`${n}/${cap}`}>{n || ""}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500/70 rounded-sm" />Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-500 rounded-sm" />≥70%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm" />Lotado</span>
        </div>
      </Card>
    </div>
  );
}
