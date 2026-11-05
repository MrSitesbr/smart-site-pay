// Leitura tolerante do pedido de ação escrito pela IA. O modelo gratuito varia de formato:
// <acao>{json}</acao>, bloco ```json```, JSON solto ou marcações estilo XML (<invoke>, <parameter name="...">).
// Nada dessas marcações pode aparecer para o usuário.

export type PedidoAcao = { nome: string | null; params: Record<string, unknown> };

const MARCACAO = /<\/?\s*(acao|action|actions|invoke|parameter|function_calls?|tool_calls?|tool_use|[a-z_]*function_call|function|antml:[a-z_]+)\b[^>]*>/i;

function jsonSeguro(texto: string): any {
  try { return JSON.parse(texto); } catch { return null; }
}

function deObjeto(obj: any): PedidoAcao | null {
  if (!obj || typeof obj !== "object") return null;
  const nome = obj.nome ?? obj.name ?? obj.acao ?? obj.action ?? obj.function ?? null;
  const params = obj.params ?? obj.parametros ?? obj.arguments ?? obj.args ?? obj.parameters ?? {};
  const p = typeof params === "string" ? jsonSeguro(params) || {} : params;
  if (typeof nome !== "string" && !Object.keys(p || {}).length) return null;
  return { nome: typeof nome === "string" ? nome.trim() : null, params: p && typeof p === "object" ? p : {} };
}

/** Extrai o pedido de ação, se houver. `nome` pode vir nulo quando a IA esqueceu de dizer qual ação. */
export function extrairPedido(texto: string): PedidoAcao | null {
  // 1) Formato combinado: <acao>{...}</acao>
  const acao = texto.match(/<acao>\s*([\s\S]*?)\s*<\/acao>/i);
  if (acao) {
    const r = deObjeto(jsonSeguro(acao[1]));
    if (r) return r;
  }
  // 2) Bloco de código com JSON que tenha "nome"/"name".
  const bloco = texto.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (bloco && /"(nome|name)"\s*:/.test(bloco[1])) {
    const r = deObjeto(jsonSeguro(bloco[1]));
    if (r) return r;
  }
  // 3) Marcações estilo XML.
  if (MARCACAO.test(texto)) {
    const params: Record<string, unknown> = {};
    for (const m of texto.matchAll(/<parameter\s+name\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/parameter>/gi)) {
      const valor = m[2].trim();
      params[m[1].trim()] = jsonSeguro(valor) ?? valor;
    }
    const nome = texto.match(/<(?:invoke|action|function|tool_call)\s+name\s*=\s*["']([^"']+)["']/i)?.[1]
      ?? texto.match(/<function\s*=\s*([a-z_]+)/i)?.[1]
      ?? texto.match(/"(?:nome|name)"\s*:\s*"([a-z_]+)"/i)?.[1]
      ?? null;
    // JSON dentro das marcações (ex.: <tool_call>{"name":...}</tool_call>)
    if (!nome && !Object.keys(params).length) {
      const obj = texto.match(/\{[\s\S]*\}/);
      const r = obj ? deObjeto(jsonSeguro(obj[0])) : null;
      if (r) return r;
    }
    return { nome, params };
  }
  // 4) JSON solto com "nome" e "params".
  const solto = texto.match(/\{\s*"(?:nome|name)"\s*:\s*"[a-z_]+"[\s\S]*\}/i);
  if (solto) {
    const r = deObjeto(jsonSeguro(solto[0]));
    if (r?.nome) return r;
  }
  return null;
}

/** Remove qualquer marcação de ação do texto mostrado ao usuário. */
export function limparTexto(texto: string): string {
  return texto
    .replace(/<acao>[\s\S]*?<\/acao>/gi, "")
    .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, (m) => (/"(nome|name)"\s*:/.test(m) ? "" : m))
    .replace(/<parameter\b[^>]*>[\s\S]*?<\/parameter>/gi, "")
    .replace(/<\/?\s*[a-z_:]*(acao|action|actions|invoke|parameter|function_calls?|tool_calls?|tool_use|function_call|function)\b[^>]*>/gi, "")
    .replace(/\{\s*"(?:nome|name)"\s*:\s*"[a-z_]+"[\s\S]*\}/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ainda sobrou cara de código/marcação? Então não mostra. */
export const pareceMarcacao = (texto: string) => MARCACAO.test(texto) || /<\/?[a-z_]+[^>]*>/i.test(texto);
