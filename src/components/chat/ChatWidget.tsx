import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Check, Loader2, MessageSquareText, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmarAcao, enviarMensagens, type AgenteChat, type ConfigPublica, type MensagemChat } from "@/lib/chatbot";
import MensagemFormatada from "./MensagemFormatada";

type Props = {
  agente: AgenteChat;
  config: ConfigPublica;
  /** Dentro da tela de configurações (sem botão flutuante). */
  embutido?: boolean;
  /** Conversa de teste do admin (ações desativadas no servidor). */
  teste?: boolean;
};

const chaveHistorico = (agente: AgenteChat) => `chat_historico_${agente}`;
const lerHistorico = (agente: AgenteChat): MensagemChat[] => {
  try { return JSON.parse(sessionStorage.getItem(chaveHistorico(agente)) || "[]"); } catch { return []; }
};

function Avatar({ config, tamanho = 36 }: { config: ConfigPublica; tamanho?: number }) {
  return config.avatar_url
    ? <img src={config.avatar_url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />
    : <span className="flex shrink-0 items-center justify-center rounded-full bg-white/15 text-white" style={{ width: tamanho, height: tamanho }}><Bot className="h-1/2 w-1/2" /></span>;
}

export default function ChatWidget({ agente, config, embutido = false, teste = false }: Props) {
  const [aberto, setAberto] = useState(embutido);
  const [mensagens, setMensagens] = useState<MensagemChat[]>(() => (embutido ? [] : lerHistorico(agente)));
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (embutido) return;
    try { sessionStorage.setItem(chaveHistorico(agente), JSON.stringify(mensagens.slice(-30))); } catch { /* sem armazenamento */ }
  }, [mensagens, agente, embutido]);

  useEffect(() => { fimRef.current?.scrollIntoView({ block: "end" }); }, [mensagens, enviando, aberto]);

  // Link "Ajuda" (login/cadastro) e outros pontos podem abrir o chat com uma pergunta pronta.
  useEffect(() => {
    if (embutido) return;
    const abrir = (e: Event) => {
      setAberto(true);
      const pergunta = (e as CustomEvent).detail?.pergunta;
      if (pergunta) setTexto(pergunta);
      setTimeout(() => campoRef.current?.focus(), 50);
    };
    window.addEventListener("abrir-chat", abrir);
    return () => window.removeEventListener("abrir-chat", abrir);
  }, [embutido]);

  async function enviar(conteudo?: string, base: MensagemChat[] = mensagens) {
    const msg = (conteudo ?? texto).trim().slice(0, 2000);
    if (!msg || enviando) return;
    const novas: MensagemChat[] = [...base, { role: "user", content: msg }];
    setMensagens(novas);
    setTexto("");
    setFalhou(null);
    setEnviando(true);
    const r = await enviarMensagens(agente, novas, teste);
    setEnviando(false);
    if (r.erro) {
      setFalhou(r.tentar_novamente === false ? null : msg);
      setMensagens((atual) => [...atual, { role: "assistant", content: r.erro! }]);
      return;
    }
    setMensagens((atual) => [...atual, { role: "assistant", content: r.resposta || "", acao: r.acao ? { ...r.acao, estado: "pendente" } : undefined }]);
  }

  async function responderAcao(indice: number, aceitar: boolean) {
    const alvo = mensagens[indice]?.acao;
    if (!alvo || alvo.estado !== "pendente" || enviando) return;
    setMensagens((atual) => atual.map((m, i) => (i === indice && m.acao ? { ...m, acao: { ...m.acao, estado: aceitar ? "confirmada" : "recusada" } } : m)));
    setEnviando(true);
    const r = await confirmarAcao(agente, alvo.id, aceitar);
    setEnviando(false);
    setMensagens((atual) => [...atual, { role: "assistant", content: r.resposta || r.erro || "Não foi possível concluir agora." }]);
  }

  function tentarDeNovo() {
    if (!falhou) return;
    // Reenvia a mesma pergunta sem repetir a pergunta e a mensagem de erro anteriores.
    void enviar(falhou, mensagens.slice(0, Math.max(0, mensagens.length - 2)));
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); }
  }

  const janela = (
    <div className={`flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl ${embutido ? "h-[520px] w-full" : "h-[min(600px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))]"}`}
      role="dialog" aria-label={`Conversa com ${config.nome}`}>
      <div className="flex items-center gap-3 bg-brand-blue-dark px-4 py-3 text-white">
        <Avatar config={config} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-bold leading-tight">{config.nome}</p>
          <p className="text-[11px] text-white/70">{teste ? "Conversa de teste" : "Assistente virtual"}</p>
        </div>
        {!embutido && (
          <button type="button" onClick={() => setAberto(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Fechar conversa"><X className="h-5 w-5" /></button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3 text-sm" aria-live="polite">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-background px-3 py-2 text-foreground">
          <MensagemFormatada texto={config.mensagem_inicial || "Olá! Como posso ajudar?"} />
        </div>
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === "user" ? "rounded-tr-sm bg-brand-blue-dark text-white" : "rounded-tl-sm border bg-background text-foreground"}`}>
              {m.role === "user" ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : <MensagemFormatada texto={m.content} />}
              {m.acao && (
                <div className="mt-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-950">
                  <p className="text-[13px]">{m.acao.resumo}</p>
                  {m.acao.estado === "pendente" ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8" onClick={() => responderAcao(i, true)} disabled={enviando}><Check className="mr-1 h-4 w-4" />Confirmar</Button>
                      <Button size="sm" variant="outline" className="h-8 bg-white" onClick={() => responderAcao(i, false)} disabled={enviando}>Cancelar</Button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold">{m.acao.estado === "confirmada" ? "Confirmado" : "Cancelado"}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" /></span>
            {config.nome} está escrevendo…
          </div>
        )}
        {falhou && !enviando && (
          <Button size="sm" variant="outline" className="h-8" onClick={tentarDeNovo}><RotateCcw className="mr-1 h-4 w-4" />Tentar novamente</Button>
        )}
        <div ref={fimRef} />
      </div>

      <form className="flex items-end gap-2 border-t bg-background p-2" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
        <textarea ref={campoRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={aoTeclar} rows={1} maxLength={2000}
          placeholder="Escreva sua mensagem…" aria-label="Mensagem"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-dark/40" />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={enviando || !texto.trim()} aria-label="Enviar">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );

  if (embutido) return janela;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {aberto && janela}
      <button type="button" onClick={() => setAberto((a) => !a)}
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-brand-blue-dark text-white shadow-2xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue-dark/40"
        aria-label={aberto ? "Fechar assistente" : `Abrir conversa com ${config.nome}`} aria-expanded={aberto}>
        {aberto ? <X className="h-6 w-6" /> : config.avatar_url ? <img src={config.avatar_url} alt="" className="h-full w-full object-cover" /> : <MessageSquareText className="h-6 w-6" />}
      </button>
    </div>
  );
}
