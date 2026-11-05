// Geração de artigo do blog pelo admin (antes feita pela Mistral no navegador).

export const promptArtigo = (tamanho: string) => `Você é um redator especialista em SEO e coworking, escrevendo em português do Brasil.
Escreva um artigo completo, original e otimizado para a palavra-chave foco. Tamanho solicitado: ${tamanho}.
Use HTML simples: <h2>, <h3>, <p>, <strong>, <ul>, <li>. Cada parágrafo dentro de <p>...</p>. Sem <script>, <style> ou <iframe>.
Sugira UMA imagem principal do Unsplash que combine com o tema no campo sugestao_imagem_url.
Responda SOMENTE com JSON válido neste formato:
{"titulo":"...","conteudo":"...","seo_title":"...","seo_description":"...","keywords":"...","sugestao_imagem_url":"https://images.unsplash.com/photo-XXX?auto=format&fit=crop&w=800&q=80"}`;

export function lerJSON(texto: string): Record<string, unknown> | null {
  const limpo = texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    return JSON.parse(limpo.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

/** Remove scripts, estilos, iframes, formulários e atributos de evento do HTML gerado. */
export function limparHTML(html: string) {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

export function montarArtigo(texto: string) {
  const a = lerJSON(texto);
  if (!a || typeof a.conteudo !== "string" || !a.conteudo.trim()) return null;
  const imagem = String(a.sugestao_imagem_url || "");
  return {
    titulo: String(a.titulo || "").slice(0, 200),
    conteudo: limparHTML(a.conteudo).slice(0, 60000),
    seo_title: String(a.seo_title || "").slice(0, 200),
    seo_description: String(a.seo_description || "").slice(0, 400),
    keywords: String(a.keywords || "").slice(0, 400),
    sugestao_imagem_url: UNSPLASH.test(imagem) ? imagem : "",
  };
}
