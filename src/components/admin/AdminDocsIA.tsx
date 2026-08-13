import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Copy, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AdminDocsIA() {
  const schemaExemplo = [
    {
      id: "sec_hero_premium",
      columns: [
        {
          id: "col_hero",
          widthPercentage: 100,
          widgets: [
            {
              id: "wid_hero_013",
              type: "heading",
              content: {
                text: "O Futuro do Trabalho é <span class='text-brand-orange'>Coworking 013</span>",
                level: "h1"
              },
              styles: { 
                fontSize: "64px",
                color: "#FFFFFF",
                fontWeight: "900",
                textAlign: "center",
                margin: { bottom: 20 }
              }
            },
            {
              id: "wid_sub_hero",
              type: "text",
              content: {
                text: "Infraestrutura de alta performance, networking estratégico e flexibilidade total para sua empresa decolar no coração da inovação."
              },
              styles: {
                fontSize: "20px",
                color: "#E2E8F0",
                textAlign: "center",
                margin: { bottom: 40 }
              }
            },
            {
              id: "wid_btn_hero",
              type: "button",
              content: {
                text: "CONHECER UNIDADES",
                url: "/unidades"
              },
              styles: {
                alignment: "center"
              }
            }
          ]
        }
      ],
      settings: { 
        fullWidth: true, 
        padding: { top: 120, bottom: 120, left: 20, right: 20 },
        backgroundColor: "#0F172A",
        backgroundImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80",
        overlayOpacity: 0.6
      }
    },
    {
      id: "sec_units_live",
      columns: [
        {
          id: "col_units_header",
          widthPercentage: 100,
          widgets: [
            {
              id: "wid_units_title",
              type: "heading",
              content: { text: "Nossas <span class='text-brand-orange'>Unidades</span>", level: "h2" },
              styles: { textAlign: "center", fontSize: "42px", fontWeight: "bold", margin: { bottom: 40 } }
            },
            {
              id: "wid_units_grid",
              type: "units_grid",
              content: { limit: 3 },
              styles: {}
            }
          ]
        }
      ],
      settings: { 
        fullWidth: false, 
        padding: { top: 80, bottom: 80, left: 0, right: 0 },
        backgroundColor: "#FFFFFF"
      }
    },
    {
      id: "sec_plans_live",
      columns: [
        {
          id: "col_plans",
          widthPercentage: 100,
          widgets: [
            {
              id: "wid_plans_title",
              type: "heading",
              content: { text: "Escolha seu <span class='text-brand-orange'>Plano</span>", level: "h2" },
              styles: { textAlign: "center", fontSize: "42px", fontWeight: "bold", margin: { bottom: 40 } }
            },
            {
              id: "wid_plans_grid",
              type: "plans_grid",
              content: { limit: 3 },
              styles: {}
            }
          ]
        }
      ],
      settings: { 
        fullWidth: false, 
        padding: { top: 80, bottom: 80, left: 0, right: 0 },
        backgroundColor: "#F8FAFC"
      }
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const promptBase = `Você é uma IA especialista em design de interfaces para Coworking. 
Sua tarefa é gerar seções de página no formato JSON compatível com o "Construtor Dev".

A estrutura deve ser uma LISTA (ARRAY) de seções.
Cada seção deve seguir rigorosamente este schema:
- id: string única
- columns: Array de objetos { id, widthPercentage, widgets: Widget[] }
- settings: { fullWidth: boolean, padding: { top, bottom, left, right }, backgroundColor }

Cada Widget deve ter:
- id: string única
- type: 'hero' | 'features' | 'text_block' | 'ideal_para' | 'units_grid' | 'plans_grid' | 'rooms_grid' | 'contact_form' | 'popup'
- content: objeto com campos específicos do widget
- styles: objeto com estilos (ex: { padding, textAlign })

Widgets Disponíveis e seus conteúdos:
1. heading: { text: "HTML", level: "h1"|"h2"|"h3" }
2. text: { text: "HTML formatado" }
3. image: { url: "URL", alt: "descrição" }
4. button: { text: "Rótulo", url: "Link" }
5. units_grid: { limit: number }
6. plans_grid: { limit: number }
7. rooms_grid: { limit: number }
8. contact_form: { title: "String", subtitle: "String" }
9. popup: { triggerText: "Abrir", title: "Título", html: "Conteúdo", actionType: 'login'|'whatsapp'|'register' }
10. form: { formType: "reserva" }

Sempre responda APENAS o JSON (ARRAY de seções), sem explicações.`;

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
