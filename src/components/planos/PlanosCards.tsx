import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, CalendarX2, Clock, History, Loader2, Wallet } from "lucide-react";
import { fmtHoras } from "@/lib/planoUso";
import { fmtBRL, fmtData, getPlanoCards, REGRA_LABEL, type PlanoCard, type ResumoPlano } from "@/lib/planosApi";

const CATEGORIA_LABEL: Record<string, string> = {
  harmonia: "Plano mensal · cota semanal", pacote: "Pacote de horas", endereco: "Endereço fiscal / comercial",
  compartilhado: "Estação compartilhada", avulso: "Avulso",
};
const COBRANCA_SUFIXO: Record<string, string> = { mensal: "/mês", unico: " único", hora: "/hora" };
const COBRANCA_EXTRATO: Record<string, string> = { plano: "Plano", estacao: "Estação incluída", adicional: "Adicional", avulso: "Avulso" };

const pct = (usado: number, total: number) => (total > 0 ? Math.min(100, (usado / total) * 100) : 0);

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full border bg-muted" role="progressbar" aria-valuenow={Math.round(valor)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${cor} transition-all`} style={{ width: `${valor}%` }} />
    </div>
  );
}

function validade(card: PlanoCard) {
  if (card.status === "a_revisar") return "Em revisão pela equipe";
  if (card.status === "encerrado") return `Encerrado em ${fmtData(card.encerrado_em || card.data_fim)}`;
  if (card.status === "vencido") return `Venceu em ${fmtData(card.data_fim)}`;
  return card.data_fim ? `Válido até ${fmtData(card.data_fim)}` : "Sem prazo de vencimento";
}

/** Card de um contrato vigente: uso da janela atual (semana/mês/pacote) e uso no contrato. */
function CardVigente({ card, resumo, onAbrir }: { card: PlanoCard; resumo: ResumoPlano | null; onAbrir: () => void }) {
  const atual = resumo && resumo.contrato_id === card.id ? resumo : null;
  const cota = Number(atual?.cota || 0);
  const usadoJanela = Number(atual?.usado || 0);
  const saldo = Number(atual?.saldo || 0);
  const usoJanela = pct(usadoJanela, cota);
  const cor = cota > 0 && saldo <= 0 ? "bg-red-500" : usoJanela >= 75 ? "bg-amber-500" : "bg-blue-600";
  return (
    <button type="button" onClick={onAbrir} className="group w-full space-y-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{CATEGORIA_LABEL[card.categoria || ""] || "Plano"}</span>
          <h3 className="truncate text-sm font-bold text-slate-800 group-hover:text-blue-700">{card.plano_nome}</h3>
        </div>
        {cota > 0 ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${saldo > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-700"}`}>{fmtHoras(saldo)} restantes</span>
        ) : card.status === "a_revisar" ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Em revisão</span>
        ) : null}
      </div>

      {cota > 0 ? (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-muted-foreground">{REGRA_LABEL[atual?.regra || ""] || "Horas"}: {fmtHoras(Math.min(usadoJanela, cota))} usadas</span>
            <span className="text-slate-800">{fmtHoras(cota)} total</span>
          </div>
          <Barra valor={usoJanela} cor={cor} />
          {atual?.janela_inicio && atual.regra !== "pacote" && (
            <p className="text-[11px] text-muted-foreground">Período atual: {fmtData(atual.janela_inicio)} a {fmtData(atual.janela_fim)} · não acumula</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{card.regra === "sem_horas" || card.regra === "avulso" ? "Sem horas de sala incluídas. Reservas cobradas como avulso." : "Sem horas disponíveis neste período."}</p>
      )}

      {card.horas_periodo != null && card.horas_periodo > 0 && card.regra !== "pacote" && (
        <p className="text-[11px] text-muted-foreground">No contrato: {fmtHoras(card.horas_usadas)} usadas de {fmtHoras(card.horas_periodo)} previstas</p>
      )}
      {card.horas_extras > 0 && <p className="text-[11px] text-muted-foreground">Horas fora do plano: {fmtHoras(card.horas_extras)}</p>}

      <div className="flex items-center justify-between border-t pt-2 text-[11px]">
        <span className="flex items-center gap-1 font-medium text-blue-700"><Clock className="h-3 w-3" />{validade(card)}</span>
        {card.valor != null && <span className="font-bold text-slate-700">{fmtBRL(Number(card.valor))}{COBRANCA_SUFIXO[card.cobranca || ""] || ""}</span>}
      </div>
    </button>
  );
}

/** Card de contrato encerrado ou vencido (histórico). */
function CardHistorico({ card, onAbrir }: { card: PlanoCard; onAbrir: () => void }) {
  const total = Number(card.horas_periodo || 0);
  return (
    <button type="button" onClick={onAbrir} className="group w-full space-y-3 rounded-xl border bg-white/80 p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{CATEGORIA_LABEL[card.categoria || ""] || "Plano"}</span>
          <h3 className="truncate text-sm font-bold text-slate-700 group-hover:text-red-700">{card.plano_nome}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{card.status === "vencido" ? "Vencido" : "Encerrado"}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-muted-foreground">Usado: {fmtHoras(card.horas_usadas)}</span>
          <span className="text-slate-800">{total > 0 ? `${fmtHoras(total)} previstas` : "Sem horas incluídas"}</span>
        </div>
        <Barra valor={total > 0 ? pct(card.horas_usadas, total) : 100} cor="bg-red-500" />
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><CalendarX2 className="h-3 w-3" />{validade(card)}</span>
        {card.valor != null && <span className="font-bold">{fmtBRL(Number(card.valor))}{COBRANCA_SUFIXO[card.cobranca || ""] || ""}</span>}
      </div>
      {card.motivo_encerramento && <p className="text-[11px] text-muted-foreground">Motivo: {card.motivo_encerramento}</p>}
    </button>
  );
}

function Extrato({ card, onClose }: { card: PlanoCard | null; onClose: () => void }) {
  const total = Number(card?.horas_periodo || 0);
  let saldo = total;
  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle>{card.plano_nome}</DialogTitle>
              <DialogDescription>{fmtData(card.data_inicio)} a {card.data_fim ? fmtData(card.data_fim) : "sem prazo"} · {validade(card)}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
              <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Previstas</span><p className="text-sm font-bold">{total > 0 ? fmtHoras(total) : "—"}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Usadas</span><p className="text-sm font-bold">{fmtHoras(card.horas_usadas)}</p></div>
              <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Fora do plano</span><p className="text-sm font-bold">{fmtHoras(card.horas_extras)}</p></div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Extrato de uso</h4>
              <div className="max-h-[50vh] overflow-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b bg-slate-100 font-semibold text-slate-600">
                    <tr><th className="p-2">Data</th><th className="p-2">Sala</th><th className="p-2 text-center">Plano</th><th className="p-2 text-center">Fora</th>{total > 0 && card.regra === "pacote" && <th className="p-2 text-right">Saldo</th>}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {card.extrato.length ? card.extrato.map((item) => {
                      saldo -= Number(item.horas_plano || 0);
                      return (
                        <tr key={item.id}>
                          <td className="p-2 font-medium">{fmtData(item.data)} {item.hora_inicio}–{item.hora_fim}</td>
                          <td className="p-2 text-muted-foreground">{item.sala || "—"}</td>
                          <td className="p-2 text-center font-bold text-red-600">{Number(item.horas_plano) > 0 ? `-${fmtHoras(Number(item.horas_plano))}` : "—"}</td>
                          <td className="p-2 text-center">{Number(item.horas_extras) > 0 ? `${fmtHoras(Number(item.horas_extras))} ${COBRANCA_EXTRATO[item.tipo_cobranca || ""] || ""}` : "—"}</td>
                          {total > 0 && card.regra === "pacote" && <td className="p-2 text-right font-semibold">{fmtHoras(Math.max(0, saldo))}</td>}
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhum uso registrado neste plano.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  clienteId: string;
  resumo: ResumoPlano | null;
  /** Ação no topo da coluna de vigentes (admin: contratar/trocar plano). */
  acaoVigentes?: ReactNode;
  /** Muda quando os dados devem ser recarregados (ex.: após salvar contrato). */
  versao?: number;
};

/** Planos do cliente em cards: vigentes (com saldo) e histórico de encerrados, com extrato ao clicar. */
export default function PlanosCards({ clienteId, resumo, acaoVigentes, versao = 0 }: Props) {
  const [cards, setCards] = useState<PlanoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState<PlanoCard | null>(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    getPlanoCards(clienteId)
      .then((data) => { if (ativo) { setCards(data || []); setErro(false); } })
      .catch(() => { if (ativo) setErro(true); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [clienteId, versao]);

  const vigentes = cards.filter((c) => c.vigente);
  const historico = cards.filter((c) => !c.vigente);
  const saldoAgora = resumo && resumo.status !== "sem_plano" && Number(resumo.cota) > 0 ? Number(resumo.saldo) : null;

  if (loading) return <Card className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (erro) return <Card className="p-6 text-sm text-destructive">Não foi possível carregar os planos agora. Atualize a página.</Card>;

  return (
    <div className="space-y-4">
      {saldoAgora != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs font-medium text-blue-700">Saldo disponível agora</p>
              <p className="text-lg font-extrabold text-blue-800">{fmtHoras(saldoAgora)} {resumo?.regra === "semanal" ? "nesta semana" : resumo?.regra === "pacote" ? "no pacote" : "neste mês"}</p>
            </div>
          </div>
          {resumo?.permite_adicional && <p className="text-xs text-muted-foreground">Hora adicional: {fmtBRL(Number(resumo.preco_adicional))}/h</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="order-2 flex min-h-[260px] flex-col rounded-2xl border bg-slate-100 p-4 md:order-1">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700"><History className="h-4 w-4" />Histórico de planos</h3>
            <span className="text-xs text-muted-foreground">Encerrados e vencidos</span>
          </div>
          <div className="space-y-3">
            {historico.length ? historico.map((c) => <CardHistorico key={c.id} card={c} onAbrir={() => setAberto(c)} />)
              : <p className="py-6 text-center text-sm text-muted-foreground">Nenhum plano encerrado.</p>}
          </div>
        </div>

        <div className="order-1 flex min-h-[260px] flex-col rounded-2xl border-2 border-blue-400 bg-slate-100 p-4 md:order-2">
          <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />Planos vigentes</h3>
            {acaoVigentes}
          </div>
          <div className="space-y-3">
            {vigentes.length ? vigentes.map((c) => <CardVigente key={c.id} card={c} resumo={resumo} onAbrir={() => setAberto(c)} />) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <CalendarClock className="h-6 w-6" />
                Nenhum plano vigente. Reservas são cobradas como avulso.
              </div>
            )}
          </div>
        </div>
      </div>

      <Extrato card={aberto} onClose={() => setAberto(null)} />
    </div>
  );
}
