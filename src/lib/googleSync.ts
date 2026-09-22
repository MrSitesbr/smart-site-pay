import { supabase } from "@/integrations/supabase/client";

/**
 * Invoca a edge function do Google Agenda.
 */
export async function invokeGoogleSync(body: Record<string, unknown>) {
  return await supabase.functions.invoke("sync-google-calendar", { body });
}
