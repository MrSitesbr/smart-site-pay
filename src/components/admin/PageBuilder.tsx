import React, { useState, useEffect, useCallback, memo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Plus, Save, Layout, Eye, Smartphone, Monitor, 
  ChevronLeft, Undo, Redo, Search, Trash2, Download, Upload, FileCode,
  Layers, Settings2, MousePointer2
} from "lucide-react";
import { PageRenderer } from "@/components/PageRenderer";
import { Inspector } from "./Inspector";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { SectionData, WidgetData, WidgetType } from "@/types/page-builder";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Sortable Wrapper for Sections
const SortableSection = ({ section, isAdmin, onElementClick, activeId }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/section-wrap">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 p-2 bg-brand-orange text-white rounded-l-md opacity-0 group-hover/section-wrap:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-20"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <PageRenderer 
        layout={[section]} 
        isAdmin={isAdmin} 
        onElementClick={onElementClick}
      />
    </div>
  );
};

import { GripVertical, Columns as ColumnsIcon } from "lucide-react";

// Navigator Component for Elementor-like tree view
const Navigator = ({ layout, selectedId, onSelect, onLayoutChange }: any) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex((s: any) => s.id === active.id);
      const newIndex = layout.findIndex((s: any) => s.id === over.id);
      const newLayout = arrayMove(layout, oldIndex, newIndex);
      onLayoutChange(newLayout);
    }
  };

  return (
    <div className="w-64 bg-slate-800 text-white h-full flex flex-col border-l border-white/5 shadow-2xl">
      <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-white/5 h-14">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-orange" />
          <span className="text-[10px] font-black uppercase tracking-widest">Navegador</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
            {layout.map((section: any) => (
              <SortableNavItem 
                key={section.id} 
                section={section} 
                selectedId={selectedId} 
                onSelect={onSelect} 
              />
            ))}
          </SortableContext>
        </DndContext>
        {layout.length === 0 && <div className="text-[8px] text-white/20 text-center py-4 italic">Nenhum elemento</div>}
      </div>
    </div>
  );
};

const SortableNavItem = ({ section, selectedId, onSelect }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div 
        onClick={() => onSelect('section', section.id, section)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold cursor-pointer transition-colors group ${selectedId === section.id ? 'bg-brand-orange text-white' : 'hover:bg-white/5 text-white/60'}`}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-20 group-hover:opacity-100">
          <GripVertical className="w-3 h-3" />
        </div>
        <Layout className="w-3 h-3" /> SEÇÃO
      </div>
      <div className="ml-3 border-l border-white/10 pl-2 space-y-1">
        {(section.columns || []).map((col: any) => (
          <div key={col.id} className="space-y-1">
            <div 
              onClick={() => onSelect('column', col.id, col)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors ${selectedId === col.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-white/50'}`}
            >
              <ColumnsIcon className="w-3 h-3" /> COLUNA
            </div>
            <div className="ml-3 border-l border-white/10 pl-2 space-y-1">
              {(col.widgets || []).map((wid: any) => (
                <div 
                  key={wid.id}
                  onClick={() => onSelect('widget', wid.id, wid)}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-[8px] font-medium cursor-pointer transition-colors ${selectedId === wid.id ? 'bg-green-600 text-white' : 'hover:bg-white/5 text-white/40'}`}
                >
                  <MousePointer2 className="w-2.5 h-2.5" /> {wid.type.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageBuilder: React.FC<PageBuilderProps> = ({ pageId, initialLayout = [], onSave }) => {
  const [layout, setLayout] = useState<SectionData[]>(initialLayout);
  const [selectedElement, setSelectedElement] = useState<{type: 'section' | 'column' | 'widget', id: string, data: any} | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [showNavigator, setShowNavigator] = useState(false);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<SectionData[][]>([initialLayout]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const pushToHistory = useCallback((newLayout: SectionData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newLayout)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevLayout = history[historyIndex - 1];
      setLayout(prevLayout);
      setHistoryIndex(historyIndex - 1);
      toast.info("Desfeito");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextLayout = history[historyIndex + 1];
      setLayout(nextLayout);
      setHistoryIndex(historyIndex + 1);
      toast.info("Refeito");
    }
  };

  const handleElementClick = (type: 'section' | 'column' | 'widget', id: string, data: any) => {
    setSelectedElement({ type, id, data });
  };

  const updateElement = (newData: any) => {
    const newLayout = layout.map(section => {
      if (selectedElement?.type === 'section' && section.id === selectedElement.id) {
        return newData;
      }
      
      return {
        ...section,
        columns: (section.columns || []).map(column => {
          if (selectedElement?.type === 'column' && column.id === selectedElement.id) {
            return newData;
          }
          
          return {
            ...column,
            widgets: (column.widgets || []).map(widget => {
              if (selectedElement?.type === 'widget' && widget.id === selectedElement.id) {
                return newData;
              }
              // Handle inner section nesting if present
              if (widget.type === 'inner_section' && widget.content?.columns) {
                 return {
                   ...widget,
                   content: {
                     ...widget.content,
                     columns: widget.content.columns.map((c: any) => {
                        if (selectedElement?.type === 'column' && c.id === selectedElement.id) return newData;
                        return {
                          ...c,
                          widgets: (c.widgets || []).map((w: any) => {
                            if (selectedElement?.type === 'widget' && w.id === selectedElement.id) return newData;
                            return w;
                          })
                        };
                     })
                   }
                 };
              }
              return widget;
            })
          };
        })
      };
    });
    
    setLayout(newLayout);
    setSelectedElement({ ...selectedElement!, data: newData });
    pushToHistory(newLayout);
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    
    let newLayout = JSON.parse(JSON.stringify(layout));
    
    if (selectedElement.type === 'section') {
      newLayout = newLayout.filter((s: any) => s.id !== selectedElement.id);
    } else {
      newLayout = newLayout.map((section: any) => ({
        ...section,
        columns: section.columns.map((column: any) => ({
          ...column,
          widgets: column.widgets.filter((w: any) => w.id !== selectedElement.id)
        }))
      }));
    }
    
    setLayout(newLayout);
    setSelectedElement(null);
    pushToHistory(newLayout);
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
    
    const newLayout = [...layout, newSection];
    setLayout(newLayout);
    pushToHistory(newLayout);
    toast.success("Nova seção adicionada.");
  };

  const addWidget = (columnId: string, type: WidgetType) => {
    const registry = WIDGET_REGISTRY[type];
    const newWidget: WidgetData = {
      id: `wid_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: JSON.parse(JSON.stringify(registry.defaultContent)),
      styles: JSON.parse(JSON.stringify(registry.defaultStyles))
    };

    const newLayout = layout.map(section => ({
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

    setLayout(newLayout);
    pushToHistory(newLayout);
    toast.success(`Widget ${registry.label} adicionado.`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex(s => s.id === active.id);
      const newIndex = layout.findIndex(s => s.id === over.id);
      
      const newLayout = arrayMove(layout, oldIndex, newIndex);
      setLayout(newLayout);
      pushToHistory(newLayout);
      toast.info("Seção reordenada.");
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

  const handleImportJSON = async (jsonText: string) => {
    try {
      let newLayout = JSON.parse(jsonText);
      
      // Support for Elementor/Standard wrapped formats
      if (newLayout.sections && Array.isArray(newLayout.sections)) {
        newLayout = newLayout.sections;
      }

      if (Array.isArray(newLayout)) {
        toast.info("Processando importação e baixando mídias...");
        
        // Deep clone to avoid mutations
        const clonedLayout = JSON.parse(JSON.stringify(newLayout));
        
        // Scan for all unique image URLs first
        const foundUrls = new Set<string>();
        const scanImages = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            const val = obj[key];
            if (typeof val === 'string' && 
                (val.startsWith('http://') || val.startsWith('https://')) && 
                (val.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)/i) || val.includes('wp-content/uploads') || val.includes('coworking013.com.br')) &&
                !val.startsWith('data:') && !val.includes('localhost')) {
              foundUrls.add(val);
            } else if (typeof val === 'object') {
              scanImages(val);
            }
          }
        };
        scanImages(clonedLayout);

        const urlMap = new Map<string, string>();
        const totalImages = foundUrls.size;
        let processedImages = 0;

        if (totalImages > 0) {
          toast.info(`Localizadas ${totalImages} imagens. Iniciando download...`);
          
          for (const url of foundUrls) {
            try {
              console.log(`[Import] Baixando ${processedImages + 1}/${totalImages}: ${url}`);
              const response = await fetch(url, { method: 'GET', credentials: 'omit' });
              if (!response.ok) throw new Error(`HTTP ${response.status} ao buscar ${url}`);
              
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Erro ao ler blob"));
                reader.readAsDataURL(blob);
              });
              
              if (base64.startsWith('data:image/')) {
                urlMap.set(url, base64);
                
                // SYNC TO MEDIA LIBRARY
                const filename = url.split('/').pop()?.split('?')[0] || `imported-${Date.now()}.jpg`;
                const { data: existing } = await supabase
                  .from('media_library')
                  .select('id')
                  .eq('filename', filename)
                  .limit(1);
  
                if (!existing || existing.length === 0) {
                  await supabase.from('media_library').insert({
                    filename,
                    file_type: 'image',
                    mime_type: blob.type || 'image/jpeg',
                    url: base64,
                    size_bytes: blob.size
                  });
                }
              }
              // Progress delay to avoid browser lock and show status
              await new Promise(r => setTimeout(r, 200));
            } catch (e) {
              console.error(`Falha ao baixar imagem: ${url}`, e);
            }
            processedImages++;
          }
        }

        // Replace URLs in the layout
        const replaceUrls = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            if (typeof obj[key] === 'string' && urlMap.has(obj[key])) {
              obj[key] = urlMap.get(obj[key]);
            } else if (typeof obj[key] === 'object') {
              replaceUrls(obj[key]);
            }
          }
        };
        replaceUrls(clonedLayout);

        // Ensure every section has a default background if missing
        const sanitizedLayout = clonedLayout.map((section: any) => ({
          ...section,
          settings: {
            backgroundColor: '#ffffff',
            backgroundType: (section.settings?.backgroundImage || section.settings?.backgroundColor) ? 'classic' : 'color',
            ...(section.settings || {})
          }
        }));

        // Final UI Refresh ("Choque" na página)
        setLayout([]); 
        setTimeout(() => {
          setLayout(sanitizedLayout);
          pushToHistory(sanitizedLayout);
          setIsImportModalOpen(false);
          setImportJsonText('');
          toast.success("Importação concluída com sucesso!");
        }, 100);
      } else {
        toast.error("Formato JSON inválido. Deve ser um array de seções ou conter a chave 'sections'.");
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error("Erro ao processar JSON.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleImportJSON(text);
    };
    reader.readAsText(file);
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
      {/* Sidebar - Widget Panel */}
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
                .filter(([type]) => !['units_grid', 'plans_grid', 'rooms_grid', 'global_header', 'global_footer', 'inner_section', 'icon_box'].includes(type))
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
            <h3 className="text-[9px] font-black uppercase text-brand-orange tracking-widest mb-3 px-1">Componentes Especializados</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(WIDGET_REGISTRY) as [WidgetType, any][])
                .filter(([type]) => ['units_grid', 'plans_grid', 'rooms_grid', 'popup', 'inner_section', 'icon_box'].includes(type))
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

      {/* Main Canvas Area */}
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
              <Button 
                variant={showNavigator ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowNavigator(!showNavigator)}
                title="Alternar Navegador"
              >
                <Layers className="w-4 h-4" />
              </Button>
              <div className="h-4 w-[1px] bg-muted mx-1 self-center" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                title="Limpar Página"
                onClick={() => {
                  if (confirm("Deseja realmente limpar toda a página? Esta ação não pode ser desfeita.")) {
                    setLayout([]);
                    setSelectedElement(null);
                    pushToHistory([]);
                    toast.success("Página limpa.");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="font-bold text-[10px] h-8 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white"
              onClick={async () => {
                const scanAndSync = async (obj: any) => {
                  const urls = new Set<string>();
                  const find = (o: any) => {
                    if (!o || typeof o !== 'object') return;
                    for (const k in o) {
                      const v = o[k];
                      if (typeof v === 'string' && 
                          (v.startsWith('http') || v.includes('wp-content') || v.includes('coworking013.com.br') || v.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)/i)) && 
                          !v.startsWith('data:') && !v.includes('localhost')) {
                        urls.add(v);
                      } else if (typeof v === 'object') find(v);
                    }
                  };
                  find(obj);
                  
                  if (urls.size === 0) {
                    toast.info("Nenhuma imagem externa encontrada para sincronizar.");
                    return obj;
                  }

                  toast.info(`Sincronizando ${urls.size} imagens...`);
                  const map = new Map<string, string>();
                  
                  // Process sequences to avoid UI freezing and show actual progress
                  let count = 0;
                  for (const url of urls) {
                    try {
                      count++;
                      console.log(`[Sync] Processando ${count}/${urls.size}: ${url}`);
                      
                      const res = await fetch(url, { method: 'GET', credentials: 'omit' });
                      if (!res.ok) throw new Error(`Status ${res.status} ao buscar ${url}`);
                      
                      const blob = await res.blob();
                      const b64 = await new Promise<string>((r, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => r(reader.result as string);
                        reader.onerror = () => reject(new Error("Erro no FileReader"));
                        reader.readAsDataURL(blob);
                      });
                      
                      if (b64.startsWith('data:image/')) {
                        map.set(url, b64);
                        const filename = url.split('/').pop()?.split('?')[0] || `sync-${Date.now()}.jpg`;
                        
                        console.log(`[Sync] Salvando na biblioteca: ${filename}`);
                        const { error: upsertError } = await supabase.from('media_library').upsert({
                          filename,
                          file_type: 'image',
                          mime_type: blob.type || 'image/jpeg',
                          url: b64,
                          size_bytes: blob.size
                        }, { onConflict: 'filename' });

                        if (upsertError) {
                          console.error(`[Sync] Erro no upsert para ${filename}:`, upsertError);
                        } else {
                          console.log(`[Sync] Sucesso ao salvar ${filename}`);
                        }
                      }
                      
                      // Add a small delay between each download to ensure the UI updates and avoid being blocked by the server
                      await new Promise(r => setTimeout(r, 300));
                    } catch (e) { 
                      console.error(`Erro ao sincronizar ${url}:`, e); 
                    }
                  }

                  const replace = (o: any) => {
                    if (!o || typeof o !== 'object') return;
                    for (const k in o) {
                      if (typeof o[k] === 'string' && map.has(o[k])) {
                        o[k] = map.get(o[k]);
                      } else if (typeof o[k] === 'object') {
                        replace(o[k]);
                      }
                    }
                  };
                  
                  const cloned = JSON.parse(JSON.stringify(obj));
                  replace(cloned);
                  return cloned;
                };

                const updatedLayout = await scanAndSync(layout);
                setLayout([]);
                setTimeout(() => {
                  setLayout(updatedLayout);
                  pushToHistory(updatedLayout);
                  toast.success("Imagens sincronizadas e movidas para a biblioteca local!");
                }, 100);
              }}
            >
              <Download className="w-3 h-3 mr-1" /> SINCRONIZAR MÍDIAS
            </Button>

            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-bold text-[10px] h-8">
                  <Upload className="w-3 h-3 mr-1" /> IMPORTAR
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-brand-orange" />
                    Importar Layout JSON
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Opção 1: Upload de Arquivo
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors border-slate-200">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-slate-400" />
                          <p className="mb-1 text-sm text-slate-500 font-medium">Clique para selecionar</p>
                          <p className="text-xs text-slate-400 uppercase tracking-tighter">JSON formatado</p>
                        </div>
                        <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground font-black tracking-widest text-[9px]">OU</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      Opção 2: Colar Código JSON
                    </label>
                    <Textarea 
                      placeholder='[{"id": "sec_...", "columns": [...]}]'
                      className="font-mono text-[11px] h-48 bg-slate-900 text-green-400 border-none focus-visible:ring-brand-orange"
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
                  <Button 
                    className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold"
                    onClick={() => handleImportJSON(importJsonText)}
                  >
                    PROCESSAR JSON
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" className="font-bold text-[10px] h-8" onClick={handleExportJSON}>
              <Download className="w-3 h-3 mr-1" /> EXPORTAR
            </Button>
            <Button variant="secondary" size="sm" className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold h-8" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SALVANDO..." : "PUBLICAR"}
            </Button>
          </div>
        </div>

        {/* Scrollable Canvas Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-brand-gray/5">
          <div className={`mx-auto transition-all duration-300 bg-white shadow-2xl min-h-full ${viewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={layout.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col">
                  {layout.map((section) => (
                    <SortableSection 
                      key={section.id} 
                      section={section} 
                      isAdmin={true} 
                      onElementClick={handleElementClick} 
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {layout.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Layout className="w-16 h-16 mb-4 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-xs">Página Vazia</p>
                <Button variant="ghost" className="mt-4 text-brand-orange" onClick={() => addSection(1)}>
                  Começar a Construir
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspector & Navigator Sidebar */}
      <div className="flex h-full">
        {selectedElement && (
          <Inspector 
            type={selectedElement.type}
            data={selectedElement.data}
            onUpdate={updateElement}
            onClose={() => setSelectedElement(null)}
            onDelete={deleteElement}
          />
        )}
        {showNavigator && (
          <Navigator 
            layout={layout} 
            selectedId={selectedElement?.id} 
            onSelect={handleElementClick} 
            onLayoutChange={(newLayout: SectionData[]) => {
              setLayout(newLayout);
              pushToHistory(newLayout);
            }}
          />
        )}
      </div>
    </div>
  );
};
