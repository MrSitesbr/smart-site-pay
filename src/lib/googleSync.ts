import { supabase } from "@/integrations/supabase/client";

export const isAdminBypass = () => localStorage.getItem("admin_bypass") === "true";

/**
 * Invoca a edge function do Google Agenda.
 * No modo de contingência (login local) não existe sessão válida, então a função
 * retornaria 401 — nesse caso apenas ignoramos a sincronização.
 */
export async function invokeGoogleSync(body: Record<string, unknown>) {
  if (isAdminBypass()) {
    return { data: { skipped: true, events: [] }, error: null } as const;
  }
  return await supabase.functions.invoke("sync-google-calendar", { body });
}
