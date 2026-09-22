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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Sua sessão administrativa expirou. Entre novamente." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Sua sessão administrativa expirou. Entre novamente." }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).some((r: { role: string }) => r.role === "admin")) {
      return json({ error: "Você não tem permissão para alterar senhas de clientes." }, 403);
    }

    const body = await req.json().catch(() => null) as { cliente_id?: string; password?: string } | null;
    const clienteId = body?.cliente_id?.trim();
    const password = body?.password ?? "";
    if (!clienteId) {
      return json({ error: "Cliente não identificado. Reabra a ficha e tente novamente." }, 400);
    }
    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return json({ error: "A senha deve ter no mínimo 6 caracteres, com letra, número e caractere especial." }, 400);
    }

    const { data: cliente, error: cliErr } = await admin
      .from("clientes_corp")
      .select("id, user_id, responsavel_email, responsavel_nome")
      .eq("id", clienteId)
      .single();
    if (cliErr || !cliente) {
      return json({ error: "Cliente não encontrado." }, 404);
    }

    if (cliente.user_id) {
      const { data: updated, error } = await admin.auth.admin.updateUserById(cliente.user_id, {
        password,
        email_confirm: true,
      });
      if (error) throw error;
      if (!updated.user) throw new Error("A conta não confirmou a atualização da senha.");
      return json({ ok: true, created: false, user_id: updated.user.id });
    }

    if (!cliente.responsavel_email) {
      return json({ error: "Cadastre o e-mail do responsável antes de criar o acesso." }, 400);
    }

    // Reaproveita conta existente com o mesmo e-mail, se houver.
    let found = null;
    for (let page = 1; page <= 20 && !found; page += 1) {
      const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError) throw listError;
      found = list?.users?.find((u) => u.email?.toLowerCase() === cliente.responsavel_email!.toLowerCase()) || null;
      if ((list?.users?.length || 0) < 1000) break;
    }

    let userId = found?.id ?? null;
    if (userId) {
      const { data: updated, error } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (error) throw error;
      if (!updated.user) throw new Error("A conta não confirmou a atualização da senha.");
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: cliente.responsavel_email,
        password,
        email_confirm: true,
        user_metadata: { nome: cliente.responsavel_nome },
      });
      if (error) throw error;
      if (!created.user) return json({ error: "Não foi possível criar a conta deste cliente." }, 500);
      userId = created.user.id;
    }

    const { error: upErr } = await admin
      .from("clientes_corp")
      .update({ user_id: userId })
      .eq("id", cliente.id);
    if (upErr) throw upErr;

    return json({ ok: true, created: !found, user_id: userId });
  } catch (e) {
    console.error("admin-set-client-password:", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Não foi possível atualizar a conta deste cliente." }, 500);
  }
});
