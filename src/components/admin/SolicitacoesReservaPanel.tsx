import { useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/appErrors";
import { TIPO_SOLICITACAO_LABEL, concluirSolicitacao, descreverNovoHorario, inicioDaReserva, type SolicitacaoReserva } from "@/lib/reservaSolicitacoes";

const dataHoraBR = (valor: string) => new Date(valor).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Quanto falta para a reserva começar, para o admin priorizar o atendimento. */
function tempoAteInicio(reserva: any) {
  const minutos = Math.round((inicioDaReserva(reserva).getTime() - Date.now()) / 60000);
  if (minutos <= 0) return "já começou";
  if (minutos < 60) return `começa em ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 48) return `começa em ${horas}h${minutos % 60 ? String(minutos % 60).padStart(2, "0") : ""}`;
  return `começa em ${Math.floor(horas / 24)} dias`;
}

/** Detalhe de um pedido com as ações do admin; usado na lista e no card da reserva. */
export function SolicitacaoReservaCard({
  solicitacao, reserva, onAbrir, onCancelarReserva, onConcluida, compacto = false,
}: {
  solicitacao: SolicitacaoReserva;
  reserva?: any;
  onAbrir?: (reserva: any) => void;
  onCancelarReserva?: (reserva: any) => Promise<void> | void;
  onConcluida: () => void;
  compacto?: boolean;
}) {
  const [salvando, setSalvando] = useState<"resolvida" | "recusada" | "cancelar" | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [resposta, setResposta] = useState("");
  const cancelamento = solicitacao.tipo === "cancelamento";
  const novoHorario = descreverNovoHorario(solicitacao);

  async function concluir(status: "resolvida" | "recusada") {
    setSalvando(status);
    try {
      await concluirSolicitacao(solicitacao.id, status, resposta.trim() || undefined);
      toast({ title: status === "resolvida" ? "Solicitação resolvida" : "Solicitação recusada" });
      onConcluida();
    } catch (error) {
      toast({ title: "Não foi possível atualizar a solicitação", description: friendlyError(error), variant: "destructive" });
    } finally {
      setSalvando(null);
    }
  }

  async function cancelarReserva() {
    if (!reserva || !onCancelarReserva) return;
    setSalvando("cancelar");
    try {
      // O banco marca o pedido como resolvido quando a reserva é cancelada.
      await onCancelarReserva(reserva);
      onConcluida();
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className={`rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 ${compacto ? "" : "shadow-sm"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cancelamento ? "bg-red-600 text-white" : "bg-amber-500 text-black"}>
          Pedido de {TIPO_SOLICITACAO_LABEL[solicitacao.tipo].toLowerCase()}
        </Badge>
        {reserva && <span className="font-semibold">{reserva.nome}</span>}
        <span className="ml-auto text-xs opacity-80">enviado {dataHoraBR(solicitacao.created_at)}</span>
      </div>
      {reserva && !compacto && (
        <p className="mt-1 text-xs">
          Reserva: {new Date(`${reserva.data}T12:00:00`).toLocaleDateString("pt-BR")} · {reserva.hora_inicio?.slice(0, 5)}–{reserva.hora_fim?.slice(0, 5)} · <strong>{tempoAteInicio(reserva)}</strong>
        </p>
      )}
      {novoHorario && <p className="mt-1">Novo horário pedido: <strong>{novoHorario}</strong></p>}
      {solicitacao.mensagem && <p className="mt-1 italic">"{solicitacao.mensagem}"</p>}

      {recusando ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={2} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Motivo da recusa (o cliente verá esta resposta)" className="bg-white" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="destructive" disabled={!!salvando} onClick={() => void concluir("recusada")}>
              {salvando === "recusada" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}Confirmar recusa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRecusando(false)}>Voltar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {reserva && onAbrir && <Button size="sm" variant="outline" className="bg-white" onClick={() => onAbrir(reserva)}><Pencil className="mr-1 h-4 w-4" />Editar reserva</Button>}
          {cancelamento && reserva && onCancelarReserva && reserva.status !== "cancelada" && (
            <Button size="sm" variant="destructive" disabled={!!salvando} onClick={() => void cancelarReserva()}>
              {salvando === "cancelar" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}Cancelar reserva
            </Button>
          )}
          <Button size="sm" variant="outline" className="bg-white" disabled={!!salvando} onClick={() => void concluir("resolvida")}>
            {salvando === "resolvida" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Marcar como resolvida
          </Button>
          <Button size="sm" variant="ghost" disabled={!!salvando} onClick={() => setRecusando(true)}>Recusar</Button>
        </div>
      )}
    </div>
  );
}

/** Lista urgente de pedidos pendentes, mostrada no topo do calendário do admin. */
export default function SolicitacoesReservaPanel({
  solicitacoes, reservasPorId, onAbrir, onCancelarReserva, onConcluida,
}: {
  solicitacoes: SolicitacaoReserva[];
  reservasPorId: Record<string, any>;
  onAbrir: (reserva: any) => void;
  onCancelarReserva?: (reserva: any) => Promise<void> | void;
  onConcluida: () => void;
}) {
  if (!solicitacoes.length) return null;
  // Os pedidos de reservas mais próximas aparecem primeiro.
  const ordenadas = [...solicitacoes].sort((a, b) => {
    const ra = reservasPorId[a.reservation_id], rb = reservasPorId[b.reservation_id];
    if (!ra || !rb) return ra ? -1 : rb ? 1 : 0;
    return inicioDaReserva(ra).getTime() - inicioDaReserva(rb).getTime();
  });

  return (
    <div className="border-b border-amber-300 bg-amber-100/60 p-4">
      <div className="mb-3 flex items-center gap-2 font-heading font-bold text-amber-900">
        <AlertTriangle className="h-5 w-5" />
        {solicitacoes.length} {solicitacoes.length === 1 ? "solicitação de cliente aguardando" : "solicitações de clientes aguardando"} resposta
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {ordenadas.map((solicitacao) => (
          <SolicitacaoReservaCard
            key={solicitacao.id}
            solicitacao={solicitacao}
            reserva={reservasPorId[solicitacao.reservation_id]}
            onAbrir={onAbrir}
            onCancelarReserva={onCancelarReserva}
            onConcluida={onConcluida}
          />
        ))}
      </div>
    </div>
  );
}
