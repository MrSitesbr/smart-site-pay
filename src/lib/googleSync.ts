import { supabase } from "@/integrations/supabase/client";

/**
 * Invoca a edge function do Google Agenda. Nunca lança erro: falhas de
 * sincronização não devem derrubar o painel.
 */
export async function invokeGoogleSync(body: Record<string, unknown>) {
  try {
    const res = await supabase.functions.invoke("sync-google-calendar", { body });
    if (res.error) console.warn("Google Agenda indisponível:", res.error.message);
    return res;
  } catch (e) {
    console.warn("Google Agenda indisponível:", e);
    return { data: null, error: e as Error };
  }
}
