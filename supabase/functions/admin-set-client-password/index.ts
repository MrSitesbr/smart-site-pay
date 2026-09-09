import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-bypass",
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

    // Autorização: sessão de administrador OU chave de contingência do painel.
    let authorized = false;

    const bypass = req.headers.get("x-admin-bypass");
    if (bypass && bypass === Deno.env.get("ADMIN_PASSWORD")) authorized = true;

    if (!authorized) {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      if (token) {
        const { data: userData } = await admin.auth.getUser(token);
        const uid = userData?.user?.id;
        if (uid) {
          const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
          authorized = (roles || []).some((r: { role: string }) => r.role === "admin");
        }
      }
    }

    if (!authorized) return json({ error: "Não autorizado." }, 401);

    const body = await req.json().catch(() => null) as { cliente_id?: string; password?: string } | null;
    const clienteId = body?.cliente_id?.trim();
    const password = body?.password ?? "";
    if (!clienteId) {
      return json({ error: "Cliente não identificado. Reabra a ficha e tente novamente." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Informe o cliente e uma senha com no mínimo 6 caracteres." }, 400);
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
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find(
      (u) => u.email?.toLowerCase() === cliente.responsavel_email!.toLowerCase(),
    );

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
      userId = created.user!.id;
    }

    const { error: upErr } = await admin
      .from("clientes_corp")
      .update({ user_id: userId })
      .eq("id", cliente.id);
    if (upErr) throw upErr;

    return json({ ok: true, created: !found, user_id: userId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
