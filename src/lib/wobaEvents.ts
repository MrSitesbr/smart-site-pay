import { supabase } from "@/integrations/supabase/client";
import {
import { invokeGoogleSync } from "@/lib/googleSync";
  WOBA_SALA_TIERS,
  WobaSalaTier,
  WOBA_REPASSE_PRIVATIVO_HORA,
  valorDayPassPorNivel,
} from "./woba";

export type WobaProduto = "day_pass" | "sala_reuniao" | "privativo";

export type WobaEvento = {
  id: string;
  produto: WobaProduto;
  title: string;
  start: Date;
  end: Date;
  horas: number;
  valor: number;
  repasse: number;
  htmlLink?: string;
  cliente?: string;
  criterio: string;
};

export type WobaCfg = {
  calendarId: string;
  filtro: string;
  salaTier: WobaSalaTier;
  repasseHoraPrivativo: number;
};

export const WOBA_LS_KEY = "woba_config_v1";
export const wobaDefaults: WobaCfg = {
  calendarId: "primary",
  filtro: "woba",
  salaTier: "7_15",
  repasseHoraPrivativo: WOBA_REPASSE_PRIVATIVO_HORA,
};

export function loadWobaCfg(): WobaCfg {
  try {
    const raw = JSON.parse(localStorage.getItem(WOBA_LS_KEY) || "{}");
    const cfg: WobaCfg = { ...wobaDefaults, ...raw };
    if (!(cfg.salaTier in WOBA_SALA_TIERS)) cfg.salaTier = "7_15";
    return cfg;
  } catch { return wobaDefaults; }
}

export function classifyProduto(text: string, horas?: number): WobaProduto {
  const t = text.toLowerCase();
  // Palavras-chave têm prioridade
  if (t.includes("privativ") || t.includes("escrit") || t.includes("evento")) return "privativo";
  if (t.includes("day") || t.includes("estação") || t.includes("estacao") || t.includes("compartilh") || t.includes("diária") || t.includes("diaria")) return "day_pass";
  if (t.includes("reuni")) return "sala_reuniao";
  // Heurística: reservas longas (≥ 6h, típico 9h–17h) são Day Pass;
  // reservas curtas (< 6h) são Sala de Reunião.
  if (typeof horas === "number" && horas >= 6) return "day_pass";
  return "sala_reuniao";
}

function parsePrecoBRL(text: string): number | null {
  if (!text) return null;
  const m = text.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i);
  if (!m) return null;
  const num = m[1].replace(/\./g, "").replace(",", ".");
  const v = Number(num);
  return isFinite(v) ? v : null;
}

export function mapGoogleEventsToWoba(
  gEvents: any[],
  cfg: WobaCfg,
  nivel: number,
): WobaEvento[] {
  const key = (cfg.filtro || "").toLowerCase().trim();
  return (gEvents || []).flatMap((ev: any): WobaEvento[] => {
    const title = ev.summary || "(sem título)";
    const desc = ev.description || "";
    const atts = (ev.attendees || []).map((a: any) => `${a.email || ""} ${a.displayName || ""}`).join(" ");
    const blob = `${title}\n${desc}\n${atts}`;
    if (key && !blob.toLowerCase().includes(key)) return [];
    const startStr = ev.start?.dateTime || ev.start?.date;
    const endStr = ev.end?.dateTime || ev.end?.date;
    if (!startStr) return [];
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600000);
    const brutoHoras = (end.getTime() - start.getTime()) / 3600000;
    // Day Pass Woba tem jornada máxima de 8h (das 9h às 17h).
    // Reservas de sala têm mínimo cobrado de 1h.
    const produto = classifyProduto(`${title} ${desc}`, brutoHoras);
    const horas = produto === "day_pass"
      ? Math.min(8, Math.max(1, brutoHoras))
      : Math.max(1, Math.ceil(brutoHoras * 2) / 2); // arredonda para 0,5h, mínimo 1h
    const parsed = parsePrecoBRL(desc) ?? parsePrecoBRL(title);
    let valor = 0, repasse = 0, criterio = "";
    if (produto === "day_pass") {
      valor = valorDayPassPorNivel(nivel);
      repasse = valor;
      criterio = `Tabela Day Pass · Nível ${nivel} · ${horas.toFixed(1)}h (máx 8h)`;
    } else if (produto === "sala_reuniao") {
      const tier = WOBA_SALA_TIERS[cfg.salaTier] ?? WOBA_SALA_TIERS["7_15"];
      // Se a reserva cobrir ≥ 6h (jornada 9h–17h típica), aplica valor de DIÁRIA;
      // caso contrário, cobra por HORA (mín. 1h, arredondando para 0,5h).
      if (brutoHoras >= 6) {
        valor = tier.diaria; repasse = valor;
        criterio = `Sala de Reunião · ${tier.label} · Diária R$${tier.diaria}`;
      } else {
        valor = horas * tier.hora; repasse = valor;
        criterio = `Sala de Reunião · ${tier.label} · R$${tier.hora}/h × ${horas.toFixed(1)}h`;
      }
    } else {
      const vh = Number(cfg.repasseHoraPrivativo || WOBA_REPASSE_PRIVATIVO_HORA);
      valor = horas * vh; repasse = valor;
      criterio = `Sala Privativa · R$${vh}/h × ${horas.toFixed(1)}h`;
      if (parsed) criterio += ` (anunciado: R$${parsed})`;
    }
    return [{
      id: ev.id, produto, title, start, end, horas, valor, repasse,
      htmlLink: ev.htmlLink,
      cliente: ev.attendees?.[0]?.displayName || ev.attendees?.[0]?.email || "",
      criterio,
    }];
  });
}

export async function fetchWobaEventsYear(year: number, cfg: WobaCfg): Promise<any[]> {
  const timeMin = new Date(year, 0, 1).toISOString();
  const timeMax = new Date(year + 1, 0, 1).toISOString();
  const { data, error } = await invokeGoogleSync({ action: "list_events", timeMin, timeMax, calendarId: cfg.calendarId || "primary" },
  });
  if (error) throw error;
  return (data as any)?.events || [];
}
