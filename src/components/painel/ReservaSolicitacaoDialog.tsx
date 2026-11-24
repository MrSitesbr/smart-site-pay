import { useEffect, useState } from "react";
import { CalendarClock, Check, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/appErrors";
import {
  STATUS_SOLICITACAO_LABEL, TIPO_SOLICITACAO_LABEL, alterarReservaCliente, cancelarReservaCliente, descreverNovoHorario, podeSolicitarMudanca,
  type SolicitacaoReserva,
} from "@/lib/reservaSolicitacoes";

type Modo = "cancelamento" | "alteracao" | null;

export default function ReservaSolicitacaoDialog({
  reserva, salaNome, solicitacao, onOpenChange, onEnviada,
}: {
  reserva: any | null;
  salaNome?: string;
  solicitacao?: SolicitacaoReserva | null;
  onOpenChange: (aberto: boolean) => void;
  onEnviada: () => void;
}) {
  const [modo, setModo] = useState<Modo>(null);
  const [mensagem, setMensagem] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setModo(null);
    setMensagem("");
    setNovaData(reserva?.data || "");
    setNovoInicio(reserva?.hora_inicio?.slice(0, 5) || "");
    setNovoFim(reserva?.hora_fim?.slice(0, 5) || "");
    // Reinicia o formulário só quando outra reserva é aberta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserva?.id]);

  if (!reserva) return null;

  // Pedidos antigos ainda em análise continuam visíveis, mas não impedem o cliente de mudar sozinho.
  const pendente = solicitacao?.status === "pendente";
  const permitido = podeSolicitarMudanca(reserva);
  const dataBR = new Date(`${reserva.data}T12:00:00`).toLocaleDateString("pt-BR");

  async function enviar() {
    if (!modo) return;
    if (modo === "alteracao") {
      if (!novaData || !novoInicio || !novoFim) {
        toast({ title: "Revise o horário", description: "Informe a nova data, o início e o término.", variant: "destructive" });
        return;
      }
      if (novoFim <= novoInicio) {
        toast({ title: "Revise o horário", description: "O término deve ser depois do início.", variant: "destructive" });
        return;
      }
      if (novaData === reserva.data && novoInicio === reserva.hora_inicio?.slice(0, 5) && novoFim === reserva.hora_fim?.slice(0, 5)) {
        toast({ title: "Nada mudou", description: "Escolha uma data ou horário diferente do atual.", variant: "destructive" });
        return;
      }
    }
    if (modo === "cancelamento" && (mensagem.trim().length < 2 || mensagem.trim().length > 180)) {
      toast({ title: "Informe o motivo", description: "O motivo do cancelamento deve ter de 2 a 180 caracteres.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      if (modo === "alteracao") {
        await alterarReservaCliente({ reservaId: reserva.id, novaData, novoInicio, novoFim });
        const novaDataBR = new Date(`${novaData}T12:00:00`).toLocaleDateString("pt-BR");
        toast({ title: "Reserva alterada", description: `Agora é em ${novaDataBR}, das ${novoInicio} às ${novoFim}.` });
      } else {
        await cancelarReservaCliente(reserva.id, mensagem.trim());
        toast({ title: "Reserva cancelada", description: "O horário foi liberado na agenda." });
      }
      onEnviada();
      onOpenChange(false);
    } catch (error) {
      toast({ title: modo === "alteracao" ? "Não foi possível alterar" : "Não foi possível cancelar", description: friendlyError(error), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black">Sua reserva</DialogTitle>
          <DialogDescription>{salaNome || "Sala"} · {dataBR} · {reserva.hora_inicio?.slice(0, 5)}–{reserva.hora_fim?.slice(0, 5)}</DialogDescription>
        </DialogHeader>

        {solicitacao && (
          <div className={`rounded-md border p-3 text-sm ${pendente ? "border-amber-300 bg-amber-50" : "bg-muted/40"}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold">Pedido de {TIPO_SOLICITACAO_LABEL[solicitacao.tipo].toLowerCase()}</span>
              <Badge variant={solicitacao.status === "recusada" ? "destructive" : "secondary"}>{STATUS_SOLICITACAO_LABEL[solicitacao.status]}</Badge>
            </div>
            {descreverNovoHorario(solicitacao) && <p className="text-muted-foreground">Novo horário: {descreverNovoHorario(solicitacao)}</p>}
            {solicitacao.mensagem && <p className="text-muted-foreground">"{solicitacao.mensagem}"</p>}
            {solicitacao.admin_resposta && <p className="mt-1">Resposta da equipe: {solicitacao.admin_resposta}</p>}
          </div>
        )}

        {!permitido ? (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {["cancelada", "realizada"].includes(reserva.status)
              ? "Esta reserva não pode mais ser alterada."
              : "Alterações e cancelamentos só podem ser feitos com pelo menos 2 horas de antecedência. Para mudanças de última hora, fale com a recepção."}
          </p>
        ) : !modo ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setModo("alteracao")}><CalendarClock className="mr-2 h-4 w-4" />Alterar data ou horário</Button>
            <Button variant="outline" className="text-destructive" onClick={() => setModo("cancelamento")}><XCircle className="mr-2 h-4 w-4" />Cancelar reserva</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {modo === "alteracao" && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 space-y-1 sm:col-span-1"><Label htmlFor="nova-data">Nova data</Label><Input id="nova-data" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="novo-inicio">Início</Label><Input id="novo-inicio" type="time" step="1800" value={novoInicio} onChange={(e) => setNovoInicio(e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="novo-fim">Término</Label><Input id="novo-fim" type="time" step="1800" value={novoFim} onChange={(e) => setNovoFim(e.target.value)} /></div>
              </div>
            )}
            {modo === "cancelamento" && <div className="space-y-1">
              <Label htmlFor="mensagem-solicitacao">Motivo do cancelamento *</Label>
              <Textarea id="mensagem-solicitacao" rows={3} maxLength={180} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conte o motivo do cancelamento" />
              <p className="text-xs text-muted-foreground">
                {mensagem.trim().length}/180 · Com 24h ou mais de antecedência as horas voltam para o seu banco de horas; com menos de 24h elas ficam consumidas.
              </p>
            </div>}
            {modo === "alteracao" && (
              <p className="text-xs text-muted-foreground">A mudança vale na hora, na mesma sala, se o novo horário estiver livre, dentro do expediente da unidade e coberto pelo seu saldo.</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          {modo && permitido ? (
            <>
              <Button variant="ghost" onClick={() => setModo(null)} disabled={enviando}>Voltar</Button>
              <Button onClick={() => void enviar()} disabled={enviando} variant={modo === "cancelamento" ? "destructive" : "default"}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {modo === "cancelamento" ? "Confirmar cancelamento" : "Confirmar alteração"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
