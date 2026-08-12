import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Plus, Save, Layout, Layers, Eye, Smartphone, Monitor, 
  ChevronLeft, History, Redo, Undo, Search, Settings,
  Grid3X3, Columns, MousePointer2, Type, Image as ImageIcon
} from "lucide-react";
import { PageRenderer } from "@/components/PageRenderer";
import { Inspector } from "./Inspector";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { SectionData, ColumnData, WidgetData, WidgetType } from "@/types/page-builder";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PageBuilderProps {
  pageId: string;
  initialLayout?: SectionData[];
  onSave: (layout: SectionData[]) => Promise<void>;
}

export const PageBuilder: React.FC<PageBuilderProps> = ({ pageId, initialLayout = [], onSave }) => {
  const [layout, setLayout] = useState<SectionData[]>(initialLayout);
  const [selectedElement, setSelectedElement] = useState<{type: 'section' | 'column' | 'widget', id: string, data: any} | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  const handleElementClick = (type: 'section' | 'column' | 'widget', id: string, data: any) => {
    setSelectedElement({ type, id, data });
  };

  const updateElement = (newData: any) => {
    const newLayout = [...layout];
    
    if (selectedElement?.type === 'section') {
      const idx = newLayout.findIndex(s => s.id === selectedElement.id);
      if (idx !== -1) newLayout[idx] = newData;
    } else if (selectedElement?.type === 'column') {
      newLayout.forEach(section => {
        const idx = section.columns.findIndex(c => c.id === selectedElement.id);
        if (idx !== -1) section.columns[idx] = newData;
      });
    } else if (selectedElement?.type === 'widget') {
      newLayout.forEach(section => {
        section.columns.forEach(column => {
          const idx = column.widgets.findIndex(w => w.id === selectedElement.id);
          if (idx !== -1) column.widgets[idx] = newData;
        });
      });
    }
    
    setLayout(newLayout);
    setSelectedElement({ ...selectedElement!, data: newData });
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    
    let newLayout = [...layout];
    
    if (selectedElement.type === 'section') {
      newLayout = newLayout.filter(s => s.id !== selectedElement.id);
    } else if (selectedElement.type === 'widget') {
      newLayout.forEach(section => {
        section.columns.forEach(column => {
          column.widgets = column.widgets.filter(w => w.id !== selectedElement.id);
        });
      });
    }
    
    setLayout(newLayout);
    setSelectedElement(null);
    toast.success("Elemento removido.");
  };

  const addSection = (columnCount: number = 1) => {
    const newSection: SectionData = {
      id: `sec_${Math.random().toString(36).substr(2, 9)}`,
      columns: Array.from({ length: columnCount }).map((_, i) => ({
        id: `col_${Math.random().toString(36).substr(2, 9)}`,
        widthPercentage: 100 / columnCount,
        widgets: [],
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } }
      })),
      settings: {
        fullWidth: false,
        padding: { top: 60, bottom: 60, left: 0, right: 0 },
        backgroundColor: '#ffffff'
      }
    };
    
    setLayout([...layout, newSection]);
    toast.success("Nova seção adicionada.");
  };

  const addWidget = (columnId: string, type: WidgetType) => {
    const newLayout = [...layout];
    const registry = WIDGET_REGISTRY[type];
    
    const newWidget: WidgetData = {
      id: `wid_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: { ...registry.defaultContent },
      styles: { ...registry.defaultStyles }
    };

    newLayout.forEach(section => {
      const column = section.columns.find(c => c.id === columnId);
      if (column) {
        column.widgets.push(newWidget);
      }
    });

    setLayout(newLayout);
    toast.success(`Widget ${registry.label} adicionado.`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(layout);
      toast.success("Página publicada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar página.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f1f1f1] overflow-hidden font-sans">
      {/* Barra Lateral de Widgets (Estilo Elementor) */}
      <div className="w-[300px] bg-white border-r flex flex-col shadow-xl z-30">
        <div className="p-4 bg-brand-blue-dark text-white flex items-center justify-between">
          <h2 className="font-black uppercase tracking-widest text-[10px]">Elementos</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10">
            <Search className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(WIDGET_REGISTRY) as [WidgetType, any][]).map(([type, config]) => (
              <div 
                key={type}
                className="flex flex-col items-center justify-center p-4 bg-brand-gray/20 rounded-xl border border-transparent hover:border-brand-orange hover:bg-white transition-all cursor-move group"
                draggable
                onDragEnd={() => {
                  // Simplificação: apenas clica para adicionar se houver seção
                  if (layout.length > 0) {
                    // Adiciona na última coluna do último layout por padrão se arrastado
                    const lastSection = layout[layout.length - 1];
                    const lastCol = lastSection.columns[lastSection.columns.length - 1];
                    addWidget(lastCol.id, type);
                  } else {
                    addSection(1);
                  }
                }}
              >
                <config.icon className="w-6 h-6 mb-2 text-brand-blue-dark group-hover:text-brand-orange transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20">
          <Button 
            className="w-full bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white font-bold py-6"
            onClick={() => addSection(1)}
          >
            <Plus className="w-4 h-4 mr-2" /> NOVA SEÇÃO
          </Button>
        </div>
      </div>

      {/* Canvas Central */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Bar Editor */}
        <div className="h-14 bg-white border-b flex items-center justify-between px-6 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex bg-muted p-1 rounded-lg">
              <Button 
                variant={viewMode === 'desktop' ? 'secondary' : 'ghost'} 
                size="icon" className="h-8 w-8"
                onClick={() => setViewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'mobile' ? 'secondary' : 'ghost'} 
                size="icon" className="h-8 w-8"
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-4 w-[1px] bg-muted" />
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Undo className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Redo className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="font-bold text-xs" onClick={() => window.open(`/preview/${pageId}`, '_blank')}>
              <Eye className="w-4 h-4 mr-2" /> PRÉVIA
            </Button>
            <Button 
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold shadow-lg shadow-brand-orange/20"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "SALVANDO..." : <><Save className="w-4 h-4 mr-2" /> PUBLICAR</>}
            </Button>
          </div>
        </div>

        {/* Área do Canvas */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-12 transition-all duration-500 ${viewMode === 'mobile' ? 'max-w-[400px] mx-auto shadow-2xl border-x-8 border-t-8 border-brand-blue-dark rounded-t-3xl mt-4 bg-white' : 'bg-[#f1f1f1]'}`}>
          <div className={`${viewMode === 'desktop' ? 'bg-white shadow-2xl min-h-full rounded-xl overflow-hidden' : ''}`}>
            {layout.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 border-4 border-dashed border-muted/50 rounded-xl m-8">
                <Layout className="w-16 h-16 text-muted/30 mb-6" />
                <h3 className="text-xl font-black text-brand-blue-dark mb-2">Página Vazia</h3>
                <p className="text-muted-foreground mb-8 font-medium">Comece adicionando uma estrutura de colunas.</p>
                <div className="flex gap-4">
                  <Button onClick={() => addSection(1)} className="bg-white hover:bg-brand-gray/20 text-brand-blue-dark border-2 border-brand-blue-dark font-bold">1 Coluna</Button>
                  <Button onClick={() => addSection(2)} className="bg-white hover:bg-brand-gray/20 text-brand-blue-dark border-2 border-brand-blue-dark font-bold">2 Colunas</Button>
                  <Button onClick={() => addSection(3)} className="bg-white hover:bg-brand-gray/20 text-brand-blue-dark border-2 border-brand-blue-dark font-bold">3 Colunas</Button>
                </div>
              </div>
            ) : (
              <PageRenderer 
                layout={layout} 
                isAdmin={true} 
                onElementClick={handleElementClick} 
              />
            )}
            
            {layout.length > 0 && (
              <div className="p-12 flex justify-center border-t border-dashed mt-12 bg-muted/5">
                <Button 
                  onClick={() => addSection(1)}
                  variant="outline"
                  className="border-2 border-dashed border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white font-black py-8 px-12 rounded-2xl transition-all"
                >
                  <Plus className="w-6 h-6 mr-3" /> ADICIONAR NOVA SEÇÃO
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspetor Lateral (Aparece ao clicar num elemento) */}
      {selectedElement && (
        <Inspector 
          type={selectedElement.type}
          data={selectedElement.data}
          onUpdate={updateElement}
          onClose={() => setSelectedElement(null)}
          onDelete={deleteElement}
        />
      )}
    </div>
  );
};
