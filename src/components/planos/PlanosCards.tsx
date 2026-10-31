import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, CalendarX2, Clock, History, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/appErrors";
import { fmtHoras } from "@/lib/planoUso";
import { adicionarCreditos, cancelarCredito, fmtBRL, fmtData, getPlanoCards, type PlanoCard, type ResumoPlano } from "@/lib/planosApi";

const TIPO_LABEL: Record<PlanoCard["tipo"], string> = {
  plano: "Créditos do plano", excedente: "Fora do plano", sem_horas: "Plano sem horas de sala", credito: "Créditos comprados", bonus: "Bônus / cortesia",
};
const COBRANCA_SUFIXO: Record<string, string> = { mensal: "/mês", unico: "", hora: "/hora" };
const COBRANCA_EXTRA: Record<string, string> = { adicional: "Hora adicional", avulso: "Avulso", nao_cobrado: "Regra anterior (não cobrado)" };

const pct = (usado: number, total: number) => (total > 0 ? Math.min(100, (usado / total) * 100) : 0);

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full border bg-muted" role="progressbar" aria-valuenow={Math.round(valor)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${cor} transition-all`} style={{ width: `${valor}%` }} />
    </div>
  );
}

function rodape(card: PlanoCard) {
  if (card.tipo === "excedente") return `Período ${fmtData(card.periodo_inicio)} a ${fmtData(card.periodo_fim)}`;
  if (card.cancelado) return "Cancelado";
  if (card.status === "esgotado") return "Horas esgotadas";
  if (card.status === "encerrado") return card.periodo_fim ? `Encerrado em ${fmtData(card.periodo_fim)}` : "Encerrado";
  if (card.status === "futuro") return `Começa em ${fmtData(card.periodo_inicio)}`;
  if (card.tipo === "credito" || card.tipo === "bonus") return card.periodo_fim ? `Válido até ${fmtData(card.periodo_fim)}` : "Sem expiração";
  return card.periodo_fim ? `Até ${fmtData(card.periodo_fim)} · não acumula` : "Sem prazo";
}

function CardHoras({ card, onAbrir }: { card: PlanoCard; onAbrir: () => void }) {
  const total = Number(card.horas_total || 0);
  const usadas = Number(card.horas_usadas || 0);
  const restantes = Math.max(0, total - usadas);
  const historico = !card.vigente;
  const excedente = card.tipo === "excedente";
  const cor = historico ? "bg-red-500" : card.tipo === "bonus" ? "bg-emerald-500" : pct(usadas, total) >= 75 ? "bg-amber-500" : "bg-blue-600";
  return (
    <button type="button" onClick={onAbrir}
      className={`group w-full space-y-3 rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${historico ? "bg-white/80" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{TIPO_LABEL[card.tipo]}</span>
          <h3 className={`truncate text-sm font-bold ${historico ? "text-slate-700" : "text-slate-800"} group-hover:text-blue-700`}>{card.titulo}</h3>
        </div>
        {excedente ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{fmtHoras(usadas)} fora</span>
        ) : historico ? (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{card.status === "esgotado" ? "Esgotado" : "Encerrado"}</span>
        ) : total > 0 ? (
          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">{fmtHoras(restantes)} restantes</span>
        ) : null}
      </div>

      {card.tipo === "sem_horas" ? (
        <p className="text-xs text-muted-foreground">Sem horas de sala incluídas. Reservas são cobradas como avulso.</p>
      ) : excedente ? (
        <p className="text-xs text-muted-foreground">Horas usadas acima do limite do plano neste período.</p>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className="text-muted-foreground">Usado: {fmtHoras(usadas)}</span>
            <span className="text-slate-800">{fmtHoras(total)} total</span>
          </div>
          <Barra valor={pct(usadas, total)} cor={cor} />
        </div>
      )}

      <div className={`flex items-center justify-between border-t pt-2 text-[11px] ${historico ? "text-muted-foreground" : ""}`}>
        <span className={`flex items-center gap-1 ${historico ? "" : "font-medium text-blue-700"}`}>
          {historico ? <CalendarX2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{rodape(card)}
        </span>
        {card.valor != null && Number(card.valor) > 0 && <span className="font-bold text-slate-700">{fmtBRL(Number(card.valor))}{COBRANCA_SUFIXO[card.cobranca || ""] || ""}</span>}
        {card.tipo === "bonus" && <span className="font-bold text-emerald-700">Cortesia</span>}
      </div>
    </button>
  );
}

const CANCELADO_POR: Record<string, string> = { cliente: "pelo cliente", admin: "pela equipe", sistema: "pelo sistema" };

function Extrato({ card, admin, onClose, onCancelado }: { card: PlanoCard | null; admin: boolean; onClose: () => void; onCancelado: () => void }) {
  const navigate = useNavigate();
  const [cancelando, setCancelando] = useState(false);
  const abrirReserva = (id: string, data: string) => {
    onClose();
    navigate(`${admin ? "/admin" : "/painel"}?aba=calendario&data=${String(data).slice(0, 10)}&reserva=${encodeURIComponent(id)}`);
  };
  const total = Number(card?.horas_total || 0);
  const excedente = card?.tipo === "excedente";
  let saldo = total;

  async function cancelar() {
    if (!card?.credito_id || !confirm("Cancelar este crédito? As horas ainda não usadas deixam de valer.")) return;
    setCancelando(true);
    try {
      await cancelarCredito(card.credito_id);
      toast.success("Crédito cancelado");
      onClose();
      onCancelado();
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível cancelar o crédito."));
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle>{card.titulo}</DialogTitle>
              <DialogDescription>{TIPO_LABEL[card.tipo]} · {rodape(card)}</DialogDescription>
            </DialogHeader>
            {!excedente && (
              <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
                <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Total</span><p className="text-sm font-bold">{fmtHoras(total)}</p></div>
                <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Usado</span><p className="text-sm font-bold">{fmtHoras(Number(card.horas_usadas))}</p></div>
                <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Saldo</span><p className={`text-sm font-bold ${card.vigente ? "text-blue-700" : "text-red-600"}`}>{fmtHoras(Math.max(0, total - Number(card.horas_usadas)))}</p></div>
              </div>
            )}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Extrato de uso</h4>
              <div className="max-h-[50vh] overflow-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b bg-slate-100 font-semibold text-slate-600">
                    <tr><th className="p-2">Data</th><th className="p-2">Sala</th><th className="p-2 text-center">{excedente ? "Horas" : "Consumo"}</th><th className="p-2 text-right">{excedente ? "Cobrança" : "Saldo"}</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {card.extrato.length ? card.extrato.map((item) => {
                      if (!item.estornado) saldo -= Number(item.horas || 0);
                      const cancelada = item.status === "cancelada";
                      return (
                        <tr key={`${item.id}-${item.horas}`} className={item.estornado ? "bg-emerald-50/60" : cancelada ? "bg-red-50/60" : ""}>
                          <td className="p-2 font-medium">
                            <button type="button" onClick={() => abrirReserva(item.id, item.data)} className="text-left text-blue-700 underline-offset-2 hover:underline" title="Ver a reserva no calendário">
                              {fmtData(item.data)} {item.hora_inicio}–{item.hora_fim}
                            </button>
                            {cancelada && (
                              <p className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                                Cancelada {CANCELADO_POR[item.cancelado_por || ""] || ""}{item.motivo ? `: "${item.motivo}"` : ""}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">{item.sala || "—"}</td>
                          <td className={`p-2 text-center font-bold ${item.estornado ? "text-emerald-700" : "text-red-600"}`}>
                            {item.estornado ? `+${fmtHoras(Number(item.horas))} devolvidas` : `-${fmtHoras(Number(item.horas))}${cancelada ? " (cancelada < 24h)" : ""}`}
                          </td>
                          <td className="p-2 text-right">{excedente ? COBRANCA_EXTRA[item.tipo_cobranca || ""] || item.tipo_cobranca : <span className="font-semibold">{fmtHoras(Math.max(0, saldo))}</span>}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Nenhum uso registrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {admin && card.credito_id && !card.cancelado && card.vigente && (
                <Button variant="outline" className="text-destructive" onClick={cancelar} disabled={cancelando}>
                  {cancelando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancelar crédito
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Admin insere créditos (compra gera cobrança; bônus não). */
export function AdicionarCreditosDialog({ open, onOpenChange, clienteId, inicial, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; clienteId: string;
  inicial?: { horas?: number | null; titulo?: string; solicitacaoId?: string | null }; onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [horas, setHoras] = useState("");
  const [tipo, setTipo] = useState<"compra" | "bonus">("compra");
  const [valor, setValor] = useState("");
  const [validade, setValidade] = useState("60");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitulo(inicial?.titulo || "");
    setHoras(inicial?.horas ? String(inicial.horas) : "");
    setTipo("compra");
    setValor("");
    setValidade("60");
  }, [open, inicial]);

  async function salvar() {
    const h = Number(horas.replace(",", "."));
    if (!titulo.trim()) return toast.error("Informe o título do pacote.");
    if (!(h > 0)) return toast.error("Informe a quantidade de horas.");
    setSalvando(true);
    try {
      await adicionarCreditos({
        clienteId, titulo: titulo.trim(), horas: h, tipo,
        valor: tipo === "compra" && valor ? Number(valor.replace(",", ".")) : null,
        validadeDias: validade === "sem" ? null : Number(validade),
        solicitacaoId: inicial?.solicitacaoId || null,
      });
      toast.success(tipo === "compra" && valor ? "Créditos adicionados e cobrança lançada" : "Créditos adicionados");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível adicionar os créditos."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar créditos de horas</DialogTitle>
          <DialogDescription>Usados depois da cota do plano, começando pelo que vence antes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cred-titulo">Título do pacote</Label>
            <Input id="cred-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Pacote extra 10h" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-horas">Total de horas</Label>
            <Input id="cred-horas" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Ex.: 10" />
          </div>
          <div className="space-y-2">
            <Label>Validade</Label>
            <Select value={validade} onValueChange={setValidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="sem">Sem expiração</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "compra" | "bonus")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compra">Compra (gera cobrança)</SelectItem>
                <SelectItem value="bonus">Bônus / cortesia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-valor">Valor (R$)</Label>
            <Input id="cred-valor" inputMode="decimal" value={tipo === "bonus" ? "" : valor} disabled={tipo === "bonus"} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "bonus" ? "Grátis" : "Ex.: 280"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar créditos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  clienteId: string;
  resumo: ResumoPlano | null;
  /** Ações no topo da coluna de vigentes (admin: créditos/trocar plano; cliente: solicitar). */
  acaoVigentes?: ReactNode;
  admin?: boolean;
  /** Muda quando os dados devem ser recarregados (ex.: após salvar). */
  versao?: number;
  onAlterado?: () => void;
};

/** Banco de horas do cliente em cards: vigentes (com saldo) e histórico (esgotados/encerrados), com extrato. */
export default function PlanosCards({ clienteId, resumo, acaoVigentes, admin = false, versao = 0, onAlterado }: Props) {
  const [cards, setCards] = useState<PlanoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState<PlanoCard | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    getPlanoCards(clienteId)
      .then((data) => { if (ativo) { setCards(data || []); setErro(false); } })
      .catch(() => { if (ativo) setErro(true); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [clienteId, versao, recarga]);

  const vigentes = cards.filter((c) => c.vigente).sort((a, b) => String(a.periodo_inicio).localeCompare(String(b.periodo_inicio)));
  const historico = cards.filter((c) => !c.vigente).sort((a, b) => String(b.periodo_inicio).localeCompare(String(a.periodo_inicio)));
  const saldoCreditos = vigentes.filter((c) => c.tipo === "credito" || c.tipo === "bonus").reduce((acc, c) => acc + Math.max(0, Number(c.horas_total) - Number(c.horas_usadas)), 0);
  const saldoPlano = resumo && resumo.status !== "sem_plano" && Number(resumo.cota) > 0 ? Number(resumo.saldo) : 0;
  const periodoPlano = resumo?.regra === "semanal" ? "nesta semana" : resumo?.regra === "pacote" ? "no pacote" : "neste mês";

  if (loading) return <Card className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (erro) return <Card className="p-6 text-sm text-destructive">Não foi possível carregar o banco de horas agora. Atualize a página.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-blue-700">Saldo disponível para reservar</p>
            <p className="text-lg font-extrabold text-blue-800">{fmtHoras(saldoPlano + saldoCreditos)}</p>
            <p className="text-[11px] text-muted-foreground">
              {fmtHoras(saldoPlano)} do plano {periodoPlano}{saldoCreditos > 0 ? ` + ${fmtHoras(saldoCreditos)} em créditos extras` : ""}
            </p>
          </div>
        </div>
        {resumo?.permite_adicional && <p className="text-xs text-muted-foreground">Sem saldo: hora adicional {fmtBRL(Number(resumo.preco_adicional))}/h ou avulso</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="order-2 flex min-h-[260px] flex-col rounded-2xl border bg-slate-100 p-4 md:order-1">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700"><History className="h-4 w-4" />Consumidos e encerrados</h3>
            <span className="text-xs text-muted-foreground">Histórico</span>
          </div>
          <div className="space-y-3">
            {historico.length ? historico.map((c) => <CardHoras key={c.id} card={c} onAbrir={() => setAberto(c)} />)
              : <p className="py-6 text-center text-sm text-muted-foreground">Nenhum crédito consumido ainda.</p>}
          </div>
        </div>

        <div className="order-1 flex min-h-[260px] flex-col rounded-2xl border-2 border-blue-400 bg-slate-100 p-4 md:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />Créditos vigentes</h3>
            <div className="flex flex-wrap gap-2">{acaoVigentes}</div>
          </div>
          <div className="space-y-3">
            {vigentes.length ? vigentes.map((c) => <CardHoras key={c.id} card={c} onAbrir={() => setAberto(c)} />) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <CalendarClock className="h-6 w-6" />
                Sem créditos disponíveis agora. Novas reservas: adicional ou avulso.
              </div>
            )}
          </div>
        </div>
      </div>

      <Extrato card={aberto} admin={admin} onClose={() => setAberto(null)} onCancelado={() => { setRecarga((v) => v + 1); onAlterado?.(); }} />
    </div>
  );
}
