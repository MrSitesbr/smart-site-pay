import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: null as any };
    if (!userData?.user) return new Response(JSON.stringify({ error: "Sua sessão administrativa expirou. Entre novamente." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin")) return new Response(JSON.stringify({ error: "Você não tem permissão para sincronizar a agenda." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ skipped: true, configured: false, events: [], results: [], message: "Google Agenda não está conectada. A aplicação opera integralmente pelo Supabase." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
