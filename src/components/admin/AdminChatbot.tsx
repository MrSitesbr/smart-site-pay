import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, Save, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/appErrors";
import { statusChatbot, type AgenteChat } from "@/lib/chatbot";
import ChatWidget from "@/components/chat/ChatWidget";

type Config = { agente: AgenteChat; ativo: boolean; nome: string; avatar_url: string | null; mensagem_inicial: string; diretrizes: string };
type Contatos = { whatsapp: string; telefone: string; email: string; horario_atendimento: string };

const AGENTES: { id: AgenteChat; titulo: string; ajuda: string }[] = [
  { id: "visitante", titulo: "Site (visitantes)", ajuda: "Botão no site. Responde só com informações públicas: unidades, salas, planos, preços, serviços e artigos." },
  { id: "cliente", titulo: "Painel do cliente", ajuda: "Para clientes logados: consulta saldo e reservas, faz reserva e pede cancelamento ou alteração, sempre pedindo confirmação." },
  { id: "admin", titulo: "Painel do admin", ajuda: "Para a equipe: agenda, reservas, clientes, planos, créditos, financeiro e artigos. Toda alteração pede confirmação e segue as regras do sistema." },
];

/** Reduz a imagem para 160px (JPEG leve) para não pesar o site. */
function reduzirImagem(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const lado = 160;
        const c = document.createElement("canvas");
        c.width = lado; c.height = lado;
        const x = c.getContext("2d")!;
        const escala = Math.max(lado / img.width, lado / img.height);
        const w = img.width * escala, h = img.height * escala;
        x.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = String(leitor.result);
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

export default function AdminChatbot() {
  const [configs, setConfigs] = useState<Record<string, Config>>({});
  const [contatos, setContatos] = useState<Contatos>({ whatsapp: "", telefone: "", email: "", horario_atendimento: "" });
  const [chave, setChave] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [testeAgente, setTesteAgente] = useState<AgenteChat>("visitante");

  useEffect(() => {
    (async () => {
      const [cfg, ct] = await Promise.all([
        (supabase.from("chatbot_config" as any) as any).select("*"),
        (supabase.from("chatbot_contatos" as any) as any).select("*").eq("id", 1).maybeSingle(),
      ]);
      setConfigs(Object.fromEntries(((cfg.data || []) as Config[]).map((c) => [c.agente, c])));
      if (ct.data) setContatos({ whatsapp: ct.data.whatsapp || "", telefone: ct.data.telefone || "", email: ct.data.email || "", horario_atendimento: ct.data.horario_atendimento || "" });
      setCarregando(false);
      const st = await statusChatbot();
      setChave(st.erro ? null : !!st.chave_configurada);
    })();
  }, []);

  const alterar = (agente: AgenteChat, campo: keyof Config, valor: unknown) =>
    setConfigs((atual) => ({ ...atual, [agente]: { ...atual[agente], [campo]: valor } }));

  async function salvarAgente(agente: AgenteChat) {
    const c = configs[agente];
    if (!c?.nome?.trim() || c.nome.trim().length < 2) return toast.error("Informe o nome do assistente.");
    setSalvando(agente);
    const { error } = await (supabase.from("chatbot_config" as any) as any).update({
      ativo: c.ativo, nome: c.nome.trim(), avatar_url: c.avatar_url, mensagem_inicial: c.mensagem_inicial.trim(),
      diretrizes: c.diretrizes, updated_at: new Date().toISOString(),
    }).eq("agente", agente);
    setSalvando(null);
    if (error) return toast.error(friendlyError(error, "Não foi possível salvar."));
    toast.success("Assistente salvo. Atualize a página do site para ver as mudanças.");
  }

  async function salvarContatos() {
    setSalvando("contatos");
    const { error } = await (supabase.from("chatbot_contatos" as any) as any).upsert({
      id: 1, whatsapp: contatos.whatsapp.replace(/\D/g, "") || null, telefone: contatos.telefone.trim() || null,
      email: contatos.email.trim() || null, horario_atendimento: contatos.horario_atendimento.trim() || null, updated_at: new Date().toISOString(),
    });
    setSalvando(null);
    if (error) return toast.error(friendlyError(error, "Não foi possível salvar os contatos."));
    toast.success("Contatos salvos");
  }

  if (carregando) return <Card className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-black text-brand-blue-dark">Assistentes virtuais (chatbot)</h2>
        <p className="text-sm text-muted-foreground">Três assistentes com nome, foto e diretrizes próprios. As informações do site são lidas automaticamente e acompanham suas edições.</p>
      </div>

      <Card className={`flex items-start gap-3 p-4 ${chave ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        {chave ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 text-amber-600" />}
        <div className="text-sm">
          <p className="font-semibold">{chave ? "Conexão com a IA configurada" : chave === false ? "Conexão com a IA ainda não configurada" : "Não foi possível verificar a conexão com a IA"}</p>
          <p className="text-muted-foreground">
            {chave ? "Os assistentes ativos já podem responder." : "A chave do serviço de IA precisa ser cadastrada no servidor pela equipe técnica. Enquanto isso, os assistentes mostram uma mensagem de indisponibilidade."}
          </p>
        </div>
      </Card>

      <Tabs defaultValue="visitante">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {AGENTES.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.titulo}</TabsTrigger>)}
        </TabsList>
        {AGENTES.map((a) => {
          const c = configs[a.id];
          if (!c) return null;
          return (
            <TabsContent key={a.id} value={a.id}>
              <Card className="space-y-4 p-5">
                <p className="text-sm text-muted-foreground">{a.ajuda}</p>
                <label className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">Assistente ativo</span>
                  <Switch checked={c.ativo} onCheckedChange={(v) => alterar(a.id, "ativo", v)} />
                </label>
                <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                  <div className="flex flex-col items-center gap-2">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue-dark text-white"><Bot className="h-9 w-9" /></span>}
                    <div className="flex gap-1">
                      <label className="inline-flex cursor-pointer items-center rounded-md border px-2 py-1 text-xs hover:bg-muted">
                        <Upload className="mr-1 h-3.5 w-3.5" />Foto
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const arq = e.target.files?.[0];
                          if (!arq) return;
                          try { alterar(a.id, "avatar_url", await reduzirImagem(arq)); } catch { toast.error("Não foi possível ler a imagem."); }
                          e.target.value = "";
                        }} />
                      </label>
                      {c.avatar_url && <button type="button" onClick={() => alterar(a.id, "avatar_url", null)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted" aria-label="Remover foto"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`nome-${a.id}`}>Nome</Label>
                      <Input id={`nome-${a.id}`} value={c.nome} maxLength={40} onChange={(e) => alterar(a.id, "nome", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`msg-${a.id}`}>Mensagem inicial</Label>
                      <Textarea id={`msg-${a.id}`} rows={2} maxLength={500} value={c.mensagem_inicial} onChange={(e) => alterar(a.id, "mensagem_inicial", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`dir-${a.id}`}>Diretrizes e funções</Label>
                  <Textarea id={`dir-${a.id}`} rows={8} maxLength={6000} value={c.diretrizes} onChange={(e) => alterar(a.id, "diretrizes", e.target.value)}
                    placeholder="Tom de voz, o que priorizar, o que evitar, promoções vigentes, como encaminhar..." />
                  <p className="text-xs text-muted-foreground">{c.diretrizes.length}/6000 · As regras de segurança do sistema sempre têm prioridade sobre as diretrizes.</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => salvarAgente(a.id)} disabled={salvando === a.id}>
                    {salvando === a.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar assistente
                  </Button>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="font-heading font-bold text-brand-blue-dark">Atendimento humano</h3>
            <p className="text-sm text-muted-foreground">O assistente só oferece estes canais quando não conseguir resolver ou quando a pessoa pedir. Deixe em branco o que não usar.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="ct-wa">WhatsApp (com DDD)</Label><Input id="ct-wa" value={contatos.whatsapp} onChange={(e) => setContatos({ ...contatos, whatsapp: e.target.value })} placeholder="5513999999999" /></div>
            <div className="space-y-1.5"><Label htmlFor="ct-tel">Telefone</Label><Input id="ct-tel" value={contatos.telefone} onChange={(e) => setContatos({ ...contatos, telefone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ct-mail">E-mail</Label><Input id="ct-mail" type="email" value={contatos.email} onChange={(e) => setContatos({ ...contatos, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ct-hor">Horário do atendimento</Label><Input id="ct-hor" value={contatos.horario_atendimento} onChange={(e) => setContatos({ ...contatos, horario_atendimento: e.target.value })} placeholder="Seg a sex, 9h às 18h" /></div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={salvarContatos} disabled={salvando === "contatos"}>
              {salvando === "contatos" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar contatos
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-brand-blue-dark">Testar conversa</h3>
            <select value={testeAgente} onChange={(e) => setTesteAgente(e.target.value as AgenteChat)} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Assistente para testar">
              {AGENTES.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Usa as diretrizes salvas. No teste do site e do cliente as ações ficam desligadas; no do admin as ações pedem confirmação e alteram dados de verdade.</p>
          {configs[testeAgente] && (
            <ChatWidget key={testeAgente} agente={testeAgente} embutido teste
              config={{ ativo: true, nome: configs[testeAgente].nome, avatar_url: configs[testeAgente].avatar_url, mensagem_inicial: configs[testeAgente].mensagem_inicial }} />
          )}
        </Card>
      </div>
    </div>
  );
}
