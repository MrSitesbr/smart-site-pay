// Comunicação com a IA (OpenRouter, modelo gratuito). A chave fica só no servidor.
// O serviço gratuito tem limites de uso e disponibilidade: em falha, quem chama mostra uma mensagem genérica.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELO = "openrouter/free"; // somente o modelo gratuito; nunca troca para pago
const TEMPO_LIMITE_PADRAO = 30_000;
const TENTATIVAS_PADRAO = 3;

export type MensagemIA = { role: "system" | "user" | "assistant"; content: string };

export class ErroIA extends Error {
  constructor(public codigo: "sem_chave" | "chave_recusada" | "limite" | "indisponivel" | "vazia", mensagem: string) {
    super(mensagem);
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia a conversa e devolve o texto da resposta. Repete só falhas transitórias ou resposta vazia. */
export async function responderIA(
  mensagens: MensagemIA[],
  opcoes: { maxTokens?: number; temperatura?: number; chave?: string | null; tempoLimiteMs?: number; tentativas?: number; json?: boolean } = {},
) {
  const chave = opcoes.chave || Deno.env.get("OPENROUTER_API_KEY");
  const TENTATIVAS = opcoes.tentativas ?? TENTATIVAS_PADRAO;
  const TEMPO_LIMITE_MS = opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO;
  if (!chave) throw new ErroIA("sem_chave", "OPENROUTER_API_KEY não configurada");

  let ultimoErro: ErroIA = new ErroIA("indisponivel", "sem resposta");
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const resposta = await fetch(ENDPOINT, {
        method: "POST",
        signal: controle.signal,
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELO,
          messages: mensagens,
          max_tokens: opcoes.maxTokens ?? 700,
          temperature: opcoes.temperatura ?? 0.3,
          ...(opcoes.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (resposta.status === 401 || resposta.status === 403) {
        // Chave inválida ou acesso recusado: não adianta repetir.
        throw new ErroIA("chave_recusada", `acesso recusado (${resposta.status})`);
      }
      if (resposta.status === 429 || resposta.status >= 500) {
        ultimoErro = new ErroIA(resposta.status === 429 ? "limite" : "indisponivel", `status ${resposta.status}`);
        if (tentativa < TENTATIVAS) {
          const retryAfter = Number(resposta.headers.get("retry-after"));
          await esperar(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 20) * 1000 : 1500 * tentativa);
          continue;
        }
        throw ultimoErro;
      }
      if (!resposta.ok) throw new ErroIA("indisponivel", `status ${resposta.status}`);

      const dados = await resposta.json().catch(() => null);
      const texto = String(dados?.choices?.[0]?.message?.content ?? "").trim();
      if (!texto) {
        ultimoErro = new ErroIA("vazia", "resposta vazia");
        if (tentativa < TENTATIVAS) { await esperar(1500 * tentativa); continue; }
        throw ultimoErro;
      }
      return texto;
    } catch (erro) {
      if (erro instanceof ErroIA && (erro.codigo === "chave_recusada" || erro.codigo === "sem_chave")) throw erro;
      if (erro instanceof ErroIA && tentativa >= TENTATIVAS) throw erro;
      // Tempo esgotado ou falha de rede: tenta de novo com espera progressiva.
      ultimoErro = erro instanceof ErroIA ? erro : new ErroIA("indisponivel", "falha de rede ou tempo esgotado");
      if (tentativa < TENTATIVAS) await esperar(1500 * tentativa);
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimoErro;
}
