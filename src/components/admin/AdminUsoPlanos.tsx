import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ClipboardCheck, Gauge, Loader2, RefreshCw, Search } from "lucide-react";
import { friendlyError } from "@/lib/appErrors";
import { fmtData, fmtNumeroCadastro, getPlanosOverview, nivelUso, STATUS_PLANO_LABEL, type ResumoClienteAdmin } from "@/lib/planosApi";
import UsoPlanoBarras, { STATUS_BADGE } from "@/components/planos/UsoPlanoBarras";
import { ContratoDialog } from "./AdminContratoCliente";

type Filtro = "todos" | "vencendo" | "saldo_baixo" | "a_revisar" | "vencido";

const SEMAFORO: Record<string, string> = { verde: "bg-emerald-500", amarelo: "bg-amber-500", vermelho: "bg-red-500" };

export function filtrarResumo(r: ResumoClienteAdmin, filtro: Filtro) {
  if (filtro === "a_revisar") return r.status === "a_revisar";
  if (filtro === "vencido") return r.status === "vencido";
  if (filtro === "vencendo") return r.status === "ativo" && r.dias_restantes != null && r.dias_restantes >= 0 && r.dias_restantes <= 15;
  if (filtro === "saldo_baixo") return r.status === "ativo" && r.cota > 0 && r.saldo <= r.cota * 0.25;
  return true;
}

export default function AdminUsoPlanos({ filtroInicial = "todos" }: { filtroInicial?: Filtro }) {
  const navigate = useNavigate();
  const [dados, setDados] = useState<ResumoClienteAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [unidade, setUnidade] = useState("todas");
  const [plano, setPlano] = useState("todos");
  const [busca, setBusca] = useState("");
  const [revisando, setRevisando] = useState<ResumoClienteAdmin | null>(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      setDados(await getPlanosOverview());
    } catch (error) {
      setErro(friendlyError(error, "Não foi possível carregar o uso dos planos."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const unidades = useMemo(() => Array.from(new Map(dados.filter((d) => d.unidade_id).map((d) => [d.unidade_id!, d.unidade_nome || "Unidade"])).entries()), [dados]);
  const planos = useMemo(() => Array.from(new Set(dados.map((d) => d.plano_nome).filter(Boolean))) as string[], [dados]);
  const contagem = useMemo(() => ({
    a_revisar: dados.filter((d) => filtrarResumo(d, "a_revisar")).length,
    vencendo: dados.filter((d) => filtrarResumo(d, "vencendo")).length,
    saldo_baixo: dados.filter((d) => filtrarResumo(d, "saldo_baixo")).length,
    vencido: dados.filter((d) => filtrarResumo(d, "vencido")).length,
  }), [dados]);

  const q = busca.trim().toLowerCase().replace(/^n[º°o.]?\s*/, "");
  const lista = dados.filter((d) =>
    filtrarResumo(d, filtro)
    && (unidade === "todas" || d.unidade_id === unidade)
    && (plano === "todos" || d.plano_nome === plano)
    && (!q || (d.nome || "").toLowerCase().includes(q) || (d.email || "").toLowerCase().includes(q) || String(d.numero_cadastro) === q.replace(/^0+/, "")));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Uso dos planos</h2>
          <p className="text-muted-foreground">Horas e prazo de cada cliente com plano. Verde: com folga · Amarelo: perto do fim · Vermelho: esgotado ou vencido.</p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Button>
      </div>

      {contagem.a_revisar > 0 && (
        <Card className="flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-amber-900">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">{contagem.a_revisar} plano(s) a revisar</p>
              <p className="text-sm">Confirme um a um o plano correto e a data de início. Até lá eles seguem a regra anterior e não vencem.</p>
            </div>
          </div>
          <Button variant="outline" className="border-amber-300 bg-white" onClick={() => setFiltro("a_revisar")}>Ver fila de revisão</Button>
        </Card>
      )}

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="todos">Todos ({dados.length})</TabsTrigger>
          <TabsTrigger value="a_revisar">A revisar ({contagem.a_revisar})</TabsTrigger>
          <TabsTrigger value="vencendo">Vencendo ({contagem.vencendo})</TabsTrigger>
          <TabsTrigger value="saldo_baixo">Saldo baixo ({contagem.saldo_baixo})</TabsTrigger>
          <TabsTrigger value="vencido">Vencidos ({contagem.vencido})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, e-mail ou nº de cadastro" className="pl-9" aria-label="Buscar cliente" />
        </div>
        <Select value={unidade} onValueChange={setUnidade}>
          <SelectTrigger className="sm:w-56" aria-label="Filtrar por unidade"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {unidades.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={plano} onValueChange={setPlano}>
          <SelectTrigger className="sm:w-56" aria-label="Filtrar por plano"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os planos</SelectItem>
            {planos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading && !dados.length ? (
        <Card className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></Card>
      ) : erro ? (
        <Card className="p-6 text-sm text-destructive">{erro} <Button variant="link" onClick={carregar}>Tentar novamente</Button></Card>
      ) : !lista.length ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          {filtro === "a_revisar" ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <Gauge className="h-8 w-8" />}
          <p>{filtro === "a_revisar" ? "Nenhum plano aguardando revisão." : "Nenhum cliente encontrado com estes filtros."}</p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((r) => {
            const nivel = nivelUso(r);
            return (
              <Card key={r.cliente_corp_id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEMAFORO[nivel]}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.nome || r.email}</p>
                      <p className="text-xs text-muted-foreground">{fmtNumeroCadastro(r.numero_cadastro)} · {r.plano_nome}{r.unidade_nome ? ` · ${r.unidade_nome}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE[r.status] || ""}>{r.status === "a_revisar" ? "A revisar" : STATUS_PLANO_LABEL[r.status]}</Badge>
                </div>
                <UsoPlanoBarras resumo={r} compacto />
                {r.status === "a_revisar" && <p className="text-xs text-muted-foreground">Início sugerido: {fmtData(r.data_inicio)}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.status === "a_revisar" && <Button size="sm" className="bg-brand-orange text-white" onClick={() => setRevisando(r)}>Revisar</Button>}
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/clientes-corp/${r.cliente_corp_id}`)}>Abrir ficha</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {revisando && (
        <ContratoDialog open={!!revisando} onOpenChange={(o) => !o && setRevisando(null)} modo="revisar"
          clienteId={revisando.cliente_corp_id} resumo={revisando} onSaved={carregar} />
      )}
    </div>
  );
}

/** Alertas de planos para a tela inicial do admin. */
export function AdminPlanosAlertas({ onAbrir }: { onAbrir: () => void }) {
  const [dados, setDados] = useState<ResumoClienteAdmin[] | null>(null);
  useEffect(() => { getPlanosOverview().then(setDados).catch(() => setDados([])); }, []);
  if (!dados) return null;
  const itens = [
    { label: "a revisar", n: dados.filter((d) => filtrarResumo(d, "a_revisar")).length, cor: "text-amber-700" },
    { label: "vencendo em 15 dias", n: dados.filter((d) => filtrarResumo(d, "vencendo")).length, cor: "text-amber-700" },
    { label: "com saldo baixo", n: dados.filter((d) => filtrarResumo(d, "saldo_baixo")).length, cor: "text-amber-700" },
    { label: "vencidos", n: dados.filter((d) => filtrarResumo(d, "vencido")).length, cor: "text-red-700" },
  ].filter((i) => i.n > 0);
  if (!itens.length) return null;
  return (
    <Card className="flex flex-col gap-3 border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-bold text-brand-blue-dark">Alertas de planos</p>
          <p className="text-sm">{itens.map((i, idx) => <span key={i.label} className={i.cor}>{idx ? " · " : ""}{i.n} {i.label}</span>)}</p>
        </div>
      </div>
      <Button variant="outline" className="bg-white" onClick={onAbrir}>Ver uso dos planos</Button>
    </Card>
  );
}
