import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Layout, Settings2, Palette, FileText, ImageIcon, MousePointer2, FormInput, Grid, MapPin, Video, Maximize2, MessageSquare, Zap, Layers, LogIn, Navigation, CreditCard, Armchair, Building2, Edit3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminDocsIA() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-4xl font-black text-brand-blue-dark flex items-center gap-3 tracking-tighter">
          <BookOpen className="w-10 h-10 text-brand-orange" />
          Documentação Construtor Dev
        </h2>
        <div className="h-1.5 w-24 bg-brand-orange rounded-full" />
        <p className="text-lg text-muted-foreground font-medium max-w-3xl leading-relaxed">
          Guia completo para criação e edição de páginas utilizando a estrutura de seções, colunas e widgets do sistema, seguindo a lógica de hierarquia e abas do Elementor Pro.
        </p>
      </div>

      <div className="prose prose-slate max-w-none">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 mb-10 shadow-sm">
          <h3 className="text-2xl font-black text-brand-blue-dark mt-0 flex items-center gap-2">
            <Layout className="w-6 h-6 text-brand-orange" />
            Hierarquia de Construção
          </h3>
          <p className="text-slate-600 leading-relaxed font-medium">
            No Construtor Dev, a estrutura de construção de páginas é dividida em hierarquias: 
            <strong className="text-brand-blue-dark"> Seções/Contêineres</strong>, 
            <strong className="text-brand-blue-dark"> Colunas/Flexbox Items</strong> e 
            <strong className="text-brand-blue-dark"> Elementos/Widgets</strong>. 
            Cada um desses níveis é configurado por um painel lateral padronizado com <strong className="text-brand-orange">3 abas principais</strong>:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">1</div>
                <h4 className="font-black text-sm uppercase tracking-wider text-brand-blue-dark m-0">Conteúdo</h4>
              </div>
              <p className="text-xs text-muted-foreground m-0">Elementos de entrada/troca. Onde se define o que aparece no elemento (imagens, textos, links, fontes de dados).</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black">2</div>
                <h4 className="font-black text-sm uppercase tracking-wider text-brand-blue-dark m-0">Estilo</h4>
              </div>
              <p className="text-xs text-muted-foreground m-0">Aparência visual. Onde se altera cores, tipografia, bordas, comportamentos visuais e alinhamentos estilísticos.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black">3</div>
                <h4 className="font-black text-sm uppercase tracking-wider text-brand-blue-dark m-0">Avançado</h4>
              </div>
              <p className="text-xs text-muted-foreground m-0">Configurações técnicas. Onde se controlam margens, padding, efeitos de movimento, visibilidade e CSS customizado.</p>
            </div>
          </div>
        </div>

        <h3 className="text-3xl font-black text-brand-blue-dark border-b-4 border-brand-orange/20 pb-2 mb-8 uppercase tracking-tighter">Estrutura Base</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-all group">
            <div className="bg-brand-blue-dark p-4 flex items-center gap-3">
              <Layers className="text-brand-orange w-6 h-6" />
              <CardTitle className="text-white text-xl uppercase font-black tracking-tight">Seções (Contêineres Pai)</CardTitle>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-brand-orange">Conteúdo</span>
                <p className="text-sm text-muted-foreground font-medium">Largura da seção (Boxed/Total), alinhamento de itens internos e altura mínima.</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-brand-orange">Estilo</span>
                <p className="text-sm text-muted-foreground font-medium">Fundo (cor, gradiente, imagem ou vídeo), sobreposição de fundo e divisores de forma.</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-brand-orange">Avançado</span>
                <p className="text-sm text-muted-foreground font-medium">Margens externas/internas da seção inteira, efeitos de rolagem (Sticky) e visibilidade.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-all group">
            <div className="bg-slate-800 p-4 flex items-center gap-3">
              <Grid className="text-blue-400 w-6 h-6" />
              <CardTitle className="text-white text-xl uppercase font-black tracking-tight">Colunas (Contêineres Filho)</CardTitle>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400">Conteúdo</span>
                <p className="text-sm text-muted-foreground font-medium">Largura da coluna (%), alinhamento vertical/horizontal e espaço entre widgets.</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400">Estilo</span>
                <p className="text-sm text-muted-foreground font-medium">Borda da coluna, cor de fundo individual e sombras ao passar o mouse (Hover).</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400">Avançado</span>
                <p className="text-sm text-muted-foreground font-medium">Margens e paddings específicos da coluna e ordem de exibição em mobile.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-3xl font-black text-brand-blue-dark border-b-4 border-brand-orange/20 pb-2 mb-8 uppercase tracking-tighter">Elementos Básicos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <FileText className="w-5 h-5 text-brand-orange" />, title: "Título", desc: "Tag HTML (h1-p), links e tipografia avançada." },
            { icon: <Edit3 className="w-5 h-5 text-brand-orange" />, title: "Editor de Texto", desc: "Editor WYSIWYG para textos longos e capitulares." },
            { icon: <ImageIcon className="w-5 h-5 text-brand-orange" />, title: "Imagem", desc: "Upload, filtros CSS, opacidade e lightbox." },
            { icon: <MousePointer2 className="w-5 h-5 text-brand-orange" />, title: "Botão", desc: "Links, ícones, cores hover e border-radius." },
            { icon: <FormInput className="w-5 h-5 text-brand-orange" />, title: "Formulário", desc: "Campos, ações pós-envio e design de inputs." },
            { icon: <Grid className="w-5 h-5 text-brand-orange" />, title: "Galeria", desc: "Lotes de imagens, colunas e estilos de filtro." },
            { icon: <MapPin className="w-5 h-5 text-brand-orange" />, title: "Mapa", desc: "Google Maps, zoom e filtros de saturação." },
            { icon: <Video className="w-5 h-5 text-brand-orange" />, title: "Vídeo", desc: "YouTube/Vimeo, autoplay, mute e thumbnails." },
            { icon: <Maximize2 className="w-5 h-5 text-brand-orange" />, title: "Espaçador", desc: "Regulação de altura em pixels por dispositivo." },
            { icon: <MessageSquare className="w-5 h-5 text-brand-orange" />, title: "Popup / Modal", desc: "Gatilhos (tempo, scroll) e animações." },
            { icon: <Zap className="w-5 h-5 text-brand-orange" />, title: "Hero Banner", desc: "Destaque 100vh, gradientes e máscaras." },
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-brand-orange transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-brand-orange/10 transition-colors">
                  {item.icon}
                </div>
                <h4 className="font-black text-brand-blue-dark m-0">{item.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground font-medium m-0">{item.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-3xl font-black text-brand-blue-dark border-b-4 border-brand-orange/20 pb-2 mb-8 uppercase tracking-tighter">Componentes Dinâmicos (CRM/ERP)</h3>
        
        <div className="space-y-4 mb-12">
          {[
            { icon: <Building2 />, title: "Grade de Unidades", content: "Seleção da fonte de dados (Post Type 'Unidades'), quantidade, filtros por cidade e layout de grid." },
            { icon: <Armchair />, title: "Grade de Salas", content: "Consulta dinâmica por tipo (Privativa, Reunião), exibição de capacidade e preço/hora via AJAX." },
            { icon: <CreditCard />, title: "Grade de Planos", content: "Tabela de preços com destaque para 'Mais Popular', listas de benefícios e checkout integrado." },
            { icon: <Zap />, title: "Modal Dinâmico", content: "Puxa dados da sala ou unidade clicada automaticamente utilizando tags dinâmicas." },
            { icon: <Navigation />, title: "Bloco Header (Global)", content: "Menu de Navegação, Logo dinâmica e Sticky Header com transição no scroll." },
            { icon: <Layers />, title: "Bloco Footer (Global)", content: "Menus institucionais, copyright automático e carregamento otimizado de ícones sociais." },
            { icon: <LogIn />, title: "Login / Área do Cliente", content: "Campos de usuário, links de recuperação e controle de visibilidade para logados." },
          ].map((comp, i) => (
            <div key={i} className="flex gap-6 items-start p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue-dark text-white flex items-center justify-center shrink-0">
                {React.cloneElement(comp.icon as React.ReactElement, { className: "w-6 h-6" })}
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-brand-blue-dark m-0 uppercase tracking-tight">{comp.title}</h4>
                <p className="text-sm text-slate-600 font-medium m-0 leading-relaxed">{comp.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-brand-orange p-1 rounded-[3rem]">
        <div className="bg-brand-blue-dark rounded-[2.9rem] p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="relative z-10 space-y-8">
            <div className="max-w-2xl">
              <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter text-white">Pronto para importar?</h3>
              <p className="text-white/70 font-medium mb-8 text-lg">
                Utilize esta estrutura para orientar outras IAs a gerarem seções compatíveis em JSON. O motor Dev interpretará exatamente estas hierarquias para renderizar o site.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-brand-orange font-black uppercase tracking-widest text-sm">Prompt Mestre para IA</h4>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                  {`Atue como um Engenheiro de UI especializado no Construtor Dev (Elementor-based).
Gere um JSON de página seguindo esta hierarquia:
1. SectionData { id, settings: { fullWidth, backgroundType, padding, margin }, columns }
2. ColumnData { id, widthPercentage, widgets, settings }
3. WidgetData { id, type, content, styles, settings }

Tipos de Widgets suportados: 
heading, text (WYSIWYG), image, button, form, gallery, video, map, 
spacer, units_grid, plans_grid, rooms_grid, icon_box, social_icons, testimonials, accordion.

Padrão de Estilos: Use objetos JSON para 'styles' (fontSize, color, fontWeight, borderRadius).
Padrão de Conteúdo: Campos como 'text', 'title', 'url', 'image'.
Mantenha os IDs únicos (UUID v4).`}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-brand-orange font-black uppercase tracking-widest text-sm">Exemplo de Estrutura JSON</h4>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 font-mono text-[11px] text-brand-orange leading-relaxed overflow-x-auto">
                  {`{
  "sections": [
    {
      "id": "sec-001",
      "settings": { 
        "fullWidth": true, 
        "padding": { "top": 80, "bottom": 80 },
        "backgroundColor": "#FFFFFF",
        "backgroundType": "classic"
      },
      "columns": [
        {
          "id": "col-001",
          "widthPercentage": 100,
          "widgets": [
            {
              "id": "wid-001",
              "type": "heading",
              "content": { "text": "Bem-vindo ao Coworking 013" },
              "styles": { "color": "#002B49", "fontSize": "48px", "textAlign": "center" }
            }
          ]
        }
      ]
    }
  ]
}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

