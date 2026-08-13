import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Copy, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AdminDocsIA() {
  const schemaExemplo = {
    layout: [
      {
        id: "hero_exemplo",
        type: "hero",
        content: {
          title: "Título da Hero",
          subtitle: "Subtítulo atraente",
          image: "URL_DA_IMAGEM",
          cta: "Botão de Ação"
        },
        settings: { padding: "py-24", background: "bg-white" }
      },
      {
        id: "units_1",
        type: "units_grid",
        content: { title: "Nossas Unidades", limit: 3 },
        settings: { padding: "py-16" }
      }
    ]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const promptBase = `Você é uma IA especialista em design de interfaces para Coworking. 
Sua tarefa é gerar seções de página no formato JSON compatível com o "Construtor Dev".

A estrutura de cada seção deve seguir rigorosamente este schema:
- id: string única
- type: 'hero' | 'features' | 'text_block' | 'ideal_para' | 'units_grid' | 'plans_grid' | 'rooms_grid' | 'contact_form' | 'popup'
- content: objeto com campos específicos do widget
- settings: { padding, background, maxWidth }

Widgets Disponíveis e seus conteúdos:
1. hero: { title, subtitle, image, cta }
2. features: { title, items: [{ title, description, icon }] }
3. text_block: { title, text (HTML) }
4. units_grid: { title, subtitle, limit }
5. plans_grid: { title, subtitle, limit }
6. rooms_grid: { title, subtitle, limit }
7. contact_form: { title, subtitle }
8. popup: { triggerText, title, html, actionType: 'login'|'whatsapp'|'register' }

Sempre responda APENAS o JSON da propriedade "layout", sem explicações.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">Documentação para IA</h2>
        <p className="text-muted-foreground font-medium">Instruções para que outras IAs gerem conteúdo compatível com o Construtor Dev.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm bg-brand-blue-dark text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-orange" />
              Prompt Mestre para Geração de Conteúdo
            </CardTitle>
            <CardDescription className="text-white/70">
              Copie este prompt e cole no ChatGPT, Claude ou qualquer outra IA para gerar páginas completas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-black/20 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {promptBase}
            </pre>
            <Button 
              onClick={() => copyToClipboard(promptBase)}
              className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold"
            >
              <Copy className="w-4 h-4 mr-2" /> COPIAR PROMPT MESTRE
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-blue-dark">
              <FileCode className="w-5 h-5" />
              Exemplo de JSON de Importação
            </CardTitle>
            <CardDescription>
              Este é o formato que o sistema espera receber ao importar uma página ou seção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-muted p-4 rounded-xl text-xs overflow-x-auto font-mono">
              {JSON.stringify(schemaExemplo, null, 2)}
            </pre>
            <Button 
              variant="outline"
              onClick={() => copyToClipboard(JSON.stringify(schemaExemplo, null, 2))}
              className="w-full border-brand-blue-dark/20 text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white"
            >
              <Copy className="w-4 h-4 mr-2" /> COPIAR JSON DE EXEMPLO
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-blue-dark">
              <BookOpen className="w-5 h-5" />
              Como utilizar
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Copie o <strong>Prompt Mestre</strong> acima.</li>
              <li>Cole na sua IA de preferência e peça para ela criar uma página (ex: "Crie uma página de Preços com 5 seções").</li>
              <li>Copie o JSON gerado pela IA.</li>
              <li>No painel administrativo, vá em <strong>Marketing / Site &gt; Páginas</strong>.</li>
              <li>Abra o <strong>Editor Visual</strong> da página desejada.</li>
              <li>Clique no botão <strong>Importar JSON</strong> na barra superior e cole o código.</li>
              <li>O sistema irá renderizar automaticamente as seções mantendo todas as integrações com o banco de dados.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
