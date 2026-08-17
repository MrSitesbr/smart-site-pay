import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Plus, Save, Layout, Layers, Eye, Smartphone, Monitor, 
  ChevronLeft, History, Redo, Undo, Search, Settings,
  Grid3X3, Columns, MousePointer2, Type, Image as ImageIcon,
  Download, Upload, FileCode, Trash2
} from "lucide-react";
import { PageRenderer } from "@/components/PageRenderer";
import { Inspector } from "./Inspector";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { SectionData, ColumnData, WidgetData, WidgetType } from "@/types/page-builder";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [importJsonText, setImportJsonText] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleElementClick = (type: 'section' | 'column' | 'widget', id: string, data: any) => {
    console.log("Element clicked in Builder:", { type, id, data });
    setSelectedElement({ type, id, data });
  };

  const updateElement = (newData: any) => {
    const newLayout = layout.map(section => {
      if (selectedElement?.type === 'section' && section.id === selectedElement.id) {
        return newData;
      }
      
      return {
        ...section,
        columns: section.columns.map(column => {
          if (selectedElement?.type === 'column' && column.id === selectedElement.id) {
            return newData;
          }
          
          return {
            ...column,
            widgets: column.widgets.map(widget => {
              if (selectedElement?.type === 'widget' && widget.id === selectedElement.id) {
                return newData;
              }
              return widget;
            })
          };
        })
      };
    });
    
    setLayout(newLayout);
    setSelectedElement({ ...selectedElement!, data: newData });
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    
    console.log("Deleting element:", selectedElement);
    let newLayout = [...layout];
    
    if (selectedElement.type === 'section') {
      newLayout = newLayout.filter(s => s.id !== selectedElement.id);
    } else if (selectedElement.type === 'widget') {
      newLayout = newLayout.map(section => ({
        ...section,
        columns: section.columns.map(column => ({
          ...column,
          widgets: column.widgets.filter(w => w.id !== selectedElement.id)
        }))
      }));
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

    const updatedLayout = newLayout.map(section => ({
      ...section,
      columns: section.columns.map(column => {
        if (column.id === columnId) {
          return {
            ...column,
            widgets: [...column.widgets, newWidget]
          };
        }
        return column;
      })
    }));

    setLayout(updatedLayout);
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

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(layout, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `layout-pagina-${pageId}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Layout exportado com sucesso!");
  };

  const processImport = (content: string) => {
    try {
      let importedLayout = JSON.parse(content);
      
      if (!Array.isArray(importedLayout)) {
        if (importedLayout.layout && Array.isArray(importedLayout.layout)) {
          importedLayout = importedLayout.layout;
        } else if (importedLayout.sections && Array.isArray(importedLayout.sections)) {
          importedLayout = importedLayout.sections;
        } else if (importedLayout.id && Array.isArray(importedLayout.columns)) {
          // Single section object
          importedLayout = [importedLayout];
        } else {
          throw new Error("Formato não reconhecido");
        }
      }

      // Deep clone and regenerate IDs to avoid collisions and fix references
      const regenerateIds = (data: any[]) => {
        return data.map((sec: any) => ({
          ...sec,
          id: `sec_${Math.random().toString(36).substr(2, 9)}`,
          columns: (sec.columns || []).map((col: any) => ({
            ...col,
            id: `col_${Math.random().toString(36).substr(2, 9)}`,
            widgets: (col.widgets || []).map((wid: any) => ({
              ...wid,
              id: `wid_${Math.random().toString(36).substr(2, 9)}`
            }))
          }))
        }));
      };

      const validatedSections = regenerateIds(importedLayout);
      setLayout([...layout, ...validatedSections]);
      toast.success("Conteúdo importado com sucesso!");
      
      setIsImportModalOpen(false);
      setImportJsonText('');
    } catch (err) {
      console.error("Erro na importação:", err);
      toast.error("Erro ao processar JSON. Verifique se o formato segue a Documentação IA.");
    }
  };

  const handleImportJSONFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processImport(content);
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleImportJSONText = () => {
    if (!importJsonText.trim()) {
      toast.error("Insira o código JSON.");
      return;
    }
    processImport(importJsonText);
  };

  return (
    <div className="flex h-screen bg-[#f1f1f1] overflow-hidden font-sans">
      {/* Barra Lateral de Widgets (Estilo Dev) */}
      <div className="w-[300px] bg-white border-r flex flex-col shadow-xl z-30">
        <div className="p-4 bg-brand-blue-dark text-white flex items-center justify-between h-14">
          <div className="flex items-center gap-2 overflow-hidden">
            <Layout className="w-4 h-4 flex-shrink-0" />
            <h2 className="font-black uppercase tracking-widest text-[10px] truncate">Construtor Dev</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10 flex-shrink-0">
            <Search className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
          <div className="mb-4">
            <h3 className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-3 px-1">Básicos</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(WIDGET_REGISTRY) as [WidgetType, any][])
                .filter(([type]) => !['units_grid', 'plans_grid', 'rooms_grid', 'global_header', 'global_footer'].includes(type))
                .map(([type, config]) => (
                <div 
                  key={type}
                  className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-brand-gray/20 hover:border-brand-orange hover:shadow-md transition-all cursor-move group h-20"
                  draggable
                  onDragEnd={() => {
                    if (layout.length > 0) {
                      const lastSection = layout[layout.length - 1];
                      const lastCol = lastSection.columns[lastSection.columns.length - 1];
                      addWidget(lastCol.id, type);
                    } else {
                      addSection(1);
                    }
                  }}
                >
                  <config.icon className="w-5 h-5 mb-1.5 text-brand-blue-dark group-hover:text-brand-orange transition-colors" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground text-center leading-none">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[9px] font-black uppercase text-brand-orange tracking-widest mb-3 px-1">Componentes Dinâmicos</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(WIDGET_REGISTRY) as [WidgetType, any][])
                .filter(([type]) => ['units_grid', 'plans_grid', 'rooms_grid', 'popup', 'global_header', 'global_footer'].includes(type))
                .map(([type, config]) => (
                <div 
                  key={type}
                  className="flex flex-col items-center justify-center p-3 bg-brand-blue-dark text-white rounded-xl border border-transparent hover:border-brand-orange hover:shadow-lg transition-all cursor-move group h-24 shadow-sm"
                  draggable
                  onDragEnd={() => {
                    if (layout.length > 0) {
                      const lastSection = layout[layout.length - 1];
                      const lastCol = lastSection.columns[lastSection.columns.length - 1];
                      addWidget(lastCol.id, type);
                    } else {
                      addSection(1);
                    }
                  }}
                >
                  <config.icon className="w-6 h-6 mb-2 text-brand-orange group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-white/90 text-center leading-none">{config.label}</span>
                </div>
              ))}
            </div>
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                title="Limpar Página"
                onClick={() => {
                  if (confirm("Deseja realmente limpar toda a página? Esta ação não pode ser desfeita.")) {
                    setLayout([]);
                    setSelectedElement(null);
                    toast.success("Página limpa.");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2 mr-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="font-bold text-[10px] h-8"
                onClick={handleExportJSON}
              >
                <Download className="w-3 h-3 mr-1" /> EXPORTAR
              </Button>
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-bold text-[10px] h-8"
                  >
                    <Upload className="w-3 h-3 mr-1" /> IMPORTAR
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-brand-blue-dark">Importar Layout</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileCode className="w-4 h-4" /> Colar Código JSON
                      </h4>
                      <Textarea 
                        placeholder='{"id": "...", "columns": [...]}' 
                        className="min-h-[200px] font-mono text-xs"
                        value={importJsonText}
                        onChange={(e) => setImportJsonText(e.target.value)}
                      />
                      <Button onClick={handleImportJSONText} className="w-full bg-brand-blue-dark">
                        IMPORTAR CÓDIGO
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-bold">ou</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Carregar do Computador
                      </h4>
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-dashed h-24 flex flex-col gap-2 hover:bg-slate-50 transition-colors"
                        onClick={() => document.getElementById('import-json-input')?.click()}
                      >
                        <Upload className="w-6 h-6 text-brand-orange" />
                        <span className="font-bold text-xs">SELECIONAR ARQUIVO .JSON</span>
                      </Button>
                      <input 
                        id="import-json-input"
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportJSONFile}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
