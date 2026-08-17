import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, CheckCircle2, Layout, Zap, Edit3, Layers, Smartphone, MousePointer2 } from "lucide-react";

export default function AdminDocsIA() {
  const sections = [
    {
      title: "1. Infraestrutura Visual",
      icon: <Layout className="w-5 h-5 text-brand-orange" />,
      items: [
        "Arrastar e Soltar (Drag & Drop): Movimentação fluida de seções e widgets.",
        "Redimensionamento de Colunas: Alças visuais para ajuste de largura (%).",
        "Navegador de Elementos: Árvore hierárquica para gestão de camadas.",
        "Controles Responsivos: Ajustes individuais para Mobile/Tablet/Desktop."
      ]
    },
    {
      title: "2. Estilização Avançada",
      icon: <Palette className="w-5 h-5 text-brand-orange" />,
      items: [
        "Fundos Complexos: Gradientes, Vídeos e Overlays de cor.",
        "Tipografia Elementor: Altura de linha, espaçamento e sombras customizadas.",
        "Bordas e Sombras: Arredondamento individual e Box Shadows avançados.",
        "Animações de Entrada: Fade, Slide e Zoom para elementos."
      ]
    },
    {
      title: "3. Widgets Dinâmicos",
      icon: <Zap className="w-5 h-5 text-brand-orange" />,
      items: [
        "Seção Interna (Inner Section): Colunas aninhadas para layouts complexos.",
        "Carrossel de Testemunhos: Slider dinâmico integrado.",
        "Caixa de Ícone Coworking: Bloco modular com ícones e chamadas.",
        "Filtros de CRM: Widgets que listam Unidades e Salas com filtros reais."
      ]
    },
    {
      title: "4. Produtividade",
      icon: <Edit3 className="w-5 h-5 text-brand-orange" />,
      items: [
        "Sistema de Undo/Redo: Histórico de edições completo.",
        "Biblioteca de Modelos: Salvar e importar seções JSON pré-moldadas.",
        "Visualização em Tempo Real: Feedback instantâneo no canvas."
      ]
    }
  ];

  return (
    <div className="space-y-8 p-4 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-brand-blue-dark flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-brand-orange" />
          Roteiro de Evolução: Construtor Dev
        </h2>
        <p className="text-muted-foreground font-medium">
          Plano de ação para tornar o editor visual identico às funcionalidades do Elementor Pro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-brand-blue-dark">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground font-medium leading-tight">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-brand-blue-dark text-white border-none shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-xs font-black text-brand-orange">
            Nota para Desenvolvedores
          </CardTitle>
          <CardDescription className="text-white/60 font-medium">
            Este plano serve como diretriz técnica para as próximas sprints de desenvolvimento do editor visual.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 flex gap-4">
          <div className="flex-1 p-4 bg-white/10 rounded-xl border border-white/10 text-xs font-mono">
            {`// Prioridade 1: Drag & Drop (dnd-kit)\n// Prioridade 2: Column Resizing\n// Prioridade 3: Global Typography Settings`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper icons missing from lucide-react if any
function Palette(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.76-.12 2.58-.35 1.02-.28 1.42-1.4 1.03-2.34-.36-.88-.04-1.92.79-2.43.83-.51 1.91-.42 2.65.23.63.55 1.54.49 2.1-.14.65-.74 1.06-1.74 1.06-2.83 0-5.5-4.5-10-10-10z" />
    </svg>
  );
}
