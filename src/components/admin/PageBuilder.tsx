import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  Active,
  Over,
  useDraggable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { 
  Plus, Save, Layout, Eye, Smartphone, Monitor, 
  ChevronLeft, Undo, Redo, Search, Trash2, Download, Upload, FileCode,
  Layers, Settings2, MousePointer2, GripVertical, Columns as ColumnsIcon
} from "lucide-react";
import { PageRenderer } from "@/components/PageRenderer";
import { Inspector } from "./Inspector";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { SectionData, WidgetData, WidgetType } from "@/types/page-builder";
import { toast } from "sonner";
import { PageSettingsModal } from "./PageSettingsModal";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Drop Indicator Component
const DropIndicator = () => (
  <div className="relative h-1 w-full z-[100] group/indicator animate-in fade-in zoom-in duration-200">
    <div className="absolute inset-0 bg-brand-orange h-[2px] top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(255,107,0,0.5)]"></div>
    <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-brand-orange text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
      SOLTAR AQUI
    </div>
  </div>
);

// Draggable Palette Widget Component
const DraggablePaletteWidget = ({ type, config, isSpecial, onAdd }: any) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette_${type}`,
    data: {
      type: 'palette_widget',
      widgetType: type,
      config: config
    }
  });

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing group duration-200 select-none touch-none ${
        isSpecial 
          ? 'bg-brand-blue-dark text-white border-transparent hover:border-brand-orange hover:shadow-lg h-24 shadow-sm' 
          : 'bg-white border-brand-gray/20 hover:border-brand-orange hover:shadow-md h-20'
      } ${isDragging ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 hover:scale-[1.02]'}`}
    >
      <config.icon className={`w-5 h-5 mb-1.5 pointer-events-none transition-colors group-hover:scale-110 ${
        isSpecial ? 'text-brand-orange' : 'text-brand-blue-dark group-hover:text-brand-orange'
      }`} />
      <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none pointer-events-none select-none ${
        isSpecial ? 'text-white/90' : 'text-muted-foreground'
      }`}>
        {config.label}
      </span>
    </div>
  );
};

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
    isDragging,
    isOver
  } = useSortable({ 
    id: section.id,
    data: {
      type: 'section',
      section
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group/section-wrap transition-all duration-200 ${isOver && !isDragging ? 'ring-2 ring-brand-orange ring-inset bg-brand-orange/5' : ''}`}
    >
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
        activeDragId={activeId}
        dropIndicator={null}
      />
    </div>
  );
};



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

  const [activeDrag, setActiveDrag] = useState<{ id: string; type: string; data: any } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ position: 'before' | 'after' | 'inside'; targetId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type || 'widget';
    setActiveDrag({ 
      id: active.id as string, 
      type,
      data: active.data.current?.section || active.data.current?.widget || active.data.current || {}
    });
    // Add visual feedback on start
    toast.dismiss();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropIndicator(null);
      return;
    }

    // Determine position based on mouse relative to over element
    const overRect = over.rect;
    const activeRect = active.rect.current?.translated;
    
    if (activeRect && overRect) {
      const overCenter = overRect.top + overRect.height / 2;
      const cursorY = activeRect.top + activeRect.height / 2;
      
      // If over a column and it's a widget drag, we want to drop "inside"
      const overType = over.data.current?.type || (layout.find(s => s.id === over.id) ? 'section' : 'widget');
      
      if (overType === 'column') {
        setDropIndicator({
          position: 'inside',
          targetId: over.id as string
        });
        return;
      }

      const position = cursorY < overCenter ? 'before' : 'after';
      setDropIndicator({
        position,
        targetId: over.id as string
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const dragData = active.data.current;
    setActiveDrag(null);
    setDropIndicator(null);

    if (!over) return;

    // Handle dropping palette widget into canvas
    if (dragData?.type === 'palette_widget') {
      const widgetType = dragData.widgetType;
      
      // Find the target column or widget
      let targetColumnId = '';
      const overData = over.data.current;
      
      if (overData?.type === 'column') {
        targetColumnId = over.id as string;
      } else if (overData?.type === 'widget') {
        // Find which column this widget belongs to
        layout.forEach(s => s.columns.forEach(c => {
          if (c.widgets.some(w => w.id === over.id)) targetColumnId = c.id;
        }));
      }

      if (targetColumnId) {
        addWidget(targetColumnId, widgetType);
        return;
      }
    }

    if (active.id !== over.id) {
      const oldIndex = layout.findIndex(s => s.id === active.id);
      const newIndex = layout.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newLayout = arrayMove(layout, oldIndex, newIndex);
        setLayout(newLayout);
        pushToHistory(newLayout);
        toast.info("Seção reordenada.");
      }
    }
  };

  const handleExportJSON = () => {
    // Wrap layout in an object that includes potential global settings if needed,
    // though for now the user wants to ensure the structure is clear.
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      sections: layout
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
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
      let importedData = JSON.parse(jsonText);
      let newLayout: SectionData[] = [];
      
      // Support for Elementor/Standard wrapped formats or our new export structure
      if (importedData.sections && Array.isArray(importedData.sections)) {
        newLayout = importedData.sections;
      } else if (Array.isArray(importedData)) {
        newLayout = importedData;
      }

      if (newLayout.length > 0) {
        const clonedLayout = JSON.parse(JSON.stringify(newLayout));

        // Ensure every section has a default background and correct layout settings if missing
        const sanitizedLayout = clonedLayout.map((section: any) => ({
          ...section,
          settings: {
            backgroundColor: '#ffffff',
            backgroundType: (section.settings?.backgroundImage || section.settings?.backgroundColor) ? 'classic' : 'color',
            layoutType: section.settings?.layoutType || (section.settings?.fullWidth ? 'full' : 'boxed'),
            maxWidth: section.settings?.maxWidth || (section.settings?.layoutType === 'full' || section.settings?.fullWidth ? undefined : 1400),
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
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
                  <DraggablePaletteWidget 
                    key={type} 
                    type={type} 
                    config={config} 
                    onAdd={() => {
                      if (layout.length > 0) {
                        const lastSection = layout[layout.length - 1];
                        const lastCol = lastSection.columns[lastSection.columns.length - 1];
                        addWidget(lastCol.id, type);
                      } else {
                        addSection(1);
                      }
                    }} 
                  />
                ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[9px] font-black uppercase text-brand-orange tracking-widest mb-3 px-1">Componentes Especializados</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(WIDGET_REGISTRY) as [WidgetType, any][])
                .filter(([type]) => ['units_grid', 'plans_grid', 'rooms_grid', 'popup', 'inner_section', 'icon_box'].includes(type))
                .map(([type, config]) => (
                  <DraggablePaletteWidget 
                    key={type} 
                    type={type} 
                    config={config} 
                    isSpecial 
                    onAdd={() => {
                      if (layout.length > 0) {
                        const lastSection = layout[layout.length - 1];
                        const lastCol = lastSection.columns[lastSection.columns.length - 1];
                        addWidget(lastCol.id, type);
                      } else {
                        addSection(1);
                      }
                    }} 
                  />
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
              <div className="h-4 w-[1px] bg-muted mx-1 self-center" />
              <PageSettingsModal 
                layout={layout} 
                onUpdateLayout={(newLayout) => {
                  setLayout(newLayout);
                  pushToHistory(newLayout);
                }} 
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Media Sync button moved to individual image fields in Inspector */}

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
            <div>
              <SortableContext 
                items={layout.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col relative">
                  {layout.map((section, idx) => (
                    <React.Fragment key={section.id}>
                      {dropIndicator?.targetId === section.id && dropIndicator.position === 'before' && (
                        <DropIndicator />
                      )}
                      <SortableSection 
                        section={section} 
                        isAdmin={true} 
                        onElementClick={handleElementClick}
                        activeId={activeDrag?.id}
                      />
                      {dropIndicator?.targetId === section.id && dropIndicator.position === 'after' && (
                        <DropIndicator />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
              
            </div>

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

      <DragOverlay 
        zIndex={9999}
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}
      >
        {activeDrag && (
          <div 
            className="pointer-events-none transform shadow-2xl transition-transform duration-200 animate-in zoom-in-95 scale-105"
            style={{ zIndex: 9999 }}
          >
            {activeDrag.type === 'section' ? (
              <div className="bg-brand-orange text-white p-4 rounded-lg shadow-2xl border-2 border-white/20 min-w-[300px] flex items-center gap-3 backdrop-blur-sm opacity-90">
                <Layout className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-xs">Movendo Seção</span>
              </div>
            ) : activeDrag.type === 'palette_widget' ? (
              <div className="bg-white text-brand-blue-dark p-4 rounded-xl shadow-2xl border-2 border-brand-orange min-w-[150px] flex flex-col items-center gap-2 relative">
                {activeDrag.data.config?.icon && 
                  React.createElement(activeDrag.data.config.icon, { className: "w-6 h-6 text-brand-orange" })}
                <span className="font-bold uppercase tracking-tighter text-[10px]">
                  {activeDrag.data.config?.label || activeDrag.data.widgetType}
                </span>
                <div className="absolute -top-2 -right-2 bg-brand-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                  PEGAR
                </div>
              </div>
            ) : (
              <div className="bg-blue-600 text-white p-3 rounded-lg shadow-2xl border-2 border-white/20 min-w-[200px] flex items-center gap-2 opacity-90 backdrop-blur-sm">
                <MousePointer2 className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Movendo Elemento</span>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
