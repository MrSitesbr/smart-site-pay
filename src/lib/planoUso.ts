import { supabase } from "@/integrations/supabase/client";

export type PlanoUso = {
  horasContratadas: number;
  horasUsadas: number;
  saldo: number;
  percentual: number;
  periodoInicio: string;
  periodoFim: string;
  periodoLabel: string;
  ilimitado: boolean;
  reservas: any[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function periodoDoPlano(plano: any): { inicio: Date; fim: Date; label: string; ilimitado: boolean } {
  const hoje = new Date();
  const modo = String(plano?.periodo_apuracao || "mensal");

  if (modo === "ilimitado") {
    return { inicio: new Date(2000, 0, 1), fim: new Date(2100, 0, 1), label: "Sem limite de período", ilimitado: true };
  }

  if (modo === "validade" && Number(plano?.validade_dias) > 0) {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - Number(plano.validade_dias) + 1);
    return { inicio, fim: hoje, label: `Últimos ${plano.validade_dias} dias`, ilimitado: false };
  }

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    inicio,
    fim,
    label: inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    ilimitado: false,
  };
}

export function horasDaReserva(r: any): number {
  if (!r?.hora_inicio || !r?.hora_fim) return 0;
  const [hi, mi] = String(r.hora_inicio).split(":").map(Number);
  const [hf, mf] = String(r.hora_fim).split(":").map(Number);
  const minutos = (hf * 60 + mf) - (hi * 60 + mi);
  return minutos > 0 ? minutos / 60 : 0;
}

/** Consumo do plano de um cliente: reservas confirmadas/realizadas dentro do período vigente. */
export async function calcularUsoPlano(emails: string[], plano: any, excludeReservationId?: string): Promise<PlanoUso> {
  const periodo = periodoDoPlano(plano);
  const contratadas = Number(plano?.horas_incluidas ?? plano?.quantidade_horas ?? 0);
  const lista = emails.filter(Boolean).map((e) => e.trim().toLowerCase());

  let reservas: any[] = [];
  if (lista.length) {
    const { data } = await supabase
      .from("reservations")
      .select("*, salas(nome), unidades(nome)")
      .in("email", lista)
      .in("status", ["confirmada", "realizada"])
      .gte("data", iso(periodo.inicio))
      .lte("data", iso(periodo.fim))
      .order("data", { ascending: false });
    reservas = (data || []).filter((reserva) => reserva.id !== excludeReservationId);
  }

  const usadas = reservas.reduce((acc, r) => acc + horasDaReserva(r), 0);
  const saldo = contratadas > 0 ? Math.max(0, contratadas - usadas) : 0;
  const percentual = contratadas > 0 ? Math.min(100, (usadas / contratadas) * 100) : 0;

  return {
    horasContratadas: contratadas,
    horasUsadas: Math.round(usadas * 100) / 100,
    saldo: Math.round(saldo * 100) / 100,
    percentual,
    periodoInicio: iso(periodo.inicio),
    periodoFim: iso(periodo.fim),
    periodoLabel: periodo.label,
    ilimitado: periodo.ilimitado,
    reservas,
  };
}

export const fmtHoras = (h: number) =>
  `${Math.floor(h)}h${Math.round((h % 1) * 60) ? String(Math.round((h % 1) * 60)).padStart(2, "0") : ""}`;
