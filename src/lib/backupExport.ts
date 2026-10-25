import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

/** Busca todas as linhas da tabela, paginando para não perder registros além do limite padrão. */
export async function fetchAllRows(table: "reservations" | "clientes_corp"): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table)
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Monta CSV com todas as colunas originais (separador ";" e BOM para abrir direto no Excel em pt-BR). */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const lines = [columns.map(cell).join(";"), ...rows.map((row) => columns.map((col) => cell(row[col])).join(";"))];
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function backupFilename(prefix: string, date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `backup_${prefix}_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.csv`;
}
