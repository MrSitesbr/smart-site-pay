// Conhecimento público do site para o assistente: lido ao vivo do banco (muda assim que o admin edita),
// dividido em trechos e filtrado pela pergunta, para não enviar a base inteira a cada mensagem.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Trecho = { titulo: string; texto: string; link?: string; sempre?: boolean };

const DIAS = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const CHAVES_PROIBIDAS = /(key|token|secret|senha|password|api|credential|smtp)/i;
const CHAVES_TEXTO = /^(title|titulo|subtitle|subtitulo|text|texto|description|descricao|content|label|heading|body|question|answer|pergunta|resposta|name|nome|caption|kicker|tag|location_tag|features|items|cards|faq|price|preco|period)$/i;

let cache: { em: number; trechos: Trecho[] } | null = null;

const reais = (v: unknown) => (v == null || v === "" ? null : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const limparHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const pareceDado = (s: string) => /^(https?:|data:|#[0-9a-f]{3,8}$|rgba?\(|\/assets\/|[\w-]+\.(png|jpe?g|svg|webp|mp4)$)/i.test(s.trim());

/** Junta os textos visíveis de uma seção do construtor de páginas, ignorando imagens, estilos e segredos. */
function textosDe(valor: unknown, chave = "", saida: string[] = []): string[] {
  if (saida.join(" ").length > 4000) return saida;
  if (typeof valor === "string") {
    if (CHAVES_TEXTO.test(chave) && !pareceDado(valor)) {
      const t = limparHtml(valor);
      if (t.length > 2) saida.push(t);
    }
  } else if (Array.isArray(valor)) {
    for (const v of valor) textosDe(v, chave, saida);
  } else if (valor && typeof valor === "object") {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      if (CHAVES_PROIBIDAS.test(k) || /^(styles|settings|style|className|image|images|src|icon|color|background)/i.test(k)) continue;
      textosDe(v, /^(content|widgets|columns|layout|sections|children)$/i.test(k) ? chave : k, saida);
    }
  }
  return saida;
}

export async function carregarConhecimento(admin: SupabaseClient): Promise<Trecho[]> {
  if (cache && Date.now() - cache.em < 60_000) return cache.trechos;

  const [unidades, horarios, salas, recursos, planos, servicos, artigos, paginas, contatos] = await Promise.all([
    admin.from("unidades").select("id, nome, endereco, status, descricao").ilike("status", "ativ%"),
    admin.from("unidade_horarios").select("unidade_id, dia_semana, abre, fecha, fechado"),
    admin.from("salas").select("id, nome, unidade_id, tipo, capacidade, descricao, recursos, preco_hora_avulsa, preco_diaria, metadata, status").in("status", ["disponivel", "ativa"]),
    admin.from("sala_recursos").select("id, nome"),
    admin.from("planos").select("nome, preco, cobranca, subtitulo, beneficios, descricao, exibir_site, deleted_at").is("deleted_at", null),
    admin.from("servicos").select("nome, preco, categoria, status"),
    admin.from("site_articles").select("title, excerpt, slug, status").eq("status", "Publicado").order("published_at", { ascending: false }).limit(30),
    admin.from("site_pages").select("route, name, site_sections(section_key, content, is_visible)"),
    admin.from("chatbot_contatos").select("whatsapp, telefone, email, horario_atendimento").eq("id", 1).maybeSingle(),
  ]);

  const trechos: Trecho[] = [];
  const nomeRecurso = new Map((recursos.data || []).map((r: any) => [r.id, r.nome]));
  const nomeUnidade = new Map((unidades.data || []).map((u: any) => [u.id, u.nome]));

  for (const u of unidades.data || []) {
    const dias = (horarios.data || []).filter((h: any) => h.unidade_id === u.id).sort((a: any, b: any) => a.dia_semana - b.dia_semana)
      .map((h: any) => `${DIAS[h.dia_semana]} ${h.fechado ? "fechado" : `${String(h.abre).slice(0, 5)}–${String(h.fecha).slice(0, 5)}`}`).join("; ");
    trechos.push({
      titulo: `Unidade ${u.nome}`,
      texto: `${u.nome}. Endereço: ${u.endereco || "não informado"}. Horário de atendimento: ${dias || "não cadastrado"}. Feriados nacionais fechados.${u.descricao ? ` ${limparHtml(u.descricao).slice(0, 400)}` : ""}`,
      link: "/unidades", sempre: true,
    });
  }
  for (const s of salas.data || []) {
    const rec = (s.recursos || []).map((id: string) => nomeRecurso.get(id) || id).join(", ");
    trechos.push({
      titulo: `Sala ${s.nome}`,
      texto: `Sala ${s.nome} (${nomeUnidade.get(s.unidade_id) || "unidade"}). Tipo: ${s.tipo || "-"}. Capacidade: ${s.capacidade || "-"} pessoa(s).`
        + (rec ? ` Recursos: ${rec}.` : "")
        + (s.preco_hora_avulsa ? ` Hora avulsa: ${reais(s.preco_hora_avulsa)}.` : "")
        + (s.preco_diaria ? ` Diária: ${reais(s.preco_diaria)}.` : "")
        + (s.descricao ? ` ${limparHtml(s.descricao).slice(0, 300)}` : ""),
      link: "/agendamento",
    });
  }
  const sufixo: Record<string, string> = { mensal: "/mês", unico: " (pagamento único)", hora: "/hora" };
  for (const p of planos.data || []) {
    if (p.exibir_site === false) continue;
    trechos.push({
      titulo: `Plano ${p.nome}`,
      texto: `Plano ${p.nome}: ${reais(p.preco) ? `${reais(p.preco)}${sufixo[p.cobranca] || ""}` : "valor sob consulta"}. ${p.subtitulo || ""}. ${(p.beneficios || []).join("; ")}${p.descricao ? `. ${limparHtml(p.descricao).slice(0, 300)}` : ""}`,
    });
  }
  const serv = (servicos.data || []).filter((s: any) => !s.status || /ativ/i.test(s.status));
  if (serv.length) {
    trechos.push({ titulo: "Serviços", texto: serv.map((s: any) => `${s.nome}${reais(s.preco) ? ` (${reais(s.preco)})` : ""}`).join("; "), link: "/servicos" });
  }
  for (const a of artigos.data || []) {
    trechos.push({ titulo: `Artigo: ${a.title}`, texto: `${a.title}. ${limparHtml(a.excerpt || "").slice(0, 300)}`, link: a.slug ? `/blog/${a.slug}` : "/blog" });
  }
  for (const p of paginas.data || []) {
    if (!p.route || !p.route.startsWith("/")) continue;
    const textos = (p.site_sections || []).filter((s: any) => s.is_visible !== false && s.section_key !== "global_settings")
      .flatMap((s: any) => textosDe(s.content));
    const texto = Array.from(new Set(textos)).join(" · ");
    if (texto.length > 20) trechos.push({ titulo: `Página ${p.name}`, texto: texto.slice(0, 2500), link: p.route });
  }
  const c = contatos.data;
  const canais = [c?.whatsapp && `WhatsApp: https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}`, c?.telefone && `Telefone: ${c.telefone}`, c?.email && `E-mail: ${c.email}`, c?.horario_atendimento && `Horário do atendimento humano: ${c.horario_atendimento}`].filter(Boolean);
  trechos.push({ titulo: "Contato", texto: canais.length ? canais.join(". ") : "Nenhum canal de atendimento humano configurado.", sempre: true });

  cache = { em: Date.now(), trechos };
  return trechos;
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PARADAS = new Set("que para com uma por como mais tem ter voces voce qual quais onde quando sobre esta isso essa este pode posso quero gostaria".split(" "));

/** Escolhe os trechos mais relacionados à pergunta (busca por palavras), limitando o tamanho total. */
export function selecionarTrechos(trechos: Trecho[], pergunta: string, limite = 6000): string {
  const termos = normalizar(pergunta).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !PARADAS.has(t));
  const pontuados = trechos.map((t) => {
    const alvo = normalizar(`${t.titulo} ${t.texto}`);
    const pontos = termos.reduce((acc, termo) => acc + (alvo.includes(termo) ? (normalizar(t.titulo).includes(termo) ? 3 : 1) : 0), 0);
    return { t, pontos: pontos + (t.sempre ? 0.5 : 0) };
  }).sort((a, b) => b.pontos - a.pontos);

  let total = 0;
  const escolhidos: string[] = [];
  for (const { t, pontos } of pontuados) {
    if (pontos <= 0 && !t.sempre && escolhidos.length >= 6) continue;
    const bloco = `### ${t.titulo}${t.link ? ` (link: ${t.link})` : ""}\n${t.texto}`;
    if (total + bloco.length > limite) continue;
    escolhidos.push(bloco);
    total += bloco.length;
  }
  return escolhidos.join("\n\n");
}
