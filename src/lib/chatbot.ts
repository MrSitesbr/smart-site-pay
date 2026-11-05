import { supabase } from "@/integrations/supabase/client";

export type AgenteChat = "visitante" | "cliente" | "admin";
export type ConfigPublica = { ativo: boolean; nome: string; avatar_url: string | null; mensagem_inicial: string };
export type MensagemChat = { role: "user" | "assistant"; content: string; acao?: { id: string; resumo: string; estado?: "pendente" | "confirmada" | "recusada" } };
export type RespostaChat = { resposta?: string; acao?: { id: string; resumo: string }; erro?: string; tentar_novamente?: boolean };

const FALHA = "Não consegui responder agora. Tente novamente em instantes.";

/** Opções públicas dos assistentes (nome, avatar, mensagem inicial, ativo). Sem diretrizes internas. */
export async function carregarConfigPublica(): Promise<Partial<Record<AgenteChat, ConfigPublica>>> {
  const { data } = await (supabase.rpc as any)("chatbot_publico");
  return (data || {}) as Partial<Record<AgenteChat, ConfigPublica>>;
}

async function chamar(body: Record<string, unknown>): Promise<RespostaChat> {
  const { data, error } = await supabase.functions.invoke("chat-assistente", { body });
  if (error) {
    // A função devolve mensagens amigáveis no corpo mesmo em erro (403, 429, 503).
    const ctx = (error as { context?: Response }).context;
    const corpo = ctx instanceof Response ? await ctx.clone().json().catch(() => null) : null;
    return { erro: corpo?.erro || FALHA, tentar_novamente: corpo?.tentar_novamente ?? true };
  }
  return (data || { erro: FALHA }) as RespostaChat;
}

export const enviarMensagens = (agente: AgenteChat, mensagens: MensagemChat[], teste = false) =>
  chamar({ agente, teste, mensagens: mensagens.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })) });

export const confirmarAcao = (agente: AgenteChat, id: string, aceitar: boolean) => chamar({ agente, confirmar: { id, aceitar } });

export const statusChatbot = () => chamar({ agente: "admin", status: true }) as Promise<RespostaChat & { chave_configurada?: boolean }>;

/** Abre o chat de qualquer lugar do site (ex.: link "Ajuda" no login), opcionalmente com uma pergunta. */
export function abrirChat(pergunta?: string) {
  window.dispatchEvent(new CustomEvent("abrir-chat", { detail: { pergunta } }));
}
