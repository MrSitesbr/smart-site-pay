// Tabela oficial Woba — Espaço Compartilhado (Day Pass / Day Test)
// Fonte: Página de Parceiros Woba
export const WOBA_NIVEIS = [
  { nivel: 1, valor: 20, req: "Até 5 cadeiras" },
  { nivel: 2, valor: 24, req: "50 reservas/mês" },
  { nivel: 3, valor: 26, req: "80 reservas/mês" },
  { nivel: 4, valor: 30, req: "120 reservas/mês" },
  { nivel: 5, valor: 35, req: "200 reservas/mês + nota ≥ 4" },
] as const;

// Tabela oficial Woba — Sala de Reunião (Hora / Diária)
export const WOBA_SALA_TIERS = {
  ate_6:  { label: "Até 6 pessoas",     hora: 50,  diaria: 400  },
  "7_15": { label: "7 a 15 pessoas",    hora: 80,  diaria: 640  },
  "16_25":{ label: "16 a 25 pessoas",   hora: 130, diaria: 1040 },
} as const;
export type WobaSalaTier = keyof typeof WOBA_SALA_TIERS;

// Compat: default (tier 7-15) — usado onde ainda referenciam a constante antiga.
export const WOBA_REPASSE_SALA_REUNIAO_HORA = WOBA_SALA_TIERS["7_15"].hora;
export const WOBA_REPASSE_SALA_REUNIAO_DIARIA = WOBA_SALA_TIERS["7_15"].diaria;
export const WOBA_REPASSE_PRIVATIVO_HORA = 80;     // R$/hora

// Mantido apenas como referência (comissão padrão Woba para privativo/evento).
export const WOBA_COMISSAO_PRIVATIVO = 0.16;
export const WOBA_REPASSE_PRIVATIVO = 1 - WOBA_COMISSAO_PRIVATIVO;

export function valorDayPassPorNivel(nivel: number): number {
  const n = WOBA_NIVEIS.find((x) => x.nivel === nivel);
  return n ? n.valor : WOBA_NIVEIS[0].valor;
}

// Classifica cada item como day_pass, sala_reuniao ou privativo/evento.
export type WobaKind = "day_pass" | "sala_reuniao" | "privativo";

export function classifyReserva(r: { ambiente: string; tipo: string }): WobaKind {
  if (r.ambiente === "estacao") return "day_pass";
  if (r.ambiente === "sala_reuniao") return "sala_reuniao";
  return "privativo";
}
export function classifyContrato(c: { ambiente: string; plano_tipo: string }): WobaKind {
  if (c.ambiente === "estacao") return "day_pass";
  if (c.ambiente === "sala_reuniao") return "sala_reuniao";
  return "privativo";
}

// 5º dia útil do 2º mês subsequente à reserva.
export function dataPrevistaPagamento(ano: number, mesIndex: number): Date {
  let d = new Date(ano, mesIndex + 2, 1);
  let count = 0;
  while (count < 5) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
      if (count === 5) break;
    }
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
