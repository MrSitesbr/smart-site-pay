import { supabase } from "@/integrations/supabase/client";

export type SolicitacaoReserva = {
  id: string;
  reservation_id: string;
  cliente_corp_id: string | null;
  tipo: "cancelamento" | "alteracao";
  mensagem: string | null;
  nova_data: string | null;
  novo_inicio: string | null;
  novo_fim: string | null;
  status: "pendente" | "resolvida" | "recusada";
  admin_resposta: string | null;
  created_at: string;
  resolved_at: string | null;
};

/** Antecedência mínima para o cliente pedir cancelamento ou alteração. */
export const ANTECEDENCIA_MINIMA_MS = 2 * 60 * 60 * 1000;

export const TIPO_SOLICITACAO_LABEL: Record<SolicitacaoReserva["tipo"], string> = {
  cancelamento: "Cancelamento",
  alteracao: "Alteração",
};

export const STATUS_SOLICITACAO_LABEL: Record<SolicitacaoReserva["status"], string> = {
  pendente: "Em análise",
  resolvida: "Resolvida",
  recusada: "Recusada",
};

// A tabela é nova e ainda não está nos tipos gerados do Supabase.
const tabela = () => (supabase.from("reservation_change_requests" as any) as any);

export function inicioDaReserva(reserva: { data: string; hora_inicio: string }) {
  return new Date(`${reserva.data}T${String(reserva.hora_inicio).slice(0, 5)}:00`);
}

/** O cliente só pode pedir mudanças em reservas ativas que começam daqui a pelo menos 2h. */
export function podeSolicitarMudanca(reserva: any, agora = new Date()) {
  if (!reserva?.data || !reserva?.hora_inicio) return false;
  if (["cancelada", "realizada"].includes(reserva.status)) return false;
  return inicioDaReserva(reserva).getTime() - agora.getTime() >= ANTECEDENCIA_MINIMA_MS;
}

/** Último pedido de cada reserva, indexado pelo id da reserva. */
export function indexarPorReserva(lista: SolicitacaoReserva[]) {
  const mapa: Record<string, SolicitacaoReserva> = {};
  for (const item of lista) {
    const atual = mapa[item.reservation_id];
    if (!atual || item.created_at > atual.created_at) mapa[item.reservation_id] = item;
  }
  return mapa;
}

export async function carregarSolicitacoesDoCliente(clienteId: string) {
  const { data, error } = await tabela().select("*").eq("cliente_corp_id", clienteId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SolicitacaoReserva[];
}

export async function carregarSolicitacoesPendentes() {
  const { data, error } = await tabela().select("*").eq("status", "pendente").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as SolicitacaoReserva[];
}

export async function enviarSolicitacao(params: {
  reservaId: string;
  tipo: SolicitacaoReserva["tipo"];
  mensagem?: string;
  novaData?: string | null;
  novoInicio?: string | null;
  novoFim?: string | null;
}) {
  const { error } = await (supabase.rpc as any)("request_reservation_change", {
    p_reservation_id: params.reservaId,
    p_tipo: params.tipo,
    p_mensagem: params.mensagem || null,
    p_nova_data: params.novaData || null,
    p_novo_inicio: params.novoInicio || null,
    p_novo_fim: params.novoFim || null,
  });
  if (error) throw error;
}

export async function concluirSolicitacao(id: string, status: "resolvida" | "recusada", resposta?: string) {
  const { data, error } = await tabela()
    .update({ status, admin_resposta: resposta || null, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("A solicitação não foi atualizada. Atualize a página e tente novamente.");
}

export function descreverNovoHorario(s: Pick<SolicitacaoReserva, "nova_data" | "novo_inicio" | "novo_fim">) {
  const partes: string[] = [];
  if (s.nova_data) partes.push(new Date(`${s.nova_data}T12:00:00`).toLocaleDateString("pt-BR"));
  if (s.novo_inicio) partes.push(`${s.novo_inicio.slice(0, 5)}${s.novo_fim ? `–${s.novo_fim.slice(0, 5)}` : ""}`);
  return partes.join(" · ");
}
