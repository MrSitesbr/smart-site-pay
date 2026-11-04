import {
  Accessibility, AppWindow, Armchair, Bath, Bed, Check, Coffee, Droplets, Lamp, Monitor, Presentation, Printer, Snowflake,
  Sofa, Table, Wifi, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Item do catálogo de recursos das salas (janela, ar-condicionado, pia, maca...). */
export type Recurso = { id: string; nome: string; icone: string; ordem: number; ativo: boolean; padrao: boolean };

/** Ícones disponíveis para os recursos (o admin escolhe um ao criar um recurso novo). */
export const ICONES_RECURSO: Record<string, LucideIcon> = {
  snowflake: Snowflake, wifi: Wifi, table: Table, armchair: Armchair, "app-window": AppWindow, droplets: Droplets, bed: Bed,
  sofa: Sofa, monitor: Monitor, presentation: Presentation, bath: Bath, accessibility: Accessibility, coffee: Coffee,
  printer: Printer, lamp: Lamp, check: Check,
};

export const iconeRecurso = (icone?: string | null) => ICONES_RECURSO[icone || ""] || Check;

export async function carregarRecursos(): Promise<Recurso[]> {
  const { data } = await (supabase.from("sala_recursos" as any) as any).select("*").order("ordem").order("nome");
  return (data || []) as Recurso[];
}

/** Gera o identificador de um recurso novo a partir do nome ("Ponto de café" → "ponto_de_cafe"). */
export function slugRecurso(nome: string) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}
