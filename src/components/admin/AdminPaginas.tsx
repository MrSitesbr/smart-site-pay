import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, Save, X, Plus, GripVertical, ChevronUp, ChevronDown, 
  Trash2, Eye, Layout, Type, Image as ImageIcon, Globe, Search, 
  Map as MapIcon, ChevronRight, Settings2, Palette, Maximize2
} from "lucide-react";
import { getPageContent, updateSectionContent } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageBuilder } from "./PageBuilder";
import { SectionData } from "@/types/page-builder";

export default function AdminPaginas({ mode = 'pages' }: { mode?: 'pages' | 'fixos' }) {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const loadPage = async (route: string) => {
    setLoading(true);
    const data = await getPageContent(route);
    if (data) {
      setSelectedPage(data);
      setIsBuilding(true);
    } else {
      toast.error("Erro ao carregar dados da página.");
    }
    setLoading(false);
  };

  const handleSavePage = async (layout: SectionData[]) => {
    if (!selectedPage) return;
    
    try {
      // Find the "dynamic" section or create one if it doesn't exist
      // For the new architecture, we'll store the entire page layout in a single section or distribute it
      // For now, let's assume we update the first section with the new JSON content
      const dynamicSection = selectedPage.site_sections?.find((s: any) => s.section_key === 'dynamic-layout') || selectedPage.site_sections?.[0];
      
      if (dynamicSection) {
        await updateSectionContent(dynamicSection.id, { layout }, dynamicSection.settings || {});
      } else {
        // Create a new section if none exists
        const { data: newSection, error } = await supabase
          .from('site_sections')
          .insert({
            page_id: selectedPage.id,
            section_key: 'dynamic-layout',
            content: { layout },
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
    // Determine the initial layout
    const dynamicSection = selectedPage.site_sections?.find((s: any) => s.section_key === 'dynamic-layout') || selectedPage.site_sections?.[0];
    const initialLayout = dynamicSection?.content?.layout || [];

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
          className="absolute top-3 left-4 z-[60] text-white hover:bg-white/10"
          onClick={() => setIsBuilding(false)}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }


  const updateSectionField = (key: string, value: any, type: 'content' | 'settings' = 'content') => {
    setEditingSection({
      ...editingSection,
      [type]: {
        ...editingSection[type],
        [key]: value
      }
    });
  };

  if (editingSection) {
    return (
      <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 py-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
              <X className="w-5 h-5 mr-2" /> Fechar
            </Button>
            <div>
              <h2 className="text-xl font-black text-brand-blue-dark leading-none">Editor de Seção</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Seção: {editingSection.section_key}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg font-bold">
              <Save className="w-4 h-4 mr-2" /> PUBLICAR ALTERAÇÕES
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-8 h-[calc(100vh-180px)]">
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1">
                <TabsTrigger value="content" className="text-xs font-bold gap-2"><Type className="w-3 h-3" /> Conteúdo</TabsTrigger>
                <TabsTrigger value="style" className="text-xs font-bold gap-2"><Palette className="w-3 h-3" /> Estilo</TabsTrigger>
                <TabsTrigger value="layout" className="text-xs font-bold gap-2"><Maximize2 className="w-3 h-3" /> Layout</TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <Card className="p-6 border-none shadow-sm bg-white">
                  <div className="space-y-6">
                    {Object.keys(editingSection.content).map((key) => (
                      <div key={key} className="space-y-2 group">
                        <Label className="capitalize text-[11px] font-black text-muted-foreground group-hover:text-brand-orange transition-colors flex items-center gap-2">
                          {key.replace(/_/g, ' ')}
                          {key.includes('img') && <ImageIcon className="w-3 h-3" />}
                        </Label>
                        {key.includes('text') || key.includes('description') || key.includes('subtitle') || key.includes('title') ? (
                          <Textarea 
                            className="min-h-[120px] border-muted bg-brand-gray/30 focus-visible:ring-brand-orange text-sm leading-relaxed"
                            value={editingSection.content[key]} 
                            onChange={(e) => updateSectionField(key, e.target.value)} 
                          />
                        ) : (
                          <Input 
                            className="h-11 border-muted bg-brand-gray/30 focus-visible:ring-brand-orange text-sm"
                            value={editingSection.content[key]} 
                            onChange={(e) => updateSectionField(key, e.target.value)} 
                          />
                        )}
                      </div>
                    ))}
                    
                    {editingSection.section_key === 'hero' && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="text-[11px] font-black text-muted-foreground">Tipo de Formulário</Label>
                        <Select 
                          value={editingSection.content.form_type || 'reserva'} 
                          onValueChange={(v) => updateSectionField('form_type', v)}
                        >
                          <SelectTrigger className="bg-brand-gray/30 border-muted">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reserva">Formulário de Reserva</SelectItem>
                            <SelectItem value="contato">Formulário de Contato</SelectItem>
                            <SelectItem value="none">Sem Formulário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="style">
                <Card className="p-6 border-none shadow-sm bg-white space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Cores</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold">Cor de Fundo</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-10 h-10 p-1 rounded-lg border-none bg-transparent"
                            value={editingSection.settings?.backgroundColor || "#ffffff"}
                            onChange={(e) => updateSectionField('backgroundColor', e.target.value, 'settings')}
                          />
                          <Input 
                            className="h-10 text-xs font-mono"
                            value={editingSection.settings?.backgroundColor || "#ffffff"}
                            onChange={(e) => updateSectionField('backgroundColor', e.target.value, 'settings')}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold">Cor do Texto</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-10 h-10 p-1 rounded-lg border-none bg-transparent"
                            value={editingSection.settings?.textColor || "#1a1a1a"}
                            onChange={(e) => updateSectionField('textColor', e.target.value, 'settings')}
                          />
                          <Input 
                            className="h-10 text-xs font-mono"
                            value={editingSection.settings?.textColor || "#1a1a1a"}
                            onChange={(e) => updateSectionField('textColor', e.target.value, 'settings')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Imagem de Fundo</Label>
                    <Input 
                      placeholder="URL da Imagem de Fundo"
                      className="bg-brand-gray/30 border-muted text-xs"
                      value={editingSection.settings?.backgroundImage || ""}
                      onChange={(e) => updateSectionField('backgroundImage', e.target.value, 'settings')}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Label className="text-[10px] font-bold">Opacidade do Overlay</Label>
                      <Input 
                        type="range" min="0" max="1" step="0.1"
                        className="h-4 accent-brand-orange"
                        value={editingSection.settings?.overlayOpacity || 0}
                        onChange={(e) => updateSectionField('overlayOpacity', parseFloat(e.target.value), 'settings')}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="layout">
                <Card className="p-6 border-none shadow-sm bg-white space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Estrutura</Label>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Largura da Seção</Label>
                      <Select 
                        value={editingSection.settings?.widthMode || 'boxed'} 
                        onValueChange={(v) => updateSectionField('widthMode', v, 'settings')}
                      >
                        <SelectTrigger className="bg-brand-gray/30 border-muted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boxed">Boxed (Contido)</SelectItem>
                          <SelectItem value="full">Full Width (Largura Total)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-muted-foreground">Padding Top/Bottom</Label>
                      <Input 
                        type="number" 
                        className="bg-brand-gray/30 border-muted"
                        value={editingSection.settings?.paddingY || 96}
                        onChange={(e) => updateSectionField('paddingY', parseInt(e.target.value), 'settings')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black text-muted-foreground">Margin Bottom</Label>
                      <Input 
                        type="number" 
                        className="bg-brand-gray/30 border-muted"
                        value={editingSection.settings?.marginBottom || 0}
                        onChange={(e) => updateSectionField('marginBottom', parseInt(e.target.value), 'settings')}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-brand-gray/30 rounded-3xl border-4 border-dashed border-muted/50 overflow-hidden relative group">
            <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border">
              <Eye className="w-4 h-4 text-brand-orange" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue-dark">Preview Interativo</span>
            </div>
            
            <div className="h-full overflow-y-auto bg-white">
              {renderSection(editingSection)}
            </div>
          </div>
        </div>
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
            <Card key={section.id} className="p-6 border-none shadow-sm hover:shadow-md transition-all">

                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-brand-gray text-muted-foreground">
                      <GripVertical className="w-4 h-4 cursor-grab" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-brand-blue-dark uppercase text-xs tracking-wider">{section.section_key}</span>
                      <span className="text-xs text-muted-foreground">{section.content.title?.replace(/<[^>]*>/g, '').substring(0, 60) || "Sem título"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => reorderSections(index, 'up')} className="h-8 w-8 p-0"><ChevronUp className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => reorderSections(index, 'down')} className="h-8 w-8 p-0"><ChevronDown className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(section)} className="h-8 px-3 text-xs font-bold bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white ml-2 transition-all">EDITAR</Button>
                  </div>
                </Card>
              ) : (
                <div className="relative group/preview border-4 border-transparent hover:border-brand-orange/50 rounded-3xl overflow-hidden transition-all">
                  <div className="absolute inset-0 bg-brand-blue-dark/0 group-hover/preview:bg-brand-blue-dark/5 z-10 transition-all" />
                  <div className="absolute top-4 right-4 z-20 opacity-0 group-hover/preview:opacity-100 transition-all flex gap-2">
                    <Button size="sm" onClick={() => setEditingSection(section)} className="bg-brand-orange text-white shadow-xl font-bold">
                      <MousePointer2 className="w-4 h-4 mr-2" /> EDITAR SEÇÃO
                    </Button>
                    <div className="flex flex-col gap-1">
                       <Button size="icon" variant="secondary" onClick={() => reorderSections(index, 'up')} className="h-8 w-8 shadow-md"><ChevronUp className="w-4 h-4" /></Button>
                       <Button size="icon" variant="secondary" onClick={() => reorderSections(index, 'down')} className="h-8 w-8 shadow-md"><ChevronDown className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="pointer-events-none">
                    {renderSection(section)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <Button 
            className="w-full border-dashed border-2 py-8 bg-transparent text-muted-foreground hover:bg-brand-orange/5 hover:text-brand-orange hover:border-brand-orange transition-all rounded-3xl"
            onClick={() => toast.info("Funcionalidade de adicionar novas seções em desenvolvimento.")}
          >
            <Plus className="w-5 h-5 mr-2" /> Adicionar Nova Seção
          </Button>
        </div>
      </div>
    );
  }

  const filteredPages = pages.filter(p => mode === 'fixos' ? p.is_global : !p.is_global);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">
          {mode === 'fixos' ? 'Fixos (Cabeçalho e Rodapé)' : 'Páginas do Site'}
        </h2>
        <p className="text-muted-foreground font-medium">
          {mode === 'fixos' 
            ? 'Selecione um elemento global para editar o layout e conteúdo que aparece em todo o site.' 
            : 'Selecione uma página para editar suas seções de conteúdo no estilo Elementor.'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages.map(p => (
          <Card 
            key={p.id} 
            className={`group p-8 cursor-pointer border-none shadow-sm hover:shadow-xl transition-all relative overflow-hidden bg-white ${p.is_global ? 'border-l-4 border-l-brand-orange' : ''}`}
            onClick={() => loadPage(p.route)}
          >
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
    </div>
  );
}