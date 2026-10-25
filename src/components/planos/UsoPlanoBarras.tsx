import { Badge } from "@/components/ui/badge";
import { fmtData, nivelUso, prazoDecorrido, REGRA_LABEL, STATUS_PLANO_LABEL, type Cobertura } from "@/lib/planosApi";
import { fmtHoras } from "@/lib/planoUso";

const COR_BARRA: Record<string, string> = { verde: "bg-emerald-500", amarelo: "bg-amber-500", vermelho: "bg-red-500" };

export const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  a_revisar: "bg-amber-100 text-amber-800 border-amber-200",
  vencido: "bg-red-100 text-red-800 border-red-200",
  nao_iniciado: "bg-slate-100 text-slate-700 border-slate-200",
  sem_plano: "bg-slate-100 text-slate-700 border-slate-200",
};

function Barra({ label, valor, total, pct, cor, detalhe }: { label: string; valor: string; total?: string; pct: number; cor: string; detalhe?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{valor}{total ? ` de ${total}` : ""}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full ${cor} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

/** Barras de horas (semana/pacote/reunião) e de prazo do contrato. */
export default function UsoPlanoBarras({ resumo, compacto = false }: { resumo: Cobertura; compacto?: boolean }) {
  const nivel = nivelUso(resumo);
  const prazo = prazoDecorrido(resumo.data_inicio, resumo.data_fim);
  const temHoras = resumo.cota > 0;
  const janela = resumo.janela_inicio && resumo.janela_fim ? `${fmtData(resumo.janela_inicio)} a ${fmtData(resumo.janela_fim)}` : undefined;

  return (
    <div className={compacto ? "space-y-3" : "space-y-4"}>
      {!compacto && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={STATUS_BADGE[resumo.status] || ""}>{STATUS_PLANO_LABEL[resumo.status] || resumo.status}</Badge>
          {resumo.regra && <span className="text-xs text-muted-foreground">{REGRA_LABEL[resumo.regra]}</span>}
        </div>
      )}

      {temHoras ? (
        <Barra
          label={REGRA_LABEL[resumo.regra] || "Horas"}
          valor={`${fmtHoras(Math.min(resumo.usado, resumo.cota))} usadas`}
          total={fmtHoras(resumo.cota)}
          pct={(resumo.usado / resumo.cota) * 100}
          cor={COR_BARRA[nivel]}
          detalhe={`Saldo: ${fmtHoras(resumo.saldo)}${janela ? ` · ${janela}` : ""}${resumo.bloco_unico ? " · um bloco seguido por semana" : ""}`}
        />
      ) : resumo.status !== "sem_plano" && (
        <p className="text-sm text-muted-foreground">
          {resumo.regra === "sem_horas" ? "Este plano não inclui horas de sala. Reservas são cobradas como avulso." : "Sem horas disponíveis no período."}
        </p>
      )}

      {prazo != null && (
        <Barra
          label="Prazo do contrato"
          valor={resumo.dias_restantes != null && resumo.dias_restantes >= 0 ? `${resumo.dias_restantes} dia(s) restantes` : "Vencido"}
          pct={prazo}
          cor={resumo.status === "vencido" ? COR_BARRA.vermelho : resumo.dias_restantes != null && resumo.dias_restantes <= 15 ? COR_BARRA.amarelo : COR_BARRA.verde}
          detalhe={`${fmtData(resumo.data_inicio)} até ${fmtData(resumo.data_fim)}${resumo.data_sugerida ? " (data sugerida, em revisão)" : ""}`}
        />
      )}
    </div>
  );
}
