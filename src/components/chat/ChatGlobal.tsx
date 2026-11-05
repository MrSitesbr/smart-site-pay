import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { carregarConfigPublica, type AgenteChat, type ConfigPublica } from "@/lib/chatbot";
import ChatWidget from "./ChatWidget";

/**
 * Escolhe o assistente pela página: admin no painel administrativo, cliente no painel do cliente,
 * visitante no site. A permissão real é sempre conferida no servidor; aqui só decide o que exibir.
 */
export default function ChatGlobal() {
  const { pathname } = useLocation();
  const [configs, setConfigs] = useState<Partial<Record<AgenteChat, ConfigPublica>>>({});
  const [papel, setPapel] = useState<{ logado: boolean; admin: boolean }>({ logado: false, admin: false });

  useEffect(() => { carregarConfigPublica().then(setConfigs).catch(() => setConfigs({})); }, []);

  useEffect(() => {
    const verificar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPapel({ logado: false, admin: false }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setPapel({ logado: true, admin: !!data });
    };
    void verificar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void verificar(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const agente: AgenteChat | null = pathname.startsWith("/admin")
    ? (papel.admin ? "admin" : null)
    : pathname.startsWith("/painel")
      ? (papel.logado ? "cliente" : null)
      : "visitante";
  const config = agente ? configs[agente] : undefined;
  const visivel = !!agente && !!config?.ativo;

  // No site, o botão do WhatsApp sobe para não ficar embaixo do chat.
  useEffect(() => {
    document.body.dataset.chat = visivel ? "on" : "off";
    return () => { delete document.body.dataset.chat; };
  }, [visivel]);

  if (!visivel || !agente || !config) return null;
  return <ChatWidget key={agente} agente={agente} config={config} />;
}
