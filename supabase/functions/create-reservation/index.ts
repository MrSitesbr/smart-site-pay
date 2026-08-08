import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação de Trabalho",
  sala_privativa: "Sala Privativa",
  sala_reuniao: "Sala de Reunião",
};
const AMBIENTE_TAG: Record<string, string> = {
  estacao: "[ESTACAO]",
  sala_privativa: "[SALA_PRIVATIVA]",
  sala_reuniao: "[SALA_REUNIAO]",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim, observacoes } = body;

    if (!nome || !email || !telefone || !ambiente || !tipo || !data || !hora_inicio || !hora_fim) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Create google calendar event
    let google_event_id: string | null = null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");

    if (LOVABLE_API_KEY && GOOGLE_CALENDAR_API_KEY) {
      try {
        const start = new Date(`${data}T${hora_inicio}:00-03:00`).toISOString();
        const end = new Date(`${data}T${hora_fim}:00-03:00`).toISOString();
        const event = {
          summary: `${AMBIENTE_TAG[ambiente]} ${AMBIENTE_LABEL[ambiente]} - ${nome}`,
          description: `Reserva ${tipo}\nCliente: ${nome}\nEmail: ${email}\nTelefone: ${telefone}\n${observacoes ? "Obs: " + observacoes : ""}\nStatus: Pendente`,
          start: { dateTime: start, timeZone: "America/Sao_Paulo" },
          end: { dateTime: end, timeZone: "America/Sao_Paulo" },
        };
        const calRes = await fetch(`${GATEWAY}/calendars/primary/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });
        const calData = await calRes.json();
        if (calRes.ok) google_event_id = calData.id;
        else console.error("Calendar create failed", calData);
      } catch (e) {
        console.error("Calendar error:", e);
      }
    }

    const { data: row, error } = await supabase
      .from("reservations")
      .insert({
        nome, email, telefone, ambiente, tipo, data, hora_inicio, hora_fim,
        observacoes: observacoes || null,
        google_event_id,
        google_calendar_id: google_event_id ? "primary" : null,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, reservation: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-reservation error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
