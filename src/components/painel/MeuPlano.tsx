import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { calcularUsoPlano, fmtHoras, type PlanoUso } from "@/lib/planoUso";

export default function MeuPlano({ cliente, emails }: { cliente: any; emails: string[] }) {
  const [uso, setUso] = useState<PlanoUso | null>(null);
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [planoDesejado, setPlanoDesejado] = useState<string>("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [cliente?.id]);

  async function carregar() {
    setLoading(true);
    const [{ data: planosData }, solic] = await Promise.all([
      supabase.from("planos").select("*").is("deleted_at", null).order("nome"),
      cliente?.id
        ? supabase.from("plano_solicitacoes").select("*, planos(nome)").eq("cliente_corp_id", cliente.id).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] } as any),
    ]);
    setPlanos(planosData || []);
    setSolicitacoes(solic.data || []);
    setUso(await calcularUsoPlano(emails, cliente?.planos || null));
    setLoading(false);
  }

  async function solicitar() {
    if (!cliente?.id) return;
    if (!planoDesejado && !mensagem.trim()) return toast.error("Escolha um plano ou escreva uma mensagem");
    setEnviando(true);
    const { error } = await (supabase.from("plano_solicitacoes") as any).insert([{
      cliente_corp_id: cliente.id,
      plano_id: planoDesejado || null,
      mensagem: mensagem || null,
      status: "pendente",
    }]);
    setEnviando(false);
    if (error) return toast.error("Erro ao enviar: " + error.message);
    toast.success("Solicitação enviada para a equipe");
    setMensagem(""); setPlanoDesejado("");
    carregar();
  }

  if (loading) return <Card className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Plano ativo</p>
          <h3 className="font-heading font-black text-2xl">{cliente?.planos?.nome || "Nenhum plano vinculado"}</h3>
          <p className="text-sm text-muted-foreground">Período de apuração: {uso?.periodoLabel}</p>
        </div>

        {uso && !uso.ilimitado && uso.horasContratadas > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3 text-center">
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Contratadas</p><p className="font-heading font-black text-xl">{fmtHoras(uso.horasContratadas)}</p></div>
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Utilizadas</p><p className="font-heading font-black text-xl">{fmtHoras(uso.horasUsadas)}</p></div>
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Saldo</p><p className="font-heading font-black text-xl">{fmtHoras(uso.saldo)}</p></div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-secondary transition-all" style={{ width: `${uso.percentual}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{uso?.ilimitado ? "Seu plano não tem limite de horas." : "Seu plano não tem horas incluídas configuradas."}</p>
        )}

        <div>
          <h4 className="font-bold text-sm mb-2">Reservas do período ({uso?.reservas.length || 0})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(uso?.reservas || []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <span>{new Date(r.data + "T00:00").toLocaleDateString("pt-BR")} · {r.hora_inicio?.slice(0, 5)}–{r.hora_fim?.slice(0, 5)}</span>
                <span className="text-muted-foreground text-xs">{r.salas?.nome || r.unidades?.nome || ""}</span>
              </div>
            ))}
            {!uso?.reservas.length && <p className="text-sm text-muted-foreground">Nenhuma reserva no período.</p>}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h4 className="font-heading font-bold">Solicitar outro plano</h4>
        <div className="space-y-2">
          <Label>Plano desejado</Label>
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={planoDesejado} onChange={(e) => setPlanoDesejado(e.target.value)}>
            <option value="">Selecione…</option>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Mensagem (opcional)</Label>
          <Textarea rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Conte para a equipe o que você precisa" />
        </div>
        <Button onClick={solicitar} disabled={enviando} className="w-full">
          {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar solicitação
        </Button>

        {solicitacoes.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Minhas solicitações</p>
            {solicitacoes.map((s) => (
              <div key={s.id} className="text-sm flex items-center justify-between gap-2">
                <span className="truncate">{s.planos?.nome || "Sem plano indicado"}</span>
                <Badge variant={s.status === "aprovada" ? "default" : s.status === "recusada" ? "destructive" : "secondary"}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
