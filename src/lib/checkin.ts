import { supabase } from "@/integrations/supabase/client";

/** A reserva já terminou (data + hora_fim no passado)? */
export function reservaEncerrada(reserva: { data?: string | null; hora_fim?: string | null }, agora = new Date()) {
  if (!reserva.data || !reserva.hora_fim) return false;
  return new Date(`${reserva.data}T${reserva.hora_fim.slice(0, 5)}:00`) <= agora;
}

/**
 * Status exibido de forma dinâmica:
 * - confirmada com horário encerrado = realizada (checkout automático);
 * - pendente com horário encerrado = sem check-in.
 */
export function statusExibido(reserva: { status?: string | null; data?: string | null; hora_fim?: string | null }) {
  const status = reserva.status || "pendente";
  if (!reservaEncerrada(reserva)) return status;
  if (status === "confirmada") return "realizada";
  if (status === "pendente") return "pendente · sem check-in";
  return status;
}

/** Registra (confirma a reserva) ou estorna (volta para pendente) o check-in. */
export async function alternarCheckin(reservaId: string, temCheckin: boolean) {
  if (temCheckin) {
    const { error } = await supabase.from("checkins").delete().eq("reservation_id", reservaId);
    if (error) return { checkin: null, error };
    const { error: statusError } = await supabase.from("reservations").update({ status: "pendente" }).eq("id", reservaId);
    return { checkin: null, error: statusError };
  }
  const { data, error } = await supabase.from("checkins").insert({ reservation_id: reservaId }).select().single();
  if (error) return { checkin: null, error };
  const { error: statusError } = await supabase.from("reservations").update({ status: "confirmada" }).eq("id", reservaId);
  return { checkin: data, error: statusError };
}

/** Aplica o checkout automático das reservas cujo horário já terminou. Falha silenciosa: a tela segue funcionando. */
export async function finalizarReservasEncerradas() {
  const { error } = await supabase.rpc("finalize_finished_reservations");
  if (error) console.warn("Checkout automático indisponível:", error.message);
}
