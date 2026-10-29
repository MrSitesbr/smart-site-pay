import { supabase } from "@/integrations/supabase/client";

const LIMITE_POR_PAGINA = 5;
let enviados = 0;
const vistos = new Set<string>();

/** Grava no banco um erro ocorrido no navegador do usuário, para a equipe diagnosticar telas brancas. */
export function reportarErro(origem: string, erro: unknown, detalheExtra?: string) {
  try {
    const mensagem = erro instanceof Error ? erro.message : typeof erro === "string" ? erro : JSON.stringify(erro);
    const chave = `${origem}:${mensagem}`;
    if (!mensagem || vistos.has(chave) || enviados >= LIMITE_POR_PAGINA) return;
    vistos.add(chave);
    enviados += 1;
    const pilha = erro instanceof Error ? erro.stack || "" : "";
    // Tabela nova, ainda fora dos tipos gerados do Supabase.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("client_error_logs" as any) as any).insert({
      origem: origem.slice(0, 40),
      mensagem: mensagem.slice(0, 2000),
      detalhe: [pilha, detalheExtra].filter(Boolean).join("\n---\n").slice(0, 8000) || null,
      url: window.location.href.slice(0, 1000),
      user_agent: navigator.userAgent.slice(0, 500),
    }).then(() => undefined, () => undefined);
  } catch {
    // O registro de erro nunca pode gerar outro erro.
  }
}

/** Captura erros não tratados e promessas rejeitadas da página inteira. */
export function instalarCapturaDeErros() {
  window.addEventListener("error", (event) => reportarErro("window.error", event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => reportarErro("promise", event.reason));
}
