import { supabase } from "@/integrations/supabase/client";
import { getDateInfo, isHoliday } from "@/lib/holidays";

/** Horário de uma unidade num dia da semana (1 = segunda ... 7 = domingo). */
export type HorarioDia = { unidade_id: string; dia_semana: number; abre: string; fecha: string; fechado: boolean };
export type MapaHorarios = Map<string, HorarioDia[]>;

export const DIAS_SEMANA = [
  { dia: 1, nome: "Segunda" }, { dia: 2, nome: "Terça" }, { dia: 3, nome: "Quarta" }, { dia: 4, nome: "Quinta" },
  { dia: 5, nome: "Sexta" }, { dia: 6, nome: "Sábado" }, { dia: 7, nome: "Domingo" },
];

/** Dia da semana no padrão do banco: segunda = 1, domingo = 7. */
export const diaSemanaIso = (data: Date) => ((data.getDay() + 6) % 7) + 1;

export async function carregarHorarios(): Promise<MapaHorarios> {
  const { data } = await (supabase.from("unidade_horarios" as any) as any).select("unidade_id, dia_semana, abre, fecha, fechado");
  const mapa: MapaHorarios = new Map();
  for (const h of (data || []) as HorarioDia[]) {
    const lista = mapa.get(h.unidade_id) || [];
    lista.push({ ...h, abre: String(h.abre).slice(0, 5), fecha: String(h.fecha).slice(0, 5) });
    mapa.set(h.unidade_id, lista);
  }
  return mapa;
}

/**
 * Horário da unidade na data. Feriado nacional fica fechado; sem cadastro do dia, usa o horário geral
 * (domingo fechado, como era antes).
 */
export function horarioDoDia(
  horarios: MapaHorarios | null | undefined,
  unidadeId: string | null | undefined,
  data: Date,
  geral?: { abre?: string | null; fecha?: string | null },
): { abre: string; fecha: string; fechado: boolean; motivo?: string } {
  const feriado = isHoliday(data) ? `Feriado: ${getDateInfo(data)?.name || "nacional"}` : null;
  const dia = diaSemanaIso(data);
  const cadastro = unidadeId ? horarios?.get(unidadeId)?.find((h) => h.dia_semana === dia) : undefined;
  const abre = cadastro?.abre || String(geral?.abre || "08:00").slice(0, 5);
  const fecha = cadastro?.fecha || String(geral?.fecha || "21:00").slice(0, 5);
  if (feriado) return { abre, fecha, fechado: true, motivo: feriado };
  if (cadastro) return { abre, fecha, fechado: cadastro.fechado, motivo: cadastro.fechado ? "Unidade fechada neste dia" : undefined };
  return { abre, fecha, fechado: dia === 7, motivo: dia === 7 ? "Unidade fechada neste dia" : undefined };
}

/** Alguma das unidades informadas funciona na data? */
export function algumaUnidadeAberta(horarios: MapaHorarios | null | undefined, unidadeIds: string[], data: Date) {
  if (!unidadeIds.length) return false;
  return unidadeIds.some((id) => !horarioDoDia(horarios, id, data).fechado);
}
