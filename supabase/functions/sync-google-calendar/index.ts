import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Por Hora", diaria: "Diária", pacote: "Pacote 10", mensal: "Mensal",
};
const STATUS_COLOR: Record<string, string> = {
  pendente: "5", aprovada: "9", confirmada: "9",
  paga: "10", realizada: "10", concluida: "2", cancelada: "11",
};

function gwHeaders() {
  const LK = Deno.env.get("LOVABLE_API_KEY");
  const CK = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!LK || !CK) throw new Error("Missing gateway credentials");
  return {
    "Authorization": `Bearer ${LK}`,
    "X-Connection-Api-Key": CK,
    "Content-Type": "application/json",
  };
}

async function gw(method: string, path: string, body?: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method, headers: gwHeaders(), body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Calendar ${method} ${path} [${res.status}]: ${text}`);
  return text ? JSON.parse(text) : {};
}

function buildReservaEvent(r: any) {
  const date = r.data;
  return {
    summary: `[${AMBIENTE_LABEL[r.ambiente] || r.ambiente}] ${r.nome}`,
    description: [
      `Cliente: ${r.nome}`,
      `Email: ${r.email}`,
      `Telefone: ${r.telefone}`,
      `Ambiente: ${AMBIENTE_LABEL[r.ambiente] || r.ambiente}`,
      `Tipo: ${r.tipo}`,
      `Status: ${r.status}`,
      r.observacoes ? `Obs: ${r.observacoes}` : "",
    ].filter(Boolean).join("\n"),
    start: { dateTime: `${date}T${r.hora_inicio}`, timeZone: "America/Sao_Paulo" },
    end:   { dateTime: `${date}T${r.hora_fim}`,    timeZone: "America/Sao_Paulo" },
    colorId: STATUS_COLOR[r.status],
    attendees: r.email ? [{ email: r.email, displayName: r.nome }] : undefined,
  };
}

function buildContratoEvent(c: any) {
  const dias: string[] = c.dias_selecionados || [];
  const startDate = c.data_inicio || dias[0];
  if (!startDate) return null;
  const endDateObj = new Date(startDate + "T00:00");
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endDate = endDateObj.toISOString().slice(0, 10);
  return {
    summary: `[${PLANO_LABEL[c.plano_tipo] || c.plano_tipo}] ${c.nome} — ${AMBIENTE_LABEL[c.ambiente] || c.ambiente}`,
    description: [
      `Cliente: ${c.nome}`,
      `Email: ${c.email}`,
      `Telefone: ${c.telefone}`,
      `Plano: ${PLANO_LABEL[c.plano_tipo] || c.plano_tipo}`,
      `Ambiente: ${AMBIENTE_LABEL[c.ambiente] || c.ambiente}`,
      `Valor: R$ ${Number(c.preco).toFixed(2)}`,
      `Status: ${c.status}`,
      dias.length ? `Dias: ${dias.join(", ")}` : "",
      c.observacoes ? `Obs: ${c.observacoes}` : "",
    ].filter(Boolean).join("\n"),
    start: { date: startDate },
    end:   { date: endDate },
    colorId: STATUS_COLOR[c.status],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_CALENDAR_API_KEY")) {
    return new Response(JSON.stringify({ skipped: true, configured: false, events: [], results: [], message: "Google Agenda não está conectado." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = jwt ? await supabase.auth.getUser(jwt) : { data: null as any };
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sua sessão administrativa expirou. Entre novamente." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Você não tem permissão para sincronizar a agenda." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, type, id, timeMin, timeMax, calendarId } = body as {
      action: "upsert" | "delete" | "delete_event" | "sync_all" | "list_events";
      type?: "reserva" | "contrato"; id?: string;
      timeMin?: string; timeMax?: string; calendarId?: string;
    };
    const calId = calendarId || "primary";

    if (action === "list_events") {
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
      });
      if (timeMin) params.set("timeMin", timeMin);
      if (timeMax) params.set("timeMax", timeMax);
      const res = await gw("GET", `/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`);
      return new Response(JSON.stringify({ ok: true, events: res.items || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    async function upsertOne(kind: "reserva" | "contrato", rowId: string) {
      const table = kind === "reserva" ? "reservations" : "contract_requests";
      const { data: row, error } = await supabase.from(table).select("*").eq("id", rowId).single();
      if (error || !row) throw new Error(`row not found: ${error?.message}`);
      const event = kind === "reserva" ? buildReservaEvent(row) : buildContratoEvent(row);
      if (!event) return { skipped: true };

      // If cancelled, delete instead
      if (row.status === "cancelada" && row.google_event_id) {
        try { await gw("DELETE", `/calendars/${calId}/events/${row.google_event_id}`); } catch (_) {}
        await supabase.from(table).update({ google_event_id: null }).eq("id", rowId);
        return { deleted: true };
      }

      if (row.google_event_id) {
        try {
          await gw("PUT", `/calendars/${calId}/events/${row.google_event_id}`, event);
          return { updated: true, google_event_id: row.google_event_id };
        } catch (e) {
          // maybe deleted upstream — fall through to create
          console.warn("update failed, creating new:", (e as Error).message);
        }
      }
      const created = await gw("POST", `/calendars/${calId}/events`, event);
      await supabase.from(table).update({ google_event_id: created.id }).eq("id", rowId);
      return { created: true, google_event_id: created.id };
    }

    if (action === "upsert") {
      if (!type || !id) throw new Error("type and id required");
      const result = await upsertOne(type, id);
      return new Response(JSON.stringify({ ok: true, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    async function safeDeleteEvent(eventId: string, cid: string) {
      try {
        await gw("DELETE", `/calendars/${encodeURIComponent(cid)}/events/${eventId}`);
        return { deleted: true };
      } catch (e) {
        const msg = (e as Error).message || "";
        // Already gone on Google → treat as success
        if (/\[(404|410)\]/.test(msg)) return { deleted: true, alreadyGone: true };
        // Try primary as fallback if a different calendarId was used
        if (cid !== "primary") {
          try {
            await gw("DELETE", `/calendars/primary/events/${eventId}`);
            return { deleted: true, viaPrimary: true };
          } catch (e2) {
            const m2 = (e2 as Error).message || "";
            if (/\[(404|410)\]/.test(m2)) return { deleted: true, alreadyGone: true };
            throw e2;
          }
        }
        throw e;
      }
    }

    if (action === "delete") {
      if (!type || !id) throw new Error("type and id required");
      const table = type === "reserva" ? "reservations" : "contract_requests";
      const { data: row } = await supabase.from(table).select("google_event_id, google_calendar_id").eq("id", id).single();
      if (row?.google_event_id) {
        const cid = (row as any).google_calendar_id || calId;
        const r = await safeDeleteEvent(row.google_event_id, cid);
        await supabase.from(table).update({ google_event_id: null }).eq("id", id);
        return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, skipped: "no google_event_id" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_event") {
      const eventId = (body as any).eventId as string | undefined;
      const cid = (body as any).calendarId as string | undefined;
      if (!eventId) throw new Error("eventId required");
      const r = await safeDeleteEvent(eventId, cid || calId);
      return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "sync_all") {
      const results: any[] = [];
      const { data: rs } = await supabase.from("reservations").select("id").neq("status", "cancelada");
      for (const r of rs || []) {
        try { results.push({ type: "reserva", id: r.id, ...(await upsertOne("reserva", r.id)) }); }
        catch (e) { results.push({ type: "reserva", id: r.id, error: (e as Error).message }); }
      }
      const { data: cs } = await supabase.from("contract_requests").select("id").neq("status", "cancelada");
      for (const c of cs || []) {
        try { results.push({ type: "contrato", id: c.id, ...(await upsertOne("contrato", c.id)) }); }
        catch (e) { results.push({ type: "contrato", id: c.id, error: (e as Error).message }); }
      }
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-google-calendar error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
