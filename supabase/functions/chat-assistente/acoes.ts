// Ações que o assistente pode usar. Rodam com o login da própria pessoa (db), então as regras de acesso
// e de reserva do banco continuam valendo. Ações de escrita só executam depois do clique em "Confirmar".
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Contexto = { db: SupabaseClient; userId: string; clienteId: string | null; nomeUsuario: string };
type Params = Record<string, unknown>;
export type Acao = {
  nome: string;
  descricao: string;
  escrita: boolean;
  /** Valida e devolve o texto do resumo para confirmação (só ações de escrita). Lança erro com mensagem amigável. */
  preparar?: (ctx: Contexto, p: Params) => Promise<{ resumo: string; params: Params }>;
  executar: (ctx: Contexto, p: Params) => Promise<string>;
};

export class ErroAcao extends Error {}

const txt = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const dataValida = (v: unknown) => { const s = txt(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ErroAcao("Informe a data no formato AAAA-MM-DD."); return s; };
const horaValida = (v: unknown) => {
  const s = txt(v, 5);
  if (!/^\d{2}:\d{2}$/.test(s) || !["00", "30"].includes(s.slice(3))) throw new ErroAcao("Use horários cheios ou meia hora (ex.: 09:00, 14:30).");
  return s;
};
const brData = (iso: string) => iso.split("-").reverse().join("/");
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horasEntre = (ini: string, fim: string) => { const [a, b] = ini.split(":").map(Number); const [c, d] = fim.split(":").map(Number); return (c * 60 + d - a * 60 - b) / 60; };
/** Confere se o link é https e aponta para uma imagem que realmente existe. */
async function imagemValida(url: string): Promise<string | null> {
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return null;
  for (const metodo of ["HEAD", "GET"]) {
    try {
      const r = await fetch(url, { method: metodo, redirect: "follow", signal: AbortSignal.timeout(8000) });
      const tipo = r.headers.get("content-type") || "";
      await r.body?.cancel();
      if (r.ok && tipo.startsWith("image/")) return url;
    } catch { /* tenta o próximo método */ }
  }
  return null;
}

const erroDb = (e: { message?: string } | null) => { if (e) throw new ErroAcao(e.message || "Não foi possível concluir a operação."); };

async function acharSala(db: SupabaseClient, sala: unknown) {
  const termo = txt(sala, 80);
  if (!termo) throw new ErroAcao("Informe a sala.");
  const { data } = await db.from("salas").select("id, nome, unidade_id, preco_hora_avulsa, unidades(nome)").in("status", ["disponivel", "ativa"]);
  const lista = (data || []) as any[];
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const achada = lista.find((s) => s.id === termo) || lista.find((s) => norm(s.nome) === norm(termo)) || lista.filter((s) => norm(s.nome).includes(norm(termo)));
  if (Array.isArray(achada)) {
    if (achada.length === 1) return achada[0];
    throw new ErroAcao(achada.length ? `Encontrei mais de uma sala: ${achada.map((s) => s.nome).join(", ")}. Qual delas?` : `Não encontrei a sala "${termo}". Salas disponíveis: ${lista.map((s) => s.nome).join(", ")}.`);
  }
  return achada;
}

/** Cobertura do plano e valor de uma reserva (mesma regra do painel do admin). */
async function precificar(db: SupabaseClient, clienteId: string, sala: any, data: string, ini: string, fim: string, modalidade: string | null, ignorar?: string) {
  const horas = horasEntre(ini, fim);
  const { data: cov, error } = await db.rpc("plano_cobertura", {
    p_cliente_corp_id: clienteId, p_data: data, p_horas: horas, p_sala_id: sala.id, p_hora_inicio: ini, p_ignorar_reserva: ignorar ?? null,
  });
  erroDb(error);
  const c = cov as any;
  const cob = Number(c?.cobertas || 0), exc = Number(c?.excedentes || 0);
  const adicional = exc > 0 && c?.permite_adicional && modalidade === "adicional";
  const valor = exc <= 0 ? 0 : adicional ? exc * Number(c.preco_adicional || 0) : exc * Number(sala.preco_hora_avulsa ?? c?.preco_avulso ?? 60);
  const tipo = exc <= 0 ? (c?.estacao ? "estacao" : "plano") : adicional ? "adicional" : "avulso";
  return { horas, cob, exc, valor, tipo, planoId: cob > 0 || adicional ? c?.plano_id : null, planoNome: c?.plano_nome, permiteAdicional: !!c?.permite_adicional && exc > 0 };
}

function descreverCobertura(p: { cob: number; exc: number; valor: number; tipo: string; planoNome?: string }) {
  if (p.exc <= 0) return p.tipo === "estacao" ? "estação incluída no plano" : `coberto pelo plano${p.planoNome ? ` ${p.planoNome}` : ""}`;
  return `${p.cob > 0 ? `${p.cob}h pelo plano + ` : ""}${p.exc}h ${p.tipo === "adicional" ? "adicionais" : "avulsas"} (${reais(p.valor)})`;
}

// ---------------------------------------------------------------------------------------------
// Cliente logado
// ---------------------------------------------------------------------------------------------
export const ACOES_CLIENTE: Acao[] = [
  {
    nome: "consultar_saldo", escrita: false,
    descricao: "consultar_saldo {} — plano, saldo de horas do período e créditos extras.",
    async executar({ db, clienteId }) {
      const [{ data: r }, { data: cards }] = await Promise.all([
        db.rpc("cliente_plano_resumo", { p_cliente_corp_id: clienteId }),
        db.rpc("cliente_plano_cards", { p_cliente_corp_id: clienteId }),
      ]);
      const res = r as any;
      const creditos = ((cards || []) as any[]).filter((c) => c.vigente && (c.tipo === "credito" || c.tipo === "bonus"))
        .map((c) => `${c.titulo}: ${Math.max(0, c.horas_total - c.horas_usadas)}h restantes${c.periodo_fim ? ` (válido até ${brData(c.periodo_fim)})` : ""}`);
      if (!res || res.status === "sem_plano") return `Sem plano ativo. Reservas são cobradas como avulso (${reais(Number(res?.preco_avulso || 60))}/h).${creditos.length ? ` Créditos extras: ${creditos.join("; ")}.` : ""}`;
      return `Plano ${res.plano_nome} (${res.status}). Saldo do período ${res.janela_inicio ? `${brData(res.janela_inicio)} a ${brData(res.janela_fim)}` : ""}: ${res.saldo}h de ${res.cota}h.`
        + `${res.data_fim ? ` Contrato até ${brData(res.data_fim)}.` : ""}${creditos.length ? ` Créditos extras: ${creditos.join("; ")}.` : ""}`
        + `${(res.avisos || []).length ? ` Avisos: ${(res.avisos as any[]).map((a) => a.mensagem).join(" ")}` : ""}`;
    },
  },
  {
    nome: "minhas_reservas", escrita: false,
    descricao: "minhas_reservas {} — próximas reservas do cliente (com id para cancelar/alterar).",
    async executar({ db, clienteId }) {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await db.from("reservations").select("id, data, hora_inicio, hora_fim, status, salas(nome)")
        .eq("cliente_corp_id", clienteId).gte("data", hoje).neq("status", "cancelada").order("data").order("hora_inicio").limit(15);
      if (!data?.length) return "Nenhuma reserva futura.";
      return (data as any[]).map((r) => `id=${r.id} | ${brData(r.data)} ${String(r.hora_inicio).slice(0, 5)}–${String(r.hora_fim).slice(0, 5)} | ${r.salas?.nome || "sala"} | ${r.status}`).join("\n");
    },
  },
  {
    nome: "salas_livres", escrita: false,
    descricao: 'salas_livres {"data":"AAAA-MM-DD"} — horário de cada sala no dia e os períodos já ocupados.',
    executar: (ctx, p) => salasLivres(ctx.db, p),
  },
  {
    nome: "reservar", escrita: true,
    descricao: 'reservar {"sala":"nome da sala","data":"AAAA-MM-DD","inicio":"HH:MM","fim":"HH:MM","modalidade":"adicional|avulso (só se faltar saldo)"} — pede uma reserva.',
    async preparar({ db, clienteId }, p) {
      const sala = await acharSala(db, p.sala);
      const data = dataValida(p.data), ini = horaValida(p.inicio), fim = horaValida(p.fim);
      if (ini >= fim) throw new ErroAcao("O horário final deve ser depois do inicial.");
      const modalidade = ["adicional", "avulso"].includes(txt(p.modalidade)) ? txt(p.modalidade) : null;
      const preco = await precificar(db, clienteId!, sala, data, ini, fim, modalidade);
      if (preco.exc > 0 && preco.permiteAdicional && !modalidade) {
        throw new ErroAcao(`O saldo do plano não cobre tudo: faltam ${preco.exc}h. Pergunte se prefere hora adicional ou avulso e chame a ação de novo com "modalidade".`);
      }
      return {
        params: { sala_id: sala.id, data, inicio: ini, fim, modalidade },
        resumo: `Reservar ${sala.nome} (${sala.unidades?.nome || ""}) em ${brData(data)}, das ${ini} às ${fim} — ${descreverCobertura(preco)}.`,
      };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("request_authenticated_reservations", {
        p_periodos: [{ data: p.data, hora_inicio: p.inicio, hora_fim: p.fim }], p_sala_id: p.sala_id, p_modalidade: p.modalidade ?? null,
      });
      erroDb(error);
      return `Reserva enviada: ${brData(String(p.data))}, das ${p.inicio} às ${p.fim}. Ela aparece no seu calendário.`;
    },
  },
  {
    nome: "cancelar_reserva", escrita: true,
    descricao: 'cancelar_reserva {"reserva_id":"id","motivo":"2 a 180 caracteres"} — pede o cancelamento (com 24h ou mais de antecedência as horas voltam ao saldo).',
    async preparar({ db, clienteId }, p) {
      const motivo = txt(p.motivo, 180);
      if (motivo.length < 2) throw new ErroAcao("Pergunte o motivo do cancelamento (2 a 180 caracteres).");
      const { data: r } = await db.from("reservations").select("id, data, hora_inicio, hora_fim, status, cliente_corp_id").eq("id", txt(p.reserva_id, 80)).maybeSingle();
      if (!r || (r as any).cliente_corp_id !== clienteId) throw new ErroAcao("Não encontrei essa reserva na sua conta. Use minhas_reservas para ver os ids.");
      return { params: { reserva_id: (r as any).id, motivo }, resumo: `Pedir cancelamento da reserva de ${brData((r as any).data)}, ${String((r as any).hora_inicio).slice(0, 5)}–${String((r as any).hora_fim).slice(0, 5)}. Motivo: "${motivo}".` };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("request_reservation_change", { p_reservation_id: p.reserva_id, p_tipo: "cancelamento", p_mensagem: p.motivo });
      erroDb(error);
      return "Pedido de cancelamento enviado para a equipe.";
    },
  },
  {
    nome: "alterar_reserva", escrita: true,
    descricao: 'alterar_reserva {"reserva_id":"id","nova_data":"AAAA-MM-DD","novo_inicio":"HH:MM","novo_fim":"HH:MM","mensagem":"opcional"} — pede alteração de uma reserva.',
    async preparar({ db, clienteId }, p) {
      const { data: r } = await db.from("reservations").select("id, data, hora_inicio, hora_fim, cliente_corp_id").eq("id", txt(p.reserva_id, 80)).maybeSingle();
      if (!r || (r as any).cliente_corp_id !== clienteId) throw new ErroAcao("Não encontrei essa reserva na sua conta. Use minhas_reservas para ver os ids.");
      const nova = p.nova_data ? dataValida(p.nova_data) : null;
      const ini = p.novo_inicio ? horaValida(p.novo_inicio) : null;
      const fim = p.novo_fim ? horaValida(p.novo_fim) : null;
      const mensagem = txt(p.mensagem, 500);
      if (!nova && !ini && !mensagem) throw new ErroAcao("Pergunte o novo dia/horário desejado.");
      return {
        params: { reserva_id: (r as any).id, nova_data: nova, novo_inicio: ini, novo_fim: fim, mensagem },
        resumo: `Pedir alteração da reserva de ${brData((r as any).data)} ${String((r as any).hora_inicio).slice(0, 5)}–${String((r as any).hora_fim).slice(0, 5)} para ${nova ? brData(nova) : "o mesmo dia"}${ini ? `, ${ini}–${fim || "?"}` : ""}${mensagem ? `. Obs.: "${mensagem}"` : ""}.`,
      };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("request_reservation_change", {
        p_reservation_id: p.reserva_id, p_tipo: "alteracao", p_mensagem: p.mensagem || null,
        p_nova_data: p.nova_data || null, p_novo_inicio: p.novo_inicio || null, p_novo_fim: p.novo_fim || null,
      });
      erroDb(error);
      return "Pedido de alteração enviado para a equipe.";
    },
  },
];

async function salasLivres(db: SupabaseClient, p: Params) {
  const data = dataValida(p.data);
  const [{ data: salas }, { data: ocup }] = await Promise.all([
    db.from("salas").select("id, nome, unidade_id, unidades(nome)").in("status", ["disponivel", "ativa"]).order("nome"),
    db.rpc("get_public_room_availability", { p_start_date: data, p_end_date: data, p_sala_id: null }),
  ]);
  const linhas: string[] = [];
  for (const s of (salas || []) as any[]) {
    const { data: h } = await db.rpc("unidade_horario_dia", { p_unidade: s.unidade_id, p_data: data });
    const dia = (h as any[])?.[0];
    const ocupados = ((ocup || []) as any[]).filter((o) => o.sala_id === s.id).map((o) => `${String(o.hora_inicio).slice(0, 5)}–${String(o.hora_fim).slice(0, 5)}`);
    linhas.push(`${s.nome} (${s.unidades?.nome || ""}): ${dia?.fechado ? "fechada neste dia" : `funciona ${String(dia?.abre).slice(0, 5)}–${String(dia?.fecha).slice(0, 5)}; ocupado: ${ocupados.join(", ") || "nada"}`}`);
  }
  return `Disponibilidade em ${brData(data)}:\n${linhas.join("\n")}`;
}

// ---------------------------------------------------------------------------------------------
// Admin (cada operação passa pelas permissões reais do admin no banco)
// ---------------------------------------------------------------------------------------------
async function clientePorId(db: SupabaseClient, id: unknown) {
  const { data } = await db.from("clientes_corp").select("id, numero_cadastro, razao_social, responsavel_nome, responsavel_email, responsavel_telefone, status_acesso").eq("id", txt(id, 80)).maybeSingle();
  if (!data) throw new ErroAcao("Cliente não encontrado. Use buscar_cliente para obter o id.");
  return data as any;
}

const sanitizarHtml = (html: string) => html
  .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
  .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*\/?>/gi, "")
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
  .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "$1=\"#\"");

export const ACOES_ADMIN: Acao[] = [
  {
    nome: "agenda", escrita: false,
    descricao: 'agenda {"data_inicio":"AAAA-MM-DD","data_fim":"AAAA-MM-DD (opcional)"} — reservas no período (até 40).',
    async executar({ db }, p) {
      const ini = dataValida(p.data_inicio), fim = p.data_fim ? dataValida(p.data_fim) : ini;
      const { data } = await db.from("reservations").select("id, data, hora_inicio, hora_fim, status, nome, tipo_cobranca, salas(nome)")
        .gte("data", ini).lte("data", fim).neq("status", "cancelada").order("data").order("hora_inicio").limit(40);
      if (!data?.length) return "Nenhuma reserva ativa no período.";
      return (data as any[]).map((r) => `id=${r.id} | ${brData(r.data)} ${String(r.hora_inicio).slice(0, 5)}–${String(r.hora_fim).slice(0, 5)} | ${r.salas?.nome || "sem sala"} | ${r.nome} | ${r.status}${r.tipo_cobranca ? ` | ${r.tipo_cobranca}` : ""}`).join("\n");
    },
  },
  { nome: "salas_livres", escrita: false, descricao: 'salas_livres {"data":"AAAA-MM-DD"} — horário e ocupação das salas no dia.', executar: (ctx, p) => salasLivres(ctx.db, p) },
  {
    nome: "buscar_cliente", escrita: false,
    descricao: 'buscar_cliente {"texto":"nome, e-mail ou nº de cadastro"} — encontra clientes (com id).',
    async executar({ db }, p) {
      const t = txt(p.texto, 80).replace(/[%,()]/g, " ");
      if (t.length < 1) throw new ErroAcao("Informe o nome, e-mail ou número.");
      const num = Number(t.replace(/\D/g, ""));
      let q = db.from("clientes_corp").select("id, numero_cadastro, razao_social, responsavel_nome, responsavel_email, status_acesso, planos(nome)").is("deleted_at", null).limit(10);
      q = /^\D*\d+\D*$/.test(t) && num ? q.eq("numero_cadastro", num) : q.or(`razao_social.ilike.%${t}%,responsavel_nome.ilike.%${t}%,responsavel_email.ilike.%${t}%`);
      const { data } = await q;
      if (!data?.length) return "Nenhum cliente encontrado.";
      return (data as any[]).map((c) => `id=${c.id} | Nº ${String(c.numero_cadastro).padStart(4, "0")} | ${c.razao_social || c.responsavel_nome} | ${c.responsavel_email || "-"} | acesso: ${c.status_acesso} | plano: ${c.planos?.nome || "nenhum"}`).join("\n");
    },
  },
  {
    nome: "resumo_cliente", escrita: false,
    descricao: 'resumo_cliente {"cliente_id":"id"} — plano, saldo, créditos e próximas reservas do cliente.',
    async executar(ctx, p) {
      const c = await clientePorId(ctx.db, p.cliente_id);
      const saldo = await ACOES_CLIENTE[0].executar({ ...ctx, clienteId: c.id }, {});
      const reservas = await ACOES_CLIENTE[1].executar({ ...ctx, clienteId: c.id }, {});
      return `${c.razao_social || c.responsavel_nome} (Nº ${String(c.numero_cadastro).padStart(4, "0")}, acesso ${c.status_acesso}).\n${saldo}\nPróximas reservas:\n${reservas}`;
    },
  },
  {
    nome: "listar_planos", escrita: false, descricao: "listar_planos {} — planos cadastrados (com id).",
    async executar({ db }) {
      const { data } = await db.from("planos").select("id, nome, preco, cobranca").is("deleted_at", null).order("ordem" as any);
      return ((data || []) as any[]).map((p) => `id=${p.id} | ${p.nome} | ${reais(Number(p.preco || 0))} ${p.cobranca || ""}`).join("\n");
    },
  },
  {
    nome: "criar_reserva", escrita: true,
    descricao: 'criar_reserva {"cliente_id":"id","sala":"nome","data":"AAAA-MM-DD","inicio":"HH:MM","fim":"HH:MM","status":"confirmada|pendente","modalidade":"adicional|avulso"} — cria reserva para um cliente.',
    async preparar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const sala = await acharSala(db, p.sala);
      const data = dataValida(p.data), ini = horaValida(p.inicio), fim = horaValida(p.fim);
      if (ini >= fim) throw new ErroAcao("O horário final deve ser depois do inicial.");
      const modalidade = ["adicional", "avulso"].includes(txt(p.modalidade)) ? txt(p.modalidade) : null;
      const status = txt(p.status) === "pendente" ? "pendente" : "confirmada";
      const preco = await precificar(db, c.id, sala, data, ini, fim, modalidade);
      if (preco.exc > 0 && preco.permiteAdicional && !modalidade) throw new ErroAcao(`Faltam ${preco.exc}h de saldo no plano. Pergunte se cobra como hora adicional ou avulso.`);
      return {
        params: { cliente_id: c.id, sala_id: sala.id, data, inicio: ini, fim, status, modalidade },
        resumo: `Criar reserva ${status} para ${c.razao_social || c.responsavel_nome}: ${sala.nome}, ${brData(data)}, ${ini}–${fim} — ${descreverCobertura(preco)}.`,
      };
    },
    async executar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const sala = await acharSala(db, p.sala_id);
      const preco = await precificar(db, c.id, sala, String(p.data), String(p.inicio), String(p.fim), (p.modalidade as string) || null);
      const { error } = await db.from("reservations").insert({
        nome: c.razao_social || c.responsavel_nome, email: c.responsavel_email || "", telefone: c.responsavel_telefone || "",
        cliente_corp_id: c.id, ambiente: "sala_reuniao", tipo: "hora", data: p.data, hora_inicio: `${p.inicio}:00`, hora_fim: `${p.fim}:00`,
        status: p.status, origem: "Assistente do admin", unidade_id: sala.unidade_id, sala_id: sala.id,
        valor: preco.valor, valor_original: preco.valor, plano_id: preco.planoId, tipo_cobranca: preco.tipo,
        horas_reservadas: preco.horas, horas_cobertas_plano: preco.cob, horas_excedentes: preco.exc,
        calculo_justificativa: `Criada pelo assistente: ${descreverCobertura(preco)}.`,
      } as any);
      erroDb(error);
      return `Reserva criada: ${sala.nome}, ${brData(String(p.data))}, ${p.inicio}–${p.fim}.`;
    },
  },
  {
    nome: "cancelar_reserva", escrita: true,
    descricao: 'cancelar_reserva {"reserva_id":"id","motivo":"2 a 180 caracteres"} — cancela pela equipe (as horas voltam ao saldo).',
    async preparar({ db }, p) {
      const motivo = txt(p.motivo, 180);
      if (motivo.length < 2) throw new ErroAcao("Pergunte o motivo do cancelamento (2 a 180 caracteres).");
      const { data: r } = await db.from("reservations").select("id, nome, data, hora_inicio, hora_fim, status").eq("id", txt(p.reserva_id, 80)).maybeSingle();
      if (!r) throw new ErroAcao("Reserva não encontrada. Use a agenda para obter o id.");
      if ((r as any).status === "cancelada") throw new ErroAcao("Essa reserva já está cancelada.");
      return { params: { reserva_id: (r as any).id, motivo }, resumo: `Cancelar a reserva de ${(r as any).nome} em ${brData((r as any).data)}, ${String((r as any).hora_inicio).slice(0, 5)}–${String((r as any).hora_fim).slice(0, 5)}. Motivo: "${motivo}".` };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("admin_update_reservation_status", { p_reservation_id: p.reserva_id, p_status: "cancelada", p_motivo: p.motivo });
      erroDb(error);
      return "Reserva cancelada e horas devolvidas ao saldo do cliente.";
    },
  },
  {
    nome: "alterar_reserva", escrita: true,
    descricao: 'alterar_reserva {"reserva_id":"id","data":"AAAA-MM-DD","inicio":"HH:MM","fim":"HH:MM","sala":"nome (opcional)"} — remarca uma reserva.',
    async preparar({ db }, p) {
      const { data: r } = await db.from("reservations").select("id, nome, data, hora_inicio, hora_fim, sala_id, cliente_corp_id, tipo_cobranca, status").eq("id", txt(p.reserva_id, 80)).maybeSingle();
      if (!r) throw new ErroAcao("Reserva não encontrada.");
      const atual = r as any;
      const sala = p.sala ? await acharSala(db, p.sala) : await acharSala(db, atual.sala_id);
      const data = p.data ? dataValida(p.data) : atual.data, ini = p.inicio ? horaValida(p.inicio) : String(atual.hora_inicio).slice(0, 5), fim = p.fim ? horaValida(p.fim) : String(atual.hora_fim).slice(0, 5);
      if (ini >= fim) throw new ErroAcao("O horário final deve ser depois do inicial.");
      return { params: { reserva_id: atual.id, sala_id: sala.id, data, inicio: ini, fim }, resumo: `Remarcar a reserva de ${atual.nome} para ${sala.nome}, ${brData(data)}, ${ini}–${fim}.` };
    },
    async executar({ db }, p) {
      const { data: r } = await db.from("reservations").select("id, cliente_corp_id, tipo_cobranca").eq("id", p.reserva_id).maybeSingle();
      const sala = await acharSala(db, p.sala_id);
      const patch: Record<string, unknown> = { data: p.data, hora_inicio: `${p.inicio}:00`, hora_fim: `${p.fim}:00`, sala_id: sala.id, unidade_id: sala.unidade_id };
      if ((r as any)?.cliente_corp_id) {
        const preco = await precificar(db, (r as any).cliente_corp_id, sala, String(p.data), String(p.inicio), String(p.fim), (r as any).tipo_cobranca === "adicional" ? "adicional" : null, String(p.reserva_id));
        Object.assign(patch, { valor: preco.valor, valor_original: preco.valor, plano_id: preco.planoId, tipo_cobranca: preco.tipo, horas_reservadas: preco.horas, horas_cobertas_plano: preco.cob, horas_excedentes: preco.exc });
      }
      const { error } = await db.from("reservations").update(patch).eq("id", p.reserva_id);
      erroDb(error);
      return `Reserva remarcada para ${brData(String(p.data))}, ${p.inicio}–${p.fim}.`;
    },
  },
  {
    nome: "liberar_cadastro", escrita: true,
    descricao: 'liberar_cadastro {"cliente_id":"id","status":"aprovado|recusado"} — libera ou recusa o acesso de um cadastro.',
    async preparar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const status = txt(p.status) === "recusado" ? "recusado" : "aprovado";
      return { params: { cliente_id: c.id, status }, resumo: `${status === "aprovado" ? "Liberar" : "Recusar"} o acesso de ${c.razao_social || c.responsavel_nome}.` };
    },
    async executar({ db }, p) {
      const { error } = await db.from("clientes_corp").update({ status_acesso: p.status }).eq("id", p.cliente_id);
      erroDb(error);
      return p.status === "aprovado" ? "Acesso liberado." : "Cadastro recusado.";
    },
  },
  {
    nome: "contratar_plano", escrita: true,
    descricao: 'contratar_plano {"cliente_id":"id","plano_id":"id (use listar_planos)","inicio":"AAAA-MM-DD","valor":0,"horas":0} — contrata, revisa ou troca o plano (valor/horas opcionais).',
    async preparar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const { data: plano } = await db.from("planos").select("id, nome, preco").eq("id", txt(p.plano_id, 80)).is("deleted_at", null).maybeSingle();
      if (!plano) throw new ErroAcao("Plano não encontrado. Use listar_planos.");
      const inicio = dataValida(p.inicio);
      const valor = p.valor != null && p.valor !== "" ? Number(p.valor) : null;
      const horas = p.horas != null && p.horas !== "" ? Number(p.horas) : null;
      return { params: { cliente_id: c.id, plano_id: (plano as any).id, inicio, valor, horas }, resumo: `Contratar ${(plano as any).nome} para ${c.razao_social || c.responsavel_nome} a partir de ${brData(inicio)}${valor != null ? `, valor ${reais(valor)}` : ""}${horas != null ? `, ${horas}h combinadas` : ""}. Se houver outro plano, ele será trocado.` };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("admin_salvar_contrato", { p_cliente_corp_id: p.cliente_id, p_plano_id: p.plano_id, p_data_inicio: p.inicio, p_data_fim: null, p_valor: p.valor, p_horas: p.horas, p_observacoes: "Pelo assistente do admin" });
      erroDb(error);
      return "Plano salvo.";
    },
  },
  {
    nome: "renovar_contrato", escrita: true,
    descricao: 'renovar_contrato {"cliente_id":"id"} — renova o contrato atual por mais um período.',
    async preparar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const { data: k } = await db.from("cliente_planos").select("id, data_fim, planos(nome)").eq("cliente_corp_id", c.id).neq("status", "encerrado").maybeSingle();
      if (!k) throw new ErroAcao("O cliente não tem contrato aberto.");
      return { params: { contrato_id: (k as any).id }, resumo: `Renovar ${(k as any).planos?.nome} de ${c.razao_social || c.responsavel_nome}${(k as any).data_fim ? ` (vence em ${brData((k as any).data_fim)})` : ""}.` };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("admin_renovar_contrato", { p_contrato_id: p.contrato_id });
      erroDb(error);
      return "Contrato renovado.";
    },
  },
  {
    nome: "adicionar_creditos", escrita: true,
    descricao: 'adicionar_creditos {"cliente_id":"id","titulo":"texto","horas":0,"tipo":"compra|bonus","valor":0,"validade_dias":60} — insere créditos de horas (compra gera cobrança).',
    async preparar({ db }, p) {
      const c = await clientePorId(db, p.cliente_id);
      const horas = Number(p.horas);
      if (!(horas > 0 && horas <= 1000)) throw new ErroAcao("Informe as horas.");
      const tipo = txt(p.tipo) === "bonus" ? "bonus" : "compra";
      const valor = tipo === "compra" && p.valor ? Number(p.valor) : null;
      const validade = p.validade_dias ? Number(p.validade_dias) : null;
      const titulo = txt(p.titulo, 120) || `Pacote extra ${horas}h`;
      return { params: { cliente_id: c.id, titulo, horas, tipo, valor, validade }, resumo: `Adicionar ${horas}h (${tipo === "bonus" ? "bônus" : `compra${valor ? ` de ${reais(valor)}, gera cobrança` : ""}`}) para ${c.razao_social || c.responsavel_nome}${validade ? `, válido por ${validade} dias` : ", sem expiração"}.` };
    },
    async executar({ db }, p) {
      const { error } = await db.rpc("admin_adicionar_creditos", { p_cliente_corp_id: p.cliente_id, p_titulo: p.titulo, p_horas: p.horas, p_tipo: p.tipo, p_valor: p.valor, p_validade_dias: p.validade, p_observacoes: "Pelo assistente do admin", p_solicitacao_id: null });
      erroDb(error);
      return "Créditos adicionados.";
    },
  },
  {
    nome: "cobrancas", escrita: false,
    descricao: 'cobrancas {"mes":"AAAA-MM"} — lançamentos do mês (com id) e totais.',
    async executar({ db }, p) {
      const mes = txt(p.mes, 7);
      if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErroAcao("Informe o mês no formato AAAA-MM.");
      const { data } = await db.from("cobrancas").select("id, descricao, valor, status, vencimento, clientes_corp(razao_social)").eq("competencia", `${mes}-01`).order("vencimento").limit(60);
      const lista = (data || []) as any[];
      if (!lista.length) return "Nenhum lançamento no mês.";
      const total = (f: (c: any) => boolean) => reais(lista.filter(f).reduce((a, c) => a + Number(c.valor), 0));
      return `A receber: ${total((c) => c.status === "a_receber")} · Recebido: ${total((c) => c.status === "pago")}\n` + lista.map((c) => `id=${c.id} | ${c.clientes_corp?.razao_social || ""} | ${c.descricao} | ${reais(Number(c.valor))} | ${c.status} | venc. ${c.vencimento ? brData(c.vencimento) : "-"}`).join("\n");
    },
  },
  {
    nome: "gerar_cobrancas", escrita: true,
    descricao: 'gerar_cobrancas {"mes":"AAAA-MM"} — gera os lançamentos do mês (não duplica).',
    async preparar(_ctx, p) {
      const mes = txt(p.mes, 7);
      if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErroAcao("Informe o mês no formato AAAA-MM.");
      return { params: { mes }, resumo: `Gerar os lançamentos (mensalidades, pacotes, adicionais e avulsos) de ${mes.split("-").reverse().join("/")}.` };
    },
    async executar({ db }, p) {
      const { data, error } = await db.rpc("admin_gerar_cobrancas", { p_competencia: `${p.mes}-01` });
      erroDb(error);
      const d = data as any;
      return `Lançamentos gerados: ${d?.mensalidades || 0} mensalidades, ${d?.pacotes || 0} pacotes, ${d?.reservas || 0} de reservas.`;
    },
  },
  {
    nome: "marcar_pago", escrita: true,
    descricao: 'marcar_pago {"cobranca_id":"id","forma":"PIX|Dinheiro|Cartão de crédito|Cartão de débito|Transferência|Boleto","data":"AAAA-MM-DD"} — registra pagamento.',
    async preparar({ db }, p) {
      const { data: c } = await db.from("cobrancas").select("id, descricao, valor, status").eq("id", txt(p.cobranca_id, 80)).maybeSingle();
      if (!c) throw new ErroAcao("Lançamento não encontrado. Use cobrancas para ver os ids.");
      const forma = txt(p.forma, 40) || "PIX";
      const data = p.data ? dataValida(p.data) : new Date().toISOString().slice(0, 10);
      return { params: { cobranca_id: (c as any).id, forma, data }, resumo: `Marcar como pago "${(c as any).descricao}" (${reais(Number((c as any).valor))}) via ${forma} em ${brData(data)}.` };
    },
    async executar({ db }, p) {
      const { error } = await db.from("cobrancas").update({ status: "pago", forma_pagamento: p.forma, pago_em: p.data }).eq("id", p.cobranca_id);
      erroDb(error);
      return "Pagamento registrado.";
    },
  },
  {
    nome: "listar_artigos", escrita: false, descricao: "listar_artigos {} — artigos do blog (com id e status).",
    async executar({ db }) {
      const { data } = await db.from("site_articles").select("id, title, status, slug").order("created_at", { ascending: false }).limit(20);
      return ((data || []) as any[]).map((a) => `id=${a.id} | ${a.title} | ${a.status} | /blog/${a.slug}`).join("\n") || "Nenhum artigo.";
    },
  },
  {
    nome: "criar_artigo", escrita: true,
    descricao: 'criar_artigo {"titulo":"texto","resumo":"1-2 frases","conteudo_html":"<h2>..</h2><p>...</p>","imagem_url":"https://images.unsplash.com/photo-...?auto=format&fit=crop&w=1200&q=80","seo_title":"até 60 caracteres","seo_description":"até 155 caracteres","palavras_chave":"a, b, c"} — cria um RASCUNHO no blog. Imagem de destaque, resumo e SEO são obrigatórios; se o admin não enviar imagem, sugira uma foto real do Unsplash.',
    async preparar(_ctx, p) {
      const titulo = txt(p.titulo, 160);
      const conteudo = sanitizarHtml(txt(p.conteudo_html, 30000));
      if (titulo.length < 5 || conteudo.length < 50) throw new ErroAcao("Preciso de um título e de um conteúdo maior para o artigo.");
      const resumo = txt(p.resumo, 300);
      if (resumo.length < 20) throw new ErroAcao("Falta o resumo (1 a 2 frases) do artigo.");
      const imagem = await imagemValida(txt(p.imagem_url, 600));
      if (!imagem) throw new ErroAcao("A imagem de destaque é obrigatória e precisa ser um link https de uma imagem que exista. Sugira outra foto do Unsplash ou peça uma ao admin.");
      const seo = { title: txt(p.seo_title, 70) || titulo.slice(0, 70), description: txt(p.seo_description, 160) || resumo.slice(0, 160), keywords: txt(p.palavras_chave, 300) };
      const slug = titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      return { params: { titulo, resumo, conteudo, slug, imagem, seo }, resumo: `Criar o rascunho "${titulo}" no blog, com imagem de destaque e SEO (endereço /blog/${slug}). Ele não fica público até ser publicado.` };
    },
    async executar({ db, nomeUsuario }, p) {
      const { data: existe } = await db.from("site_articles").select("id").eq("slug", p.slug).maybeSingle();
      const slug = existe ? `${p.slug}-${Date.now().toString(36)}` : p.slug;
      const { data, error } = await db.from("site_articles").insert({
        title: p.titulo, excerpt: p.resumo, content: p.conteudo, slug, status: "Rascunho", image_url: p.imagem,
        seo_metadata: p.seo || {}, author: nomeUsuario || "Coworking 013",
      } as any).select("id").single();
      erroDb(error);
      return `Rascunho criado (id=${(data as any)?.id}): /blog/${slug}. Para publicar, use publicar_artigo ou abra em Marketing / Site → Artigos.`;
    },
  },
  {
    nome: "publicar_artigo", escrita: true,
    descricao: 'publicar_artigo {"artigo_id":"id"} — publica um artigo do blog.',
    async preparar({ db }, p) {
      const { data: a } = await db.from("site_articles").select("id, title, status, image_url, excerpt").eq("id", txt(p.artigo_id, 80)).maybeSingle();
      if (!a) throw new ErroAcao("Artigo não encontrado. Use listar_artigos.");
      if ((a as any).status === "Publicado") throw new ErroAcao("Esse artigo já está publicado.");
      if (!(a as any).image_url) throw new ErroAcao("O artigo está sem imagem de destaque. Adicione a imagem antes de publicar.");
      if (!(a as any).excerpt) throw new ErroAcao("O artigo está sem resumo. Adicione antes de publicar.");
      return { params: { artigo_id: (a as any).id }, resumo: `Publicar o artigo "${(a as any).title}" no site.` };
    },
    async executar({ db }, p) {
      const { error } = await db.from("site_articles").update({ status: "Publicado", published_at: new Date().toISOString() }).eq("id", p.artigo_id);
      erroDb(error);
      return "Artigo publicado.";
    },
  },
];
