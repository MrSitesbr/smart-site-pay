import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { fmtBRL, fmtData, resumirSimulacao, simularPlano, type Cobertura, type Modalidade, type Periodo } from "@/lib/planosApi";
import { fmtHoras } from "@/lib/planoUso";

export type EstadoCobertura = {
  carregando: boolean;
  itens: Cobertura[];
  /** O saldo não cobre tudo e o cliente tem Harmonia: precisa escolher Adicional ou Avulso. */
  precisaEscolha: boolean;
  /** O saldo (plano + créditos extras) não cobre tudo: o envio fica bloqueado. */
  bloqueado: boolean;
  erro: string | null;
};

/** Mensagem curta para avisos (toast) quando a reserva está bloqueada por falta de saldo. */
export const MENSAGEM_SEM_SALDO = "Você precisa ter saldo de créditos (plano ou créditos extras) para fazer reservas. Fale com a equipe para contratar um plano ou comprar créditos.";

type Props = {
  clienteId: string | null | undefined;
  salaId?: string | null;
  periodos: Periodo[];
  modalidade: Modalidade | null;
  onModalidadeChange: (m: Modalidade | null) => void;
  onEstadoChange?: (estado: EstadoCobertura) => void;
  /** Telas do cliente: sem saldo de plano ou créditos extras, a reserva fica bloqueada. */
  aplicarBloqueio?: boolean;
};

/** Mostra quanto o plano cobre nos períodos escolhidos e pede a forma de pagamento quando falta saldo. */
export default function CoberturaPlanoReserva({ clienteId, salaId, periodos, modalidade, onModalidadeChange, onEstadoChange, aplicarBloqueio = false }: Props) {
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
  const bloqueado = aplicarBloqueio && resumo.excedentes > 0;
  const precisaEscolha = resumo.excedentes > 0 && resumo.permiteAdicional && !bloqueado;

  useEffect(() => {
    if (!precisaEscolha && modalidade === "adicional") onModalidadeChange(null);
    onEstadoChange?.({ carregando, itens, precisaEscolha, bloqueado, erro });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, precisaEscolha, bloqueado, erro, itens]);

  if (!clienteId || !validos.length) return null;
  if (carregando && !itens.length) {
    return <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calculando uso do plano…</div>;
  }
  if (erro) return <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>;
  if (!itens.length) return null;

  const plano = itens[0];
  const semPlano = !resumo.temPlano && resumo.cobertasCredito <= 0;
  const vencido = itens.some((i) => i.status === "vencido");
  const temCota = resumo.temPlano && Number(plano.cota) > 0 && !plano.estacao;
  const creditos = Number(plano.creditos_disponiveis || 0);
  const saldoAntes = Math.max(Number(plano.saldo || 0), 0);
  const saldoDepois = Math.max(saldoAntes - resumo.cobertas, 0);
  const creditosDepois = Math.max(creditos - resumo.cobertasCredito, 0);
  const pct = temCota ? Math.min(100, Math.round((Number(plano.usado || 0) / Number(plano.cota)) * 100)) : 0;

  const painelSaldo = (
    <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
      <p className="font-semibold">Seu saldo de horas</p>
      {temCota ? (
        <>
          <div className="flex flex-wrap justify-between gap-x-3 text-xs sm:text-sm">
            <span>{plano.plano_nome}: usou <strong>{fmtHoras(Number(plano.usado || 0))}</strong> de {fmtHoras(Number(plano.cota))}</span>
            <span>restam <strong>{fmtHoras(saldoAntes)}</strong></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do plano">
            <div className={`h-full ${pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <p className="text-xs sm:text-sm">{plano.estacao && resumo.temPlano ? `${plano.plano_nome}: estação incluída no plano.` : vencido ? "Seu plano está vencido." : "Você não tem plano ativo."}</p>
      )}
      <p className="text-xs sm:text-sm">Créditos extras: <strong>{fmtHoras(creditos)}</strong></p>
      {!bloqueado && (resumo.cobertas > 0 || resumo.cobertasCredito > 0) && (
        <p className="text-xs text-muted-foreground">
          Depois desta reserva: {temCota ? `restam ${fmtHoras(saldoDepois)} do plano` : ""}{temCota && creditos > 0 ? " e " : ""}{creditos > 0 || !temCota ? `${fmtHoras(creditosDepois)} de créditos` : ""}.
        </p>
      )}
    </div>
  );

  if (bloqueado) {
    return (
      <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 sm:p-4">
        <div className="flex items-start gap-2 text-sm">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p><strong>Reserva bloqueada por falta de saldo:</strong> faltam {fmtHoras(resumo.excedentes)} de créditos para estes horários. {MENSAGEM_SEM_SALDO}</p>
        </div>
        {painelSaldo}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      {painelSaldo}
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
