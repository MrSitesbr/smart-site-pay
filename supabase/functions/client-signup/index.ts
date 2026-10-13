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

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Cadastro self-service de cliente corporativo.
 * O usuário é criado já confirmado pelo admin API: nenhum e-mail de confirmação é enviado.
 * O cadastro fica "pendente" até a equipe liberar o acesso.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Configuração do serviço incompleta.");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const publicSignup = password.length > 0;

    // Conta simples da página /contratar (sem cadastro corporativo), também sem e-mail.
    if (publicSignup && body?.kind === "contratar") {
      const email = text(body.email).toLowerCase();
      const nome = text(body.nome);
      const telefone = text(body.telefone);
      const nicho = text(body.nicho);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || nome.length > 120 || telefone.length > 30 || nicho.length > 120) {
        return json({ error: "Dados do cadastro inválidos." }, 400);
      }
      if (password.length < 6 || password.length > 72) return json({ error: "A senha deve ter entre 6 e 72 caracteres." }, 400);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, telefone, nicho },
      });
      if (createError || !created.user) {
        if (/already|registered|exists/i.test(createError?.message ?? "")) {
          return json({ error: "Este e-mail já possui uma conta. Entre com sua senha." }, 409);
        }
        throw createError ?? new Error("Usuário não criado.");
      }
      return json({ ok: true, user_id: created.user.id }, 201);
    }

    // Fluxo público: dados vêm do formulário. Fluxo legado: dados vêm do usuário logado.
    let userId: string | null = null;
    let source: Record<string, unknown> = body ?? {};
    let email = text(body?.email).toLowerCase();

    if (!publicSignup) {
      const authorization = req.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer ")) return json({ error: "Entre na sua conta para concluir o cadastro." }, 401);
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error: authError } = await authClient.auth.getUser();
      const user = authData.user;
      if (authError || !user) return json({ error: "Entre na sua conta para concluir o cadastro." }, 401);
      source = user.user_metadata ?? {};
      if (source.self_service_signup !== true) return json({ error: "Cadastro não autorizado por este fluxo." }, 403);
      userId = user.id;
      email = user.email?.trim().toLowerCase() ?? "";
    }

    const razaoSocial = text(source.razao_social);
    const responsavelNome = text(source.responsavel_nome);
    const telefone = text(source.responsavel_telefone);
    const endereco = text(source.endereco);
    const cpf = text(source.responsavel_cpf);
    const cnpj = text(source.cnpj);

    if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || razaoSocial.length < 2 || razaoSocial.length > 160 || responsavelNome.length < 2 || responsavelNome.length > 120 || telefone.length < 10 || telefone.length > 30) {
      return json({ error: "Os dados do cadastro estão incompletos ou inválidos. Atualize-os e tente novamente." }, 400);
    }
    if (cpf.length > 20 || cnpj.length > 24 || endereco.length > 300) return json({ error: "CPF, CNPJ ou endereço inválido." }, 400);
    if (publicSignup && (password.length < 8 || password.length > 72)) {
      return json({ error: "A senha deve ter entre 8 e 72 caracteres." }, 400);
    }

    if (userId) {
      const { data: byUser, error: userLookupError } = await admin
        .from("clientes_corp")
        .select("id, status_acesso")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (userLookupError) throw userLookupError;
      if (byUser) return json({ ok: true, cliente_id: byUser.id, status: byUser.status_acesso });
    }

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

    let createdUserId: string | null = null;
    if (publicSignup) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          self_service_signup: true,
          razao_social: razaoSocial,
          responsavel_nome: responsavelNome,
          responsavel_telefone: telefone,
          responsavel_cpf: cpf,
          cnpj,
          endereco,
        },
      });
      if (createError || !created.user) {
        if (/already|registered|exists/i.test(createError?.message ?? "")) {
          return json({ error: "Este e-mail já possui uma conta. Entre com sua senha ou fale com a equipe pelo WhatsApp (13) 98805-0358." }, 409);
        }
        throw createError ?? new Error("Usuário não criado.");
      }
      userId = created.user.id;
      createdUserId = created.user.id;
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
        user_id: userId,
        status_acesso: "pendente",
      })
      .select("id, status_acesso")
      .single();
    if (insertError) {
      // Não deixa um login órfão sem cadastro de cliente.
      if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
      throw insertError;
    }
    return json({ ok: true, cliente_id: cliente.id, status: cliente.status_acesso }, 201);
  } catch (e) {
    console.error("client-signup error", e);
    return json({ error: "Não foi possível concluir o cadastro. Tente novamente ou fale com a equipe." }, 500);
  }
});
