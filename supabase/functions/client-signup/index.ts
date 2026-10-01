import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Entre na sua conta para concluir o cadastro." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração do serviço incompleta.");

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    const user = authData.user;
    if (authError || !user || !user.email_confirmed_at) {
      return json({ error: "Confirme o endereço de e-mail antes de concluir o cadastro." }, 403);
    }

    const meta = user.user_metadata ?? {};
    if (meta.self_service_signup !== true) return json({ error: "Cadastro não autorizado por este fluxo." }, 403);
    const email = user.email?.trim().toLowerCase();
    const razaoSocial = typeof meta.razao_social === "string" ? meta.razao_social.trim() : "";
    const responsavelNome = typeof meta.responsavel_nome === "string" ? meta.responsavel_nome.trim() : "";
    const telefone = typeof meta.responsavel_telefone === "string" ? meta.responsavel_telefone.trim() : "";
    const endereco = typeof meta.endereco === "string" ? meta.endereco.trim() : "";
    const cpf = typeof meta.responsavel_cpf === "string" ? meta.responsavel_cpf.trim() : "";
    const cnpj = typeof meta.cnpj === "string" ? meta.cnpj.trim() : "";

    if (!email || email.length > 255 || razaoSocial.length < 2 || razaoSocial.length > 160 || responsavelNome.length < 2 || responsavelNome.length > 120 || telefone.length < 10 || telefone.length > 30) {
      return json({ error: "Os dados do cadastro estão incompletos ou inválidos. Atualize-os e tente novamente." }, 400);
    }
    if (cpf.length > 20 || cnpj.length > 24 || endereco.length > 300) return json({ error: "CPF, CNPJ ou endereço inválido." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: byUser, error: userLookupError } = await admin
      .from("clientes_corp")
      .select("id, status_acesso")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (userLookupError) throw userLookupError;
    if (byUser) return json({ ok: true, cliente_id: byUser.id, status: byUser.status_acesso });

    const { data: legacy, error: emailLookupError } = await admin
      .from("clientes_corp")
      .select("id")
      .ilike("responsavel_email", email)
      .is("deleted_at", null)
      .maybeSingle();
    if (emailLookupError) throw emailLookupError;
    if (legacy) {
      return json({ error: "Este e-mail já está associado a um cadastro existente. Fale com a equipe para validar e vincular seu acesso." }, 409);
    }

    const { data: cliente, error: insertError } = await admin
      .from("clientes_corp")
      .insert({
        razao_social: razaoSocial,
        responsavel_nome: responsavelNome,
        responsavel_email: email,
        responsavel_telefone: telefone,
        endereco: endereco || null,
        responsavel_cpf: cpf || null,
        cnpj: cnpj || null,
        unidade_id: null,
        plano_id: null,
        sala_id: null,
        user_id: user.id,
        status_acesso: "pendente",
      })
      .select("id, status_acesso")
      .single();
    if (insertError) throw insertError;
    return json({ ok: true, cliente_id: cliente.id, status: cliente.status_acesso }, 201);
  } catch (e) {
    console.error("client-signup error", e);
    return json({ error: "Não foi possível concluir o cadastro. Tente novamente ou fale com a equipe." }, 500);
  }
});
