import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { ambiente, data, hora_inicio, hora_fim } = await req.json();
    if (!ambiente || !data || !hora_inicio || !hora_fim) return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: reservas, error } = await supabase.from("reservations").select("hora_inicio,hora_fim").eq("ambiente", ambiente).eq("data", data).neq("status", "cancelada");
    if (error) throw error;
    const overlap = (reservas || []).filter((r: any) => !(r.hora_fim <= hora_inicio || r.hora_inicio >= hora_fim));
    const capacity = ambiente === "estacao" ? 8 : 1;
    return new Response(JSON.stringify({ available: overlap.length < capacity, conflicts: overlap.length, capacity, conflictingEvents: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
