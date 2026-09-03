import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const STATION_CAPACITY = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ambiente, data, hora_inicio, hora_fim } = await req.json();
    if (!ambiente || !data || !hora_inicio || !hora_fim) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timeMin = new Date(`${data}T${hora_inicio}:00-03:00`).toISOString();
    const timeMax = new Date(`${data}T${hora_fim}:00-03:00`).toISOString();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_CALENDAR_API_KEY) {
      return new Response(JSON.stringify({ error: "Credenciais do Google Calendar não configuradas" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query google calendar (primary)
    const url = `${GATEWAY}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
    const calRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
      },
    });
    const calData = await calRes.json();
    const events = (calData.items || []).filter((e: any) => {
      const tag = ambiente === "estacao" ? "[ESTACAO]" : ambiente === "sala_privativa" ? "[SALA_PRIVATIVA]" : "[SALA_REUNIAO]";
      return (e.summary || "").includes(tag);
    });

    // Also check DB for non-cancelled reservations
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: dbReservas } = await supabase
      .from("reservations")
      .select("hora_inicio, hora_fim")
      .eq("ambiente", ambiente)
      .eq("data", data)
      .neq("status", "cancelada");

    const overlap = (dbReservas || []).filter((r: any) => {
      return !(r.hora_fim <= hora_inicio || r.hora_inicio >= hora_fim);
    });

    const totalConflicts = events.length + overlap.length;
    const available = ambiente === "estacao" ? totalConflicts < STATION_CAPACITY : totalConflicts === 0;

    return new Response(JSON.stringify({
      available,
      conflicts: totalConflicts,
      capacity: ambiente === "estacao" ? STATION_CAPACITY : 1,
      conflictingEvents: events.map((e: any) => ({
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
      })),
    }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (e) {
    console.error("check-availability error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
