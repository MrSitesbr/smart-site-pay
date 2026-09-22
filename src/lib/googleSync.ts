import { supabase } from "@/integrations/supabase/client";

export const isAdminBypass = () => localStorage.getItem("admin_bypass") === "true";

/**
 * Headers de autorização para edge functions administrativas quando o painel
 * está no modo de contingência (sem sessão Supabase).
 */
export function adminFnHeaders(): Record<string, string> | undefined {
  return undefined;
}


/**
 * Invoca a edge function do Google Agenda.
 * No modo de contingência (login local) não existe sessão Supabase válida,
 * então enviamos o header de bypass que a função reconhece como admin.
 */
export async function invokeGoogleSync(body: Record<string, unknown>) {
  return await supabase.functions.invoke("sync-google-calendar", { body });
}
