import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      email,
      password,
      razao_social,
      responsavel_nome,
      responsavel_telefone,
      responsavel_cpf,
      cnpj,
    } = body ?? {};

    if (!email || !password || !razao_social || !responsavel_nome || !responsavel_telefone) {
      return new Response(JSON.stringify({ error: "Preencha todos os campos obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: created, error: signErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: responsavel_nome },
    });

    if (signErr) {
      const msg = /already been registered|already exists/i.test(signErr.message)
        ? "Já existe uma conta com este e-mail."
        : signErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user?.id;
    if (!userId) throw new Error("Não foi possível criar o usuário.");

    const payload: Record<string, unknown> = {
      razao_social,
      responsavel_nome,
      responsavel_email: email,
      responsavel_telefone,
      responsavel_cpf: responsavel_cpf || null,
      cnpj: cnpj || null,
      unidade_id: null,
      plano_id: null,
      sala_id: null,
      user_id: userId,
      status_acesso: "aprovado",
    };

    const { data: existing } = await admin
      .from("clientes_corp")
      .select("id")
      .ilike("responsavel_email", email)
      .is("deleted_at", null)
      .maybeSingle();

    let clienteId = existing?.id ?? null;
    if (clienteId) {
      const { error } = await admin.from("clientes_corp").update(payload).eq("id", clienteId);
      if (error) throw error;
    } else {
      const { data, error } = await admin.from("clientes_corp").insert(payload).select("id").single();
      if (error) throw error;
      clienteId = data.id;
    }

    return new Response(
      JSON.stringify({ ok: true, cliente_id: clienteId, status: payload.status_acesso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
