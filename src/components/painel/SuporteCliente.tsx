import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, any> = { aberto: "secondary", em_andamento: "default", resolvido: "outline" };
const STATUS_LABEL: Record<string, string> = { aberto: "Aberto", em_andamento: "Em andamento", resolvido: "Resolvido" };

export default function SuporteCliente({ cliente }: { cliente: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<any | null>(null);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [novoTicket, setNovoTicket] = useState<{ assunto: string; corpo: string } | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [cliente?.id]);

  async function carregar() {
    if (!cliente?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").eq("cliente_corp_id", cliente.id).order("updated_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }

  async function abrirTicket(t: any) {
    setAberto(t);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at");
    setMensagens(data || []);
  }

  async function criar() {
    if (!novoTicket?.assunto.trim() || !novoTicket.corpo.trim()) return toast.error("Preencha assunto e mensagem");
    setEnviando(true);
    const { data, error } = await (supabase.from("support_tickets") as any)
      .insert([{ cliente_corp_id: cliente.id, assunto: novoTicket.assunto.trim(), status: "aberto", prioridade: "normal" }])
      .select().single();
    if (error || !data) { setEnviando(false); return toast.error("Erro ao abrir chamado: " + (error?.message || "")); }
    await (supabase.from("support_messages") as any).insert([{
      ticket_id: data.id, autor_tipo: "cliente", autor_nome: cliente?.responsavel_nome || cliente?.razao_social, corpo: novoTicket.corpo.trim(),
    }]);
    setEnviando(false);
    setNovoTicket(null);
    toast.success("Chamado aberto");
    await carregar();
    abrirTicket(data);
  }

  async function responder() {
    if (!resposta.trim() || !aberto) return;
    setEnviando(true);
    const { error } = await (supabase.from("support_messages") as any).insert([{
      ticket_id: aberto.id, autor_tipo: "cliente", autor_nome: cliente?.responsavel_nome || cliente?.razao_social, corpo: resposta.trim(),
    }]);
    if (!error) await (supabase.from("support_tickets") as any).update({ status: "aberto" }).eq("id", aberto.id);
    setEnviando(false);
    if (error) return toast.error("Erro ao enviar: " + error.message);
    setResposta("");
    abrirTicket(aberto);
  }

  if (!cliente?.id) return <Card className="p-6 text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</Card>;
  if (loading) return <Card className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card>;

  if (aberto) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setAberto(null)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
          <h3 className="font-heading font-black text-lg flex-1 truncate">{aberto.assunto}</h3>
          <Badge variant={STATUS_VARIANT[aberto.status] || "secondary"}>{STATUS_LABEL[aberto.status] || aberto.status}</Badge>
        </div>
        <div className="space-y-3 max-h-[45vh] overflow-y-auto">
          {mensagens.map((m) => (
            <div key={m.id} className={`rounded-xl p-3 text-sm ${m.autor_tipo === "cliente" ? "bg-muted ml-8" : "bg-secondary/10 mr-8"}`}>
              <p className="text-xs text-muted-foreground mb-1">{m.autor_tipo === "cliente" ? m.autor_nome || "Você" : "Equipe Coworking 013"} · {new Date(m.created_at).toLocaleString("pt-BR")}</p>
              <p className="whitespace-pre-wrap">{m.corpo}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Textarea rows={3} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Escreva sua mensagem" />
          <Button onClick={responder} disabled={enviando}>{enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-black text-lg">Suporte ({tickets.length})</h3>
        <Button size="sm" onClick={() => setNovoTicket({ assunto: "", corpo: "" })}><Plus className="w-4 h-4 mr-2" /> Abrir chamado</Button>
      </div>

      {novoTicket && (
        <Card className="p-5 space-y-4">
          <div className="space-y-2"><Label>Assunto</Label><Input value={novoTicket.assunto} onChange={(e) => setNovoTicket({ ...novoTicket, assunto: e.target.value })} /></div>
          <div className="space-y-2"><Label>Mensagem</Label><Textarea rows={4} value={novoTicket.corpo} onChange={(e) => setNovoTicket({ ...novoTicket, corpo: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button onClick={criar} disabled={enviando}>{enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enviar chamado</Button>
            <Button variant="ghost" onClick={() => setNovoTicket(null)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {tickets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum chamado aberto.</Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-secondary" onClick={() => abrirTicket(t)}>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{t.assunto}</p>
                <p className="text-xs text-muted-foreground">Atualizado em {new Date(t.updated_at).toLocaleString("pt-BR")}</p>
              </div>
              <Badge variant={STATUS_VARIANT[t.status] || "secondary"}>{STATUS_LABEL[t.status] || t.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
