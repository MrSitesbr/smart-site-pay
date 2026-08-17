import React, { useState, useEffect, useCallback } from 'react';
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

import { GripVertical } from "lucide-react";

export const PageBuilder: React.FC<PageBuilderProps> = ({ pageId, initialLayout = [], onSave }) => {
  const [layout, setLayout] = useState<SectionData[]>(initialLayout);
  const [selectedElement, setSelectedElement] = useState<{type: 'section' | 'column' | 'widget', id: string, data: any} | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
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
                <PageRenderer 
                  layout={layout} 
                  isAdmin={true} 
                  onElementClick={handleElementClick}
                />
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

      {/* Inspector Sidebar */}
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
