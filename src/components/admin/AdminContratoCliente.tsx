import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CalendarClock, CheckCircle2, History, Loader2, RefreshCw, Repeat, XCircle } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/appErrors";
import { fmtHoras, horasDaReserva } from "@/lib/planoUso";
import {
  encerrarContrato, fmtBRL, fmtData, getResumoPlano, renovarContrato, salvarContrato, STATUS_PLANO_LABEL, type ResumoPlano,
} from "@/lib/planosApi";
import UsoPlanoBarras, { STATUS_BADGE } from "@/components/planos/UsoPlanoBarras";

const ACAO_LABEL: Record<string, string> = {
  importado_para_revisao: "Importado para revisão",
  contratado: "Plano contratado",
  revisado: "Revisão confirmada",
  encerrado: "Contrato encerrado",
  alterado: "Contrato alterado",
};

const isoHoje = () => new Date().toISOString().slice(0, 10);

function addMeses(iso: string, meses: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function inicioSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

/**
 * Reservas futuras que ficariam fora da cota com o plano escolhido (para avisar o cliente antes de ativar).
 * Segue as mesmas regras de public.plano_cobertura, sem gravar nada.
 */
export function reservasForaDaCota(reservas: any[], plano: any, inicio: string, horasCombinadas?: number | null) {
  if (!plano) return [];
  const hoje = isoHoje();
  const futuras = reservas
    .filter((r) => r.status !== "cancelada" && r.data >= hoje && r.data >= inicio)
    .sort((a, b) => `${a.data}${a.hora_inicio}`.localeCompare(`${b.data}${b.hora_inicio}`));
  const regra = plano.regra_uso;
  if (regra === "avulso" || regra === "sem_horas") return futuras.map((r) => ({ ...r, fora: horasDaReserva(r) }));

  const fim = plano.duracao_meses ? addMeses(inicio, plano.duracao_meses) : null;
  const usado: Record<string, number> = {};
  const fora: any[] = [];
  for (const r of futuras) {
    const horas = horasDaReserva(r);
    if (fim && r.data > fim) { fora.push({ ...r, fora: horas }); continue; }
    const chave = regra === "semanal" ? inicioSemana(r.data) : regra === "pacote" ? "pacote" : r.data.slice(0, 7);
    const cota = Number(horasCombinadas ?? (regra === "semanal" ? plano.horas_semana : regra === "pacote" ? plano.quantidade_horas : plano.horas_reuniao_mes) ?? 0);
    const jaUsado = usado[chave] || 0;
    const saldo = plano.bloco_unico && regra === "semanal" && jaUsado > 0 ? 0 : Math.max(0, cota - jaUsado);
    const cobertas = Math.min(saldo, horas);
    usado[chave] = jaUsado + cobertas;
    if (horas - cobertas > 0) fora.push({ ...r, fora: horas - cobertas });
  }
  return fora;
}

/** Média de horas por semana nas últimas 8 semanas: ajuda a escolher entre Harmonia Hora, Período ou Diária. */
function mediaSemanal(reservas: any[]) {
  const hoje = new Date();
  const corte = new Date(hoje);
  corte.setDate(corte.getDate() - 56);
  const iso = corte.toISOString().slice(0, 10);
  const passadas = reservas.filter((r) => r.status !== "cancelada" && r.data >= iso && r.data < isoHoje());
  const horas = passadas.reduce((acc, r) => acc + horasDaReserva(r), 0);
  const maiorBloco = passadas.reduce((acc, r) => Math.max(acc, horasDaReserva(r)), 0);
  return { media: horas / 8, maiorBloco, total: passadas.length };
}

type DialogModo = "revisar" | "contratar" | "trocar";

export function ContratoDialog({
  open, onOpenChange, modo, clienteId, resumo, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; modo: DialogModo; clienteId: string; resumo: ResumoPlano | null; onSaved: () => void }) {
  const [planos, setPlanos] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [planoId, setPlanoId] = useState("");
  const [inicio, setInicio] = useState(isoHoje());
  const [fim, setFim] = useState("");
  const [fimManual, setFimManual] = useState(false);
  const [valor, setValor] = useState("");
  const [horas, setHoras] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("planos").select("*").is("deleted_at", null).order("ordem" as any),
      supabase.from("reservations").select("id, data, hora_inicio, hora_fim, status, salas(nome)").eq("cliente_corp_id", clienteId).order("data"),
    ]).then(([p, r]) => { setPlanos(p.data || []); setReservas(r.data || []); });
    const manterPlano = modo === "revisar" && resumo?.plano_id;
    setPlanoId(manterPlano ? resumo!.plano_id! : "");
    setInicio(modo === "revisar" && resumo?.data_inicio ? resumo.data_inicio : isoHoje());
    setFimManual(false);
    setValor("");
    setHoras("");
    setObs("");
  }, [open, modo, clienteId, resumo]);

  const plano = planos.find((p) => p.id === planoId);
  useEffect(() => {
    if (!plano) return;
    if (!fimManual) setFim(plano.duracao_meses && inicio ? addMeses(inicio, plano.duracao_meses) : "");
    setValor((v) => (v === "" ? String(plano.preco ?? "") : v));
  }, [plano, inicio, fimManual]);

  const historico = useMemo(() => mediaSemanal(reservas), [reservas]);
  const foraDaCota = useMemo(
    () => (plano && inicio ? reservasForaDaCota(reservas, plano, inicio, horas === "" ? null : Number(horas)) : []),
    [reservas, plano, inicio, horas],
  );

  async function salvar() {
    if (!planoId) return toast.error("Escolha o plano.");
    if (!inicio) return toast.error("Informe a data de início.");
    if (fim && fim < inicio) return toast.error("O vencimento deve ser depois do início.");
    setSalvando(true);
    try {
      await salvarContrato({
        // Sem edição manual, o banco calcula o vencimento pela duração do plano.
        clienteId, planoId, inicio, fim: fimManual ? fim || null : null,
        valor: valor === "" ? null : Number(valor.replace(",", ".")),
        horas: horas === "" ? null : Number(horas.replace(",", ".")),
        observacoes: obs.trim() || null,
      });
      toast.success(modo === "revisar" ? "Revisão confirmada" : "Plano salvo");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível salvar o contrato."));
    } finally {
      setSalvando(false);
    }
  }

  const titulo = modo === "revisar" ? "Revisar plano do cliente" : modo === "trocar" ? "Trocar plano" : "Contratar plano";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {modo === "revisar" ? "Confirme o plano correto e a data real de início. Ao confirmar, passam a valer as regras oficiais do plano."
              : modo === "trocar" ? "O contrato atual será encerrado e um novo começará na data informada." : "Defina o plano, o início e os valores combinados."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Plano</Label>
              <Select value={planoId || undefined} onValueChange={(v) => { setPlanoId(v); setValor(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {fmtBRL(Number(p.preco || 0))}{p.subtitulo ? ` · ${p.subtitulo}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-inicio">Início</Label>
              <Input id="contrato-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-fim">Vencimento</Label>
              <Input id="contrato-fim" type="date" value={fim} onChange={(e) => { setFim(e.target.value); setFimManual(true); }} />
              <p className="text-xs text-muted-foreground">{plano?.duracao_meses ? `Calculado: ${plano.duracao_meses} meses.` : "Deixe vazio para mensalidade sem prazo."}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-valor">Valor combinado (R$)</Label>
              <Input id="contrato-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-horas">Horas combinadas (opcional)</Label>
              <Input id="contrato-horas" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Padrão do plano" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contrato-obs">Observações</Label>
              <Textarea id="contrato-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-semibold">Histórico de uso (últimas 8 semanas)</p>
            <p className="text-muted-foreground">
              {historico.total} reserva(s) · média de {fmtHoras(historico.media)} por semana · maior bloco: {fmtHoras(historico.maiorBloco)}
            </p>
          </div>

          {plano && (
            foraDaCota.length ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> {foraDaCota.length} reserva(s) futura(s) ficariam fora da cota com este plano</p>
                <p className="text-xs">Elas continuam valendo e não são recalculadas. Avise o cliente sobre a nova regra.</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {foraDaCota.map((r) => (
                    <li key={r.id}>{fmtData(r.data)} · {r.hora_inicio?.slice(0, 5)}–{r.hora_fim?.slice(0, 5)} · {fmtHoras(r.fora)} fora{r.salas?.nome ? ` · ${r.salas.nome}` : ""}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="h-4 w-4" /> Todas as reservas futuras cabem na cota deste plano.
              </p>
            )
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !planoId}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {modo === "revisar" ? "Confirmar revisão" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ficha do cliente: plano contratado, uso, ações e histórico. */
export default function AdminContratoCliente({ clienteId, onChanged }: { clienteId: string; onChanged?: () => void }) {
  const [resumo, setResumo] = useState<ResumoPlano | null>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogModo | null>(null);
  const [acao, setAcao] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [r, c, e] = await Promise.all([
        getResumoPlano(clienteId),
        (supabase.from("cliente_planos" as any) as any).select("*, planos(nome)").eq("cliente_corp_id", clienteId).order("created_at", { ascending: false }),
        (supabase.from("cliente_plano_eventos" as any) as any).select("*").eq("cliente_corp_id", clienteId).order("created_at", { ascending: false }).limit(50),
      ]);
      setResumo(r);
      setContratos(c.data || []);
      setEventos(e.data || []);
    } catch (error) {
      setErro(friendlyError(error, "Não foi possível carregar o plano do cliente."));
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [clienteId]);

  const aberto = contratos.find((c) => c.status !== "encerrado");

  async function executar(nome: string, fn: () => Promise<unknown>, sucesso: string) {
    setAcao(nome);
    try {
      await fn();
      toast.success(sucesso);
      await carregar();
      onChanged?.();
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível concluir a ação."));
    } finally {
      setAcao(null);
    }
  }

  function renovar() {
    if (!aberto || !confirm("Renovar o contrato por mais um período?")) return;
    executar("renovar", () => renovarContrato(aberto.id), "Contrato renovado");
  }

  function encerrar() {
    if (!aberto) return;
    const motivo = prompt("Motivo do encerramento (opcional):");
    if (motivo === null) return;
    executar("encerrar", () => encerrarContrato(aberto.id, motivo), "Contrato encerrado");
  }

  if (loading) return <Card className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (erro) return <Card className="p-6 text-sm text-destructive">{erro} <Button variant="link" onClick={carregar}>Tentar novamente</Button></Card>;

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Plano contratado</p>
            <h3 className="font-heading font-black text-2xl text-brand-blue-dark">{aberto ? aberto.planos?.nome || resumo?.plano_nome : "Sem plano"}</h3>
            {resumo && resumo.status !== "sem_plano" && (
              <Badge variant="outline" className={`mt-1 ${STATUS_BADGE[resumo.status] || ""}`}>{resumo.status === "a_revisar" ? "A revisar" : STATUS_PLANO_LABEL[resumo.status]}</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {aberto?.status === "a_revisar" && (
              <Button size="sm" onClick={() => setDialog("revisar")} className="bg-brand-orange text-white"><CheckCircle2 className="mr-2 h-4 w-4" />Revisar plano</Button>
            )}
            {!aberto && <Button size="sm" onClick={() => setDialog("contratar")}><CalendarClock className="mr-2 h-4 w-4" />Contratar plano</Button>}
            {aberto && (
              <>
                <Button size="sm" variant="outline" onClick={renovar} disabled={!!acao}>
                  {acao === "renovar" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Renovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog("trocar")} disabled={!!acao}><Repeat className="mr-2 h-4 w-4" />Trocar</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={encerrar} disabled={!!acao}>
                  {acao === "encerrar" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Encerrar
                </Button>
              </>
            )}
          </div>
        </div>

        {aberto && (
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="text-muted-foreground">Início:</span> {fmtData(aberto.data_inicio)}{aberto.data_sugerida ? " (sugerida)" : ""}</p>
            <p><span className="text-muted-foreground">Vencimento:</span> {aberto.data_fim ? fmtData(aberto.data_fim) : "Sem prazo"}</p>
            <p><span className="text-muted-foreground">Valor combinado:</span> {aberto.valor_combinado != null ? fmtBRL(Number(aberto.valor_combinado)) : "—"}</p>
            <p><span className="text-muted-foreground">Horas combinadas:</span> {aberto.horas_combinadas != null ? fmtHoras(Number(aberto.horas_combinadas)) : "Padrão do plano"}</p>
          </div>
        )}
        {aberto?.status === "a_revisar" && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Contrato importado: segue a regra anterior e não vence nem bloqueia até a revisão. Confirme o plano e a data de início.
          </p>
        )}
        {resumo && resumo.status !== "sem_plano" && <UsoPlanoBarras resumo={resumo} compacto />}
        {aberto?.observacoes && <p className="text-xs text-muted-foreground">{aberto.observacoes}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <h4 className="mb-3 flex items-center gap-2 font-heading font-bold"><History className="h-4 w-4" /> Histórico do plano</h4>
        {eventos.length ? (
          <ul className="space-y-2 text-sm">
            {eventos.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                <span>
                  <strong>{ACAO_LABEL[ev.acao] || ev.acao}</strong>
                  {ev.detalhes?.plano_nome ? ` · ${ev.detalhes.plano_nome}` : ""}
                  {ev.detalhes?.data_inicio ? ` · ${fmtData(ev.detalhes.data_inicio)}` : ""}
                  {ev.detalhes?.data_fim ? ` a ${fmtData(ev.detalhes.data_fim)}` : ""}
                  {ev.detalhes?.motivo ? ` · ${ev.detalhes.motivo}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>}
      </Card>

      {dialog && (
        <ContratoDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)} modo={dialog} clienteId={clienteId} resumo={resumo}
          onSaved={() => { carregar(); onChanged?.(); }} />
      )}
    </div>
  );
}
