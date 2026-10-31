import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, fmtData, type ResumoPlano } from "@/lib/planosApi";
import PlanosCards from "@/components/planos/PlanosCards";

export default function MeuPlano({ cliente, resumo, carregandoResumo }: { cliente: any; resumo: ResumoPlano | null; carregandoResumo?: boolean }) {
  const [planos, setPlanos] = useState<any[]>([]);
  const [planoAtual, setPlanoAtual] = useState<any>(null);
  const [reservas, setReservas] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [planoDesejado, setPlanoDesejado] = useState<string>("");
  const [mensagem, setMensagem] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"creditos" | "plano">("creditos");
  const [horasDesejadas, setHorasDesejadas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [cliente?.id, resumo?.plano_id, resumo?.janela_inicio]);

  async function carregar() {
    if (!cliente?.id) { setLoading(false); return; }
    setLoading(true);
    const [planosRes, solicRes, reservasRes] = await Promise.all([
      supabase.from("planos").select("*").is("deleted_at", null).order("ordem" as any).order("nome"),
      supabase.from("plano_solicitacoes").select("*, planos(nome)").eq("cliente_corp_id", cliente.id).order("created_at", { ascending: false }),
      resumo?.janela_inicio && resumo?.janela_fim
        ? supabase.from("reservations").select("*, salas(nome)").eq("cliente_corp_id", cliente.id).neq("status", "cancelada")
            .gte("data", resumo.janela_inicio).lte("data", resumo.janela_fim).order("data", { ascending: false })
        : Promise.resolve({ data: [] } as any),
    ]);
    const lista = (planosRes.data || []) as any[];
    setPlanos(lista.filter((p) => p.exibir_site !== false));
    setPlanoAtual(lista.find((p) => p.id === resumo?.plano_id) || null);
    setSolicitacoes(solicRes.data || []);
    setReservas(reservasRes.data || []);
    setLoading(false);
  }

  async function solicitar() {
    if (!cliente?.id) return;
    const horas = Number(horasDesejadas.replace(",", "."));
    if (tipoPedido === "creditos" && !(horas > 0)) return toast.error("Informe quantas horas deseja comprar");
    if (tipoPedido === "plano" && !planoDesejado && !mensagem.trim()) return toast.error("Escolha um plano ou escreva uma mensagem");
    setEnviando(true);
    const { error } = await (supabase.from("plano_solicitacoes") as any).insert([{
      cliente_corp_id: cliente.id,
      tipo: tipoPedido,
      horas: tipoPedido === "creditos" ? horas : null,
      plano_id: tipoPedido === "plano" ? planoDesejado || null : null,
      mensagem: mensagem.trim() || null,
      status: "pendente",
    }]);
    setEnviando(false);
    if (error) return toast.error("Não foi possível enviar a solicitação. Tente novamente.");
    toast.success("Pedido enviado para a equipe");
    setMensagem(""); setPlanoDesejado(""); setHorasDesejadas("");
    carregar();
  }

  if (loading || carregandoResumo) return <Card className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card>;

  const semPlano = !resumo || resumo.status === "sem_plano";

  return (
    <div className="space-y-4">
    {cliente?.id && (
      <PlanosCards
        clienteId={cliente.id}
        resumo={resumo}
        acaoVigentes={
          <Button size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700" onClick={() => document.getElementById("pedido-creditos")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            Comprar créditos / trocar plano
          </Button>
        }
      />
    )}
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 sm:p-6 lg:col-span-2 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Plano contratado</p>
            <h3 className="font-heading font-black text-2xl">{semPlano ? "Nenhum plano ativo" : resumo?.plano_nome}</h3>
            {planoAtual?.subtitulo && <p className="text-sm text-muted-foreground">{planoAtual.subtitulo}</p>}
          </div>
          {!semPlano && planoAtual?.preco != null && (
            <div className="text-right">
              <p className="font-heading font-black text-xl">{fmtBRL(Number(planoAtual.preco))}</p>
              <p className="text-xs text-muted-foreground">{planoAtual.cobranca === "unico" ? "pagamento único" : planoAtual.cobranca === "hora" ? "por hora" : "por mês"}</p>
            </div>
          )}
        </div>

        {semPlano && (
          <p className="text-sm text-muted-foreground">Sem plano ativo, suas reservas são cobradas como avulso ({fmtBRL(Number(resumo?.preco_avulso || 60))}/h). Solicite um plano ao lado.</p>
        )}

        {!semPlano && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Início:</span> {fmtData(resumo?.data_inicio)}</p>
            <p><span className="text-muted-foreground">Vencimento:</span> {resumo?.data_fim ? fmtData(resumo.data_fim) : "Sem prazo definido"}</p>
            {resumo?.permite_adicional && <p className="sm:col-span-2"><span className="text-muted-foreground">Hora adicional:</span> {fmtBRL(Number(resumo.preco_adicional))}/h, cobrada à parte</p>}
          </div>
        )}

        {planoAtual?.beneficios?.length > 0 && (
          <ul className="grid gap-1.5 text-sm">
            {planoAtual.beneficios.map((b: string) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{b}</li>)}
          </ul>
        )}

      </Card>

      <Card id="pedido-creditos" className="p-5 sm:p-6 space-y-4">
        <h4 className="font-heading font-bold">Comprar créditos ou trocar de plano</h4>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pedido">
          {(["creditos", "plano"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tipoPedido === t} onClick={() => setTipoPedido(t)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${tipoPedido === t ? "border-blue-600 bg-blue-50 text-blue-800" : "bg-background hover:bg-muted"}`}>
              {t === "creditos" ? "Mais horas" : "Trocar plano"}
            </button>
          ))}
        </div>
        {tipoPedido === "creditos" ? (
          <div className="space-y-2">
            <Label htmlFor="horas-desejadas">Quantas horas deseja comprar?</Label>
            <input id="horas-desejadas" inputMode="decimal" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={horasDesejadas} onChange={(e) => setHorasDesejadas(e.target.value)} placeholder="Ex.: 10" />
            <p className="text-xs text-muted-foreground">A equipe confirma o valor e libera os créditos no seu banco de horas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="plano-desejado">Plano desejado</Label>
            <select id="plano-desejado" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={planoDesejado} onChange={(e) => setPlanoDesejado(e.target.value)}>
              <option value="">Selecione…</option>
              {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.preco != null ? ` — ${fmtBRL(Number(p.preco))}` : ""}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="plano-mensagem">Mensagem (opcional)</Label>
          <Textarea id="plano-mensagem" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Conte para a equipe o que você precisa" />
        </div>
        <Button onClick={solicitar} disabled={enviando} className="w-full">
          {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar solicitação
        </Button>

        {solicitacoes.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Minhas solicitações</p>
            {solicitacoes.map((s) => (
              <div key={s.id} className="text-sm flex items-center justify-between gap-2">
                <span className="truncate">{s.tipo === "creditos" ? `Mais horas${s.horas ? ` · ${s.horas}h` : ""}` : s.planos?.nome || "Troca de plano"}</span>
                <Badge variant={s.status === "aprovada" ? "default" : s.status === "recusada" ? "destructive" : "secondary"}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
    </div>
  );
}
