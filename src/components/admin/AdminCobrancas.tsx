import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Receipt, RotateCcw, Search, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/appErrors";
import { fmtBRL, fmtData, fmtNumeroCadastro } from "@/lib/planosApi";

const TIPO_LABEL: Record<string, string> = { mensalidade: "Mensalidade", pacote: "Pacote", adicional: "Hora adicional", avulso: "Avulso", outro: "Outro" };
const FORMAS = ["PIX", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Boleto"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const hojeIso = () => new Date().toISOString().slice(0, 10);
const competenciaIso = (ano: number, mes: number) => `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

function situacao(c: any) {
  if (c.status === "pago") return "pago";
  if (c.status === "cancelado") return "cancelado";
  return c.vencimento && c.vencimento < hojeIso() ? "atrasado" : "a_receber";
}

const SITUACAO: Record<string, { label: string; className: string }> = {
  a_receber: { label: "A receber", className: "bg-sky-100 text-sky-800 border-sky-200" },
  atrasado: { label: "Em atraso", className: "bg-red-100 text-red-800 border-red-200" },
  pago: { label: "Pago", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelado: { label: "Cancelado", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

/** Controle manual de mensalidades, pacotes, horas adicionais e avulsas (sem integração bancária). */
export default function AdminCobrancas() {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [pagando, setPagando] = useState<any | null>(null);
  const [forma, setForma] = useState("PIX");
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [salvando, setSalvando] = useState(false);

  const competencia = competenciaIso(ano, mes);

  async function carregar() {
    setLoading(true);
    const { data, error } = await (supabase.from("cobrancas" as any) as any)
      .select("*, clientes_corp(razao_social, responsavel_nome, numero_cadastro)")
      .eq("competencia", competencia)
      .order("vencimento", { ascending: true });
    if (error) toast.error(friendlyError(error, "Não foi possível carregar as cobranças."));
    setLista(data || []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [competencia]);

  function mudarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  async function gerar() {
    setGerando(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_gerar_cobrancas", { p_competencia: competencia });
      if (error) throw error;
      const total = Number(data?.mensalidades || 0) + Number(data?.pacotes || 0) + Number(data?.reservas || 0);
      toast.success(total ? `${total} lançamento(s) criado(s)` : "Nada novo para lançar neste mês");
      await carregar();
    } catch (error) {
      toast.error(friendlyError(error, "Não foi possível gerar os lançamentos."));
    } finally {
      setGerando(false);
    }
  }

  async function atualizar(id: string, patch: Record<string, unknown>, sucesso: string) {
    setSalvando(true);
    const { error } = await (supabase.from("cobrancas" as any) as any).update(patch).eq("id", id);
    setSalvando(false);
    if (error) { toast.error(friendlyError(error, "Não foi possível atualizar o lançamento.")); return false; }
    toast.success(sucesso);
    await carregar();
    return true;
  }

  async function confirmarPagamento() {
    if (!pagando) return;
    const ok = await atualizar(pagando.id, { status: "pago", pago_em: dataPagamento, forma_pagamento: forma }, "Pagamento registrado");
    if (ok) setPagando(null);
  }

  const totais = useMemo(() => {
    const t = { aReceber: 0, recebido: 0, atraso: 0 };
    lista.forEach((c) => {
      const s = situacao(c);
      if (s === "pago") t.recebido += Number(c.valor);
      else if (s === "atrasado") { t.atraso += Number(c.valor); t.aReceber += Number(c.valor); }
      else if (s === "a_receber") t.aReceber += Number(c.valor);
    });
    return t;
  }, [lista]);

  const q = busca.trim().toLowerCase();
  const visiveis = lista.filter((c) => (filtro === "todos" || situacao(c) === filtro || c.tipo === filtro)
    && (!q || `${c.clientes_corp?.razao_social || ""} ${c.clientes_corp?.responsavel_nome || ""} ${c.descricao || ""}`.toLowerCase().includes(q)
      || String(c.clientes_corp?.numero_cadastro) === q.replace(/^n[º°o.]?\s*0*/, "")));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Mensalidades e cobranças</h2>
          <p className="text-muted-foreground">Controle manual: mensalidades, pacotes, horas adicionais e avulsas. Sem integração com banco ou maquininha.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-36 text-center font-semibold">{MESES[mes]} {ano}</span>
          <Button variant="outline" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">A receber</p><p className="text-2xl font-black text-brand-blue-dark">{fmtBRL(totais.aReceber)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Recebido</p><p className="text-2xl font-black text-emerald-700">{fmtBRL(totais.recebido)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Em atraso</p><p className="text-2xl font-black text-red-700">{fmtBRL(totais.atraso)}</p></Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, descrição ou nº de cadastro" className="pl-9" aria-label="Buscar lançamento" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="sm:w-52" aria-label="Filtrar lançamentos"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="a_receber">A receber</SelectItem>
            <SelectItem value="atrasado">Em atraso</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
            <SelectItem value="mensalidade">Mensalidades</SelectItem>
            <SelectItem value="pacote">Pacotes</SelectItem>
            <SelectItem value="adicional">Horas adicionais</SelectItem>
            <SelectItem value="avulso">Avulsos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={gerar} disabled={gerando} className="bg-brand-orange text-white">
          {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Gerar lançamentos do mês
        </Button>
      </div>

      {loading ? (
        <Card className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></Card>
      ) : !visiveis.length ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Receipt className="h-8 w-8" />
          <p>{lista.length ? "Nenhum lançamento com estes filtros." : "Nenhum lançamento neste mês. Use \"Gerar lançamentos do mês\"."}</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border bg-white">
          {visiveis.map((c) => {
            const s = situacao(c);
            return (
              <div key={c.id} className="grid gap-2 border-b p-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-center md:gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.clientes_corp?.razao_social || c.clientes_corp?.responsavel_nome || "Cliente"}</p>
                  <p className="truncate text-xs text-muted-foreground">{fmtNumeroCadastro(c.clientes_corp?.numero_cadastro)} · {c.descricao || TIPO_LABEL[c.tipo]}</p>
                </div>
                <div className="text-sm">
                  <p><Badge variant="outline" className="mr-2">{TIPO_LABEL[c.tipo] || c.tipo}</Badge>Venc. {fmtData(c.vencimento)}</p>
                  {c.status === "pago" && <p className="text-xs text-muted-foreground">Pago em {fmtData(c.pago_em)}{c.forma_pagamento ? ` · ${c.forma_pagamento}` : ""}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black">{fmtBRL(Number(c.valor))}</span>
                  <Badge variant="outline" className={SITUACAO[s].className}>{SITUACAO[s].label}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(s === "a_receber" || s === "atrasado") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setPagando(c); setForma("PIX"); setDataPagamento(hojeIso()); }}><CheckCircle2 className="mr-1 h-4 w-4" />Marcar como pago</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" disabled={salvando}
                        onClick={() => confirm("Cancelar este lançamento?") && atualizar(c.id, { status: "cancelado" }, "Lançamento cancelado")}><XCircle className="h-4 w-4" /></Button>
                    </>
                  )}
                  {(s === "pago" || s === "cancelado") && (
                    <Button size="sm" variant="ghost" disabled={salvando} title="Voltar para a receber"
                      onClick={() => confirm("Voltar este lançamento para \"a receber\"?") && atualizar(c.id, { status: "a_receber", pago_em: null, forma_pagamento: null }, "Lançamento reaberto")}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!pagando} onOpenChange={(o) => !o && setPagando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>{pagando?.descricao} · {fmtBRL(Number(pagando?.valor || 0))}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-pagamento">Data do pagamento</Label>
              <Input id="data-pagamento" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagando(null)} disabled={salvando}>Cancelar</Button>
            <Button onClick={confirmarPagamento} disabled={salvando || !dataPagamento}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
