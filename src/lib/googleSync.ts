import { supabase } from "@/integrations/supabase/client";

export const isAdminBypass = () => localStorage.getItem("admin_bypass") === "true";

const BYPASS_EMAIL = "admin@coworking013.com.br";

/**
 * Invoca a edge function do Google Agenda.
 * No modo de contingência (login local) não existe sessão Supabase válida,
 * então enviamos o header de bypass que a função reconhece como admin.
 */
export async function invokeGoogleSync(body: Record<string, unknown>) {
  const headers = isAdminBypass() ? { "x-admin-bypass": BYPASS_EMAIL } : undefined;
  return await supabase.functions.invoke("sync-google-calendar", { body, headers });
}
