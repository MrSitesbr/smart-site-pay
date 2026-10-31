import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { fmtBRL, fmtData, resumirSimulacao, simularPlano, type Cobertura, type Modalidade, type Periodo } from "@/lib/planosApi";
import { fmtHoras } from "@/lib/planoUso";

export type EstadoCobertura = {
  carregando: boolean;
  itens: Cobertura[];
  /** O saldo não cobre tudo e o cliente tem Harmonia: precisa escolher Adicional ou Avulso. */
  precisaEscolha: boolean;
  erro: string | null;
};

type Props = {
  clienteId: string | null | undefined;
  salaId?: string | null;
  periodos: Periodo[];
  modalidade: Modalidade | null;
  onModalidadeChange: (m: Modalidade | null) => void;
  onEstadoChange?: (estado: EstadoCobertura) => void;
};

/** Mostra quanto o plano cobre nos períodos escolhidos e pede a forma de pagamento quando falta saldo. */
export default function CoberturaPlanoReserva({ clienteId, salaId, periodos, modalidade, onModalidadeChange, onEstadoChange }: Props) {
  const [itens, setItens] = useState<Cobertura[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chave = JSON.stringify([clienteId, salaId, periodos]);
  const validos = useMemo(
    () => periodos.filter((p) => p.data && p.hora_inicio && p.hora_fim && p.hora_inicio < p.hora_fim),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );

  useEffect(() => {
    if (!clienteId || !validos.length) { setItens([]); setErro(null); return; }
    let ativo = true;
    setCarregando(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await simularPlano(clienteId, validos, salaId);
        if (ativo) { setItens(data || []); setErro(null); }
      } catch {
        if (ativo) { setItens([]); setErro("Não foi possível calcular o uso do plano agora."); }
      } finally {
        if (ativo) setCarregando(false);
      }
    }, 300);
    return () => { ativo = false; window.clearTimeout(timer); };
  }, [clienteId, salaId, validos]);

  const resumo = resumirSimulacao(itens);
  const precisaEscolha = resumo.excedentes > 0 && resumo.permiteAdicional;

  useEffect(() => {
    if (!precisaEscolha && modalidade === "adicional") onModalidadeChange(null);
    onEstadoChange?.({ carregando, itens, precisaEscolha, erro });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, precisaEscolha, erro, itens]);

  if (!clienteId || !validos.length) return null;
  if (carregando && !itens.length) {
    return <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calculando uso do plano…</div>;
  }
  if (erro) return <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>;
  if (!itens.length) return null;

  const plano = itens[0];
  const semPlano = !resumo.temPlano && resumo.cobertasCredito <= 0;
  const vencido = itens.some((i) => i.status === "vencido");

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <div className="flex items-start gap-2">
        {resumo.excedentes > 0
          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
        <div className="text-sm">
          {semPlano ? (
            <p><strong>Sem plano ativo:</strong> {fmtHoras(resumo.excedentes)} avulsas · {fmtBRL(resumo.valorAvulso)}</p>
          ) : vencido ? (
            <p><strong>Plano vencido:</strong> as horas são cobradas como avulso ({fmtBRL(resumo.valorAvulso)}).</p>
          ) : resumo.excedentes > 0 ? (
            <p><strong>{plano.plano_nome}:</strong> cobre {fmtHoras(resumo.cobertas)}{resumo.cobertasCredito > 0 ? ` + ${fmtHoras(resumo.cobertasCredito)} dos créditos extras` : ""}. Faltam {fmtHoras(resumo.excedentes)} de saldo.</p>
          ) : (
            <p><strong>Coberto pelo seu banco de horas</strong> ({resumo.cobertas > 0 ? `${fmtHoras(resumo.cobertas)} do plano` : ""}{resumo.cobertas > 0 && resumo.cobertasCredito > 0 ? " + " : ""}{resumo.cobertasCredito > 0 ? `${fmtHoras(resumo.cobertasCredito)} dos créditos extras` : ""}).</p>
          )}
          {itens.length > 1 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {itens.map((i, idx) => (
                <li key={`${i.data}-${i.hora_inicio}-${idx}`}>
                  {fmtData(i.data)} {i.hora_inicio?.slice(0, 5)}–{i.hora_fim?.slice(0, 5)}: {i.excedentes > 0 ? `${fmtHoras(i.cobertas)} no plano, ${fmtHoras(i.excedentes)} fora` : i.estacao ? "estação incluída" : "coberto"}
                </li>
              ))}
            </ul>
          )}
          {itens.find((i) => i.motivo)?.motivo && <p className="mt-1 text-xs text-muted-foreground">{itens.find((i) => i.motivo)?.motivo}</p>}
        </div>
      </div>

      {precisaEscolha && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">Como deseja pagar as {fmtHoras(resumo.excedentes)} fora do plano? *</p>
          <RadioGroup value={modalidade || ""} onValueChange={(v) => onModalidadeChange(v as Modalidade)} className="gap-2">
            <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-[:checked]:border-secondary">
              <RadioGroupItem value="adicional" />
              <span>Hora adicional do Harmonia · {fmtBRL(resumo.precoAdicional)}/h · <strong>{fmtBRL(resumo.valorAdicional)}</strong></span>
            </Label>
            <Label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-[:checked]:border-secondary">
              <RadioGroupItem value="avulso" />
              <span>Avulso · {fmtBRL(resumo.precoAvulso)}/h · <strong>{fmtBRL(resumo.valorAvulso)}</strong></span>
            </Label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">O valor é cobrado à parte da mensalidade.</p>
        </div>
      )}
      {resumo.excedentes > 0 && !precisaEscolha && !semPlano && !vencido && (
        <p className="border-t pt-3 text-sm">As {fmtHoras(resumo.excedentes)} fora do plano serão cobradas como avulso: <strong>{fmtBRL(resumo.valorAvulso)}</strong>.</p>
      )}
    </div>
  );
}
