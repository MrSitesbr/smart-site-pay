import { horasDaReserva } from "@/lib/planoUso";
import { calculateReservationPrice } from "@/lib/reservationPricing";
import { getCobertura } from "@/lib/planosApi";

// Horários comparados como HH:MM e data como AAAA-MM-DD ("09:00" e "09:00:00" são o mesmo horário).
const CAMPOS_AGENDA: Record<string, number | null> = { data: 10, hora_inicio: 5, hora_fim: 5, sala_id: null, tipo: null };
const norm = (v: unknown, tamanho: number | null) => (v === "" || v == null ? null : tamanho ? String(v).slice(0, tamanho) : String(v));

/** Houve mudança de data, horário, sala ou tipo? Só nesses casos o valor da reserva é recalculado. */
export function mudouAgenda(reserva: Record<string, any>, original: Record<string, any> | null | undefined) {
  if (!original) return true;
  return Object.entries(CAMPOS_AGENDA).some(([campo, tamanho]) => norm(reserva[campo], tamanho) !== norm(original[campo], tamanho));
}

/**
 * Campos de preço de uma reserva editada pelo admin. Reservas sem mudança de agenda mantêm os valores
 * (nenhuma reserva é recalculada à toa). Quando a agenda muda, usa as regras do plano do cliente no banco.
 * Nunca bloqueia a edição: se o cálculo do plano falhar, cobra como avulso pelo preço da sala.
 */
export async function precificarEdicao(reserva: Record<string, any>, original: Record<string, any> | null | undefined, sala: any) {
  if (!mudouAgenda(reserva, original)) return {};
  const horas = horasDaReserva(reserva);
  const tipo = reserva.tipo === "diaria" ? "diaria" : "hora";
  const precoHora = sala?.preco_hora_avulsa == null ? null : Number(sala.preco_hora_avulsa);
  const precoDiaria = sala?.preco_diaria == null ? null : Number(sala.preco_diaria);
  const avulso = () => {
    const pricing = calculateReservationPrice({ tipo, horas, saldo: 0, precoHora, precoDiaria });
    return {
      plano_id: null,
      tipo_cobranca: reserva.cliente_corp_id ? "avulso" : reserva.tipo_cobranca ?? null,
      valor: pricing.valor, valor_original: pricing.valor,
      horas_reservadas: horas, horas_cobertas_plano: 0, horas_excedentes: pricing.excedentes,
      calculo_justificativa: "Reserva avulsa conforme o preço configurado para a sala.",
    };
  };
  if (!reserva.cliente_corp_id || !reserva.data || !reserva.sala_id) return avulso();

  try {
    const cov = await getCobertura(reserva.cliente_corp_id, String(reserva.data).slice(0, 10), horas, reserva.sala_id,
      String(reserva.hora_inicio).slice(0, 5), reserva.id);
    if (cov.status === "sem_plano") return avulso();
    const cobertas = Number(cov.cobertas || 0);
    const excedentes = Number(cov.excedentes || 0);
    const adicional = excedentes > 0 && cov.permite_adicional && reserva.tipo_cobranca === "adicional";
    let valor: number | null = 0;
    if (excedentes > 0) {
      if (adicional) valor = excedentes * Number(cov.preco_adicional || 0);
      else if (tipo === "diaria" && cobertas === 0) valor = precoDiaria;
      else valor = excedentes * (precoHora ?? Number(cov.preco_avulso || 0));
    }
    const tipoCobranca = excedentes <= 0 ? (cov.estacao ? "estacao" : "plano") : adicional ? "adicional" : "avulso";
    return {
      plano_id: cobertas > 0 || adicional ? cov.plano_id : null,
      tipo_cobranca: tipoCobranca,
      valor, valor_original: valor,
      horas_reservadas: horas, horas_cobertas_plano: cobertas, horas_excedentes: excedentes,
      calculo_justificativa: cobertas > 0
        ? `${cobertas}h cobertas pelo plano ${cov.plano_nome}${excedentes ? `; ${excedentes}h ${adicional ? "adicionais" : "avulsas"}` : ""}.`
        : `Sem saldo no plano ${cov.plano_nome}: ${excedentes}h ${adicional ? "adicionais" : "avulsas"}.`,
    };
  } catch {
    return avulso();
  }
}
