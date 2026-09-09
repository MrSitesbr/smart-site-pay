import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) return json({ error: "Informe o e-mail." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cliente } = await admin
      .from("clientes_corp")
      .select("status_acesso, user_id")
      .ilike("responsavel_email", String(email).trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (!cliente) return json({ cadastro: "inexistente" });

    return json({
      cadastro: "existente",
      status: cliente.status_acesso ?? "pendente",
      tem_login: Boolean(cliente.user_id),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
