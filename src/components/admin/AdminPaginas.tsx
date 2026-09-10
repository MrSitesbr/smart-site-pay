import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Save, X, Plus, GripVertical, ChevronUp, ChevronDown, 
  Trash2, Eye, Layout, Type, Image as ImageIcon, Globe, Search, 
  Map as MapIcon, ChevronRight, Settings2, Palette, Maximize2,
  ChevronLeft, AlertTriangle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPageContent, updateSectionContent } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageBuilder } from "./PageBuilder";
import { SectionData } from "@/types/page-builder";
import { unidadesPageLayout } from "@/lib/defaultPageLayouts";

export default function AdminPaginas({ mode = 'pages' }: { mode?: 'pages' | 'fixos' }) {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<any>(null);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Erro ao carregar páginas:", error);
      toast.error("Erro ao carregar lista de páginas.");
      return;
    }
    
    if (data) {
      setPages(data);
    }
  };
  
  const handleDeletePage = async () => {
    if (!pageToDelete) return;
    
    setLoading(true);
    try {
      // Deletar seções primeiro (cascata manual se o banco não tiver)
      await supabase.from('site_sections').delete().eq('page_id', pageToDelete.id);
      
      const { error } = await supabase
        .from('site_pages')
        .delete()
        .eq('id', pageToDelete.id);
      
      if (error) throw error;
      
      toast.success("Página excluída com sucesso!");
      setDeleteConfirmOpen(false);
      setPageToDelete(null);
      loadPages();
    } catch (error: any) {
      console.error("Erro ao excluir página:", error);
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPage = async (route: string) => {
    setLoading(true);
    const data = await getPageContent(route);
    if (data) {
      setSelectedPage(data);
      setIsBuilding(true); // Abre direto no editor
    } else {
      toast.error("Erro ao carregar dados da página.");
    }
    setLoading(false);
  };

  const handleSavePage = async (layout: SectionData[]) => {
    if (!selectedPage) return;
    
    try {
      const dynamicSection = selectedPage.site_sections?.find((s: any) => s.section_key === 'dynamic-layout') || selectedPage.site_sections?.[0];
      
      if (dynamicSection) {
        await updateSectionContent(dynamicSection.id, { layout } as any, dynamicSection.settings || {});
      } else {
        const { data: newSection, error } = await supabase
          .from('site_sections')
          .insert({
            page_id: selectedPage.id,
            section_key: 'dynamic-layout',
            content: { layout } as any,
            settings: {},
            order_index: 0
          })
          .select()
          .single();
        
        if (error) throw error;
      }
      
      toast.success("Página salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações.");
      throw error;
    }
  };

  if (isBuilding && selectedPage) {
    const dynamicSection = selectedPage.site_sections?.find((s: any) => s.section_key === 'dynamic-layout') || selectedPage.site_sections?.[0];
    const initialLayout = dynamicSection?.content?.layout || (selectedPage.route === "/unidades" ? unidadesPageLayout : []);

    return (
      <div className="fixed inset-0 z-50 bg-white">
        <PageBuilder 
          pageId={selectedPage.id}
          initialLayout={initialLayout}
          onSave={handleSavePage}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 left-2 z-[60] text-white bg-brand-blue-dark/50 hover:bg-brand-blue-dark/80 backdrop-blur-sm rounded-lg px-3 py-1"
          onClick={() => {
            setIsBuilding(false);
            setSelectedPage(null); // Volta para a lista de páginas
          }}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  if (selectedPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPage(null)}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Sair
            </Button>
            <h2 className="text-2xl font-black text-brand-blue-dark">{selectedPage.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold"
              onClick={() => setIsBuilding(true)}
            >
              <Layout className="w-4 h-4 mr-2" /> ABRIR EDITOR VISUAL
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(selectedPage.route, '_blank')} className="font-bold">
              <Eye className="w-4 h-4 mr-2" /> Ver Publicado
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedPage.site_sections?.sort((a: any, b: any) => a.order_index - b.order_index).map((section: any) => (
            <Card key={section.id} className="p-6 border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 rounded-lg bg-brand-gray text-muted-foreground">
                  <Layout className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-brand-blue-dark uppercase text-xs tracking-wider">{section.section_key}</span>
                  <span className="text-xs text-muted-foreground">ID: {section.id.substring(0, 8)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    // Logic to set editing section if needed, but we prefer visual editor now
                    setIsBuilding(true);
                  }}
                  className="h-8 px-3 text-xs font-bold bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white transition-all flex-1"
                >
                  EDITAR NO BUILDER
                </Button>
              </div>
            </Card>
          ))}
          
          <Button 
            className="w-full border-dashed border-2 py-12 bg-transparent text-muted-foreground hover:bg-brand-orange/5 hover:text-brand-orange hover:border-brand-orange transition-all rounded-3xl flex flex-col gap-2"
            onClick={() => setIsBuilding(true)}
          >
            <Plus className="w-6 h-6" />
            <span className="font-bold">Nova Seção Visual</span>
          </Button>
        </div>
      </div>
    );
  }

  const filteredPages = pages.filter(p => {
    const isGlobal = p.is_global === true;
    return mode === 'fixos' ? isGlobal : !isGlobal;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-brand-blue-dark">
            {mode === 'fixos' ? 'Cabeçalho e Rodapé (Fixos)' : 'Páginas do Site'}
          </h2>
          <p className="text-muted-foreground font-medium">
            {mode === 'fixos' 
              ? 'Edite o cabeçalho e rodapé que aparecem em todas as páginas do site usando o editor visual.' 
              : 'Selecione uma página para editar suas seções de conteúdo no estilo Dev.'}
          </p>
        </div>
        {mode === 'pages' && (
          <Button 
            onClick={() => {
              const name = prompt("Nome da nova página:");
              const route = prompt("Rota da nova página (ex: /nova-pagina):");
              if (name && route) {
                supabase.from('site_pages').insert({ name, route, is_global: false }).then(({ error }) => {
                  if (error) toast.error("Erro ao criar página: " + error.message);
                  else {
                    toast.success("Página criada com sucesso!");
                    loadPages();
                  }
                });
              }
            }}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> CRIAR NOVA PÁGINA
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages.map(p => (
          <Card 
            key={p.id} 
            className={`group p-8 cursor-pointer border-none shadow-sm hover:shadow-xl transition-all relative overflow-hidden bg-white ${p.is_global ? 'border-l-4 border-l-brand-orange' : ''}`}
            onClick={() => loadPage(p.route)}
          >
            {!p.is_global && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setPageToDelete(p);
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-all" />
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-orange group-hover:text-white transition-all ${p.is_global ? 'bg-orange-100 text-brand-orange' : 'bg-orange-50'}`}>
                {p.is_global ? <Layout className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-brand-blue-dark">{p.name}</h3>
                {p.is_global && <span className="text-[10px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-bold">GLOBAL</span>}
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-6">{p.route}</p>
              <div className="flex items-center text-xs font-bold text-brand-orange uppercase tracking-widest">
                Abrir no Editor <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Página
            </DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir a página <strong>{pageToDelete?.name}</strong>? 
              Esta ação é permanente e removerá todo o conteúdo associado a esta rota.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeletePage}
              disabled={loading}
            >
              {loading ? "Excluindo..." : "Sim, Excluir Página"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
