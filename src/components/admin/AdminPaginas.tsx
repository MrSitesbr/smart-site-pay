import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Save, X, Plus, GripVertical, ChevronUp, ChevronDown, 
  Trash2, Eye, Layout, Type, Image as ImageIcon, MousePointer2,
  Globe, Search, Code, Map as MapIcon
} from "lucide-react";
import { getPageContent, updateSectionContent } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import HeroSection from "@/components/HeroSection";
import IdealParaSection from "@/components/IdealParaSection";
import PricingSection from "@/components/PricingSection";
import InstitucionalSection from "@/components/InstitucionalSection";
import ContactSection from "@/components/ContactSection";
import TestimonialsSection from "@/components/TestimonialsSection";

export default function AdminPaginas() {
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const { data } = await supabase.from('site_pages').select('*');
    if (data) {
      setPages(data);
    }
  };

  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('preview');

  const loadPage = async (route: string) => {
    setLoading(true);
    const data = await getPageContent(route);
    if (data) {
      setSelectedPage(data);
    } else {
      toast.error("Erro ao carregar dados da página.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingSection) return;
    setLoading(true);
    try {
      await updateSectionContent(editingSection.id, editingSection.content);
      toast.success("Seção atualizada!");
      const updatedSections = selectedPage.site_sections.map((s: any) => 
        s.id === editingSection.id ? editingSection : s
      );
      setSelectedPage({ ...selectedPage, site_sections: updatedSections });
      setEditingSection(null);
    } catch (error) {
      toast.error("Erro ao salvar.");
    }
    setLoading(false);
  };

  const reorderSections = (index: number, direction: 'up' | 'down') => {
    const newSections = [...selectedPage.site_sections];
    const target = newSections[index];
    const swap = newSections[direction === 'up' ? index - 1 : index + 1];
    if (!swap) return;
    [newSections[index], newSections[direction === 'up' ? index - 1 : index + 1]] = [swap, target];
    setSelectedPage({ ...selectedPage, site_sections: newSections });
  };

  const renderSectionPreview = (section: any) => {
    switch (section.section_key) {
      case 'navbar': return (
        <div className="bg-[#002f5e] p-4 text-white rounded-lg shadow-inner">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-[8px] font-bold">ICON</div>
               <div className="flex flex-col leading-none">
                 <span className="text-[8px] text-orange-500 uppercase font-bold">{section.content.logo_text_top}</span>
                 <span className="text-lg font-black">{section.content.logo_text_bottom}</span>
               </div>
             </div>
             <div className="flex gap-4 text-[10px] font-bold opacity-70">
                {section.content.links?.map((l: any) => <span key={l.label}>{l.label}</span>)}
             </div>
             <div className="text-[10px] font-bold">{section.content.phone}</div>
          </div>
        </div>
      );
      case 'footer': return (
        <div className="bg-brand-blue-dark p-8 text-white rounded-lg">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
               <div className="flex flex-col leading-none">
                 <span className="text-[10px] text-orange-500 font-bold">{section.content.logo_text_top}</span>
                 <span className="text-2xl font-black">{section.content.logo_text_bottom}</span>
               </div>
               <p className="text-xs text-white/60">{section.content.description}</p>
            </div>
            <div className="space-y-2 text-xs text-white/60">
               <div>{section.content.phone}</div>
               <div>{section.content.email}</div>
               <div>{section.content.address_1}</div>
            </div>
          </div>
        </div>
      );
      case 'hero': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><HeroSection /></div>;
      case 'features': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><IdealParaSection /></div>;
      case 'pricing': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><PricingSection /></div>;
      case 'institucional': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><InstitucionalSection /></div>;
      case 'testimonials': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><TestimonialsSection /></div>;
      case 'contact': return <div className="pointer-events-none scale-75 origin-top mb-[-10%]"><ContactSection /></div>;
      default: return <div className="p-8 text-center bg-muted">Seção: {section.section_key}</div>;
    }
  };

  if (editingSection) {
    return (
      <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
              <X className="w-5 h-5 mr-2" /> Cancelar
            </Button>
            <h2 className="text-xl font-black text-brand-blue-dark">Editando: {editingSection.section_key}</h2>
          </div>
          <Button onClick={handleSave} className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg">
            <Save className="w-4 h-4 mr-2" /> Salvar Alterações
          </Button>
        </div>

        <div className="grid lg:grid-cols-[350px_1fr] gap-8">
          <Card className="p-6 h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar shadow-sm border-none bg-white">
            <div className="flex items-center gap-2 mb-6 text-brand-orange">
              <Layout className="w-5 h-5" />
              <h3 className="font-bold">Conteúdo da Seção</h3>
            </div>
            <div className="space-y-6">
              {Object.keys(editingSection.content).map((key) => (
                <div key={key} className="space-y-2 group">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize text-xs font-bold text-muted-foreground group-hover:text-brand-orange transition-colors">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    {key.includes('title') && <Type className="w-3 h-3 text-muted-foreground/50" />}
                    {key.includes('img') && <ImageIcon className="w-3 h-3 text-muted-foreground/50" />}
                  </div>
                  {key.includes('text') || key.includes('description') || key.includes('subtitle') || key.includes('title') ? (
                    <Textarea 
                      className="min-h-[100px] border-muted bg-brand-gray/30 focus-visible:ring-brand-orange"
                      value={editingSection.content[key]} 
                      onChange={(e) => setEditingSection({...editingSection, content: {...editingSection.content, [key]: e.target.value}})} 
                    />
                  ) : (
                    <Input 
                      className="border-muted bg-brand-gray/30 focus-visible:ring-brand-orange"
                      value={editingSection.content[key]} 
                      onChange={(e) => setEditingSection({...editingSection, content: {...editingSection.content, [key]: e.target.value}})} 
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="hidden lg:block">
             <div className="flex items-center gap-2 mb-4 text-muted-foreground">
               <Eye className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-widest">Visualização em Tempo Real</span>
             </div>
             <div className="rounded-2xl border-4 border-brand-blue-dark/10 overflow-hidden bg-white shadow-2xl h-[calc(100vh-250px)] overflow-y-auto scale-90 origin-top">
                {renderSectionPreview(editingSection)}
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
              <X className="w-5 h-5 mr-2" /> Sair do Editor
            </Button>
            <h2 className="text-2xl font-black text-brand-blue-dark">{selectedPage.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg flex gap-1 mr-4">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="h-8 text-xs font-bold"
              >
                Estrutura
              </Button>
              <Button 
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('preview')}
                className="h-8 text-xs font-bold"
              >
                Visual
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(selectedPage.route, '_blank')} className="font-bold">
              <Eye className="w-4 h-4 mr-2" /> Ver Publicado
            </Button>
          </div>
        </div>

        <div className={viewMode === 'list' ? "space-y-2 max-w-3xl mx-auto" : "space-y-12"}>
          {selectedPage.site_sections?.sort((a: any, b: any) => a.order_index - b.order_index).map((section: any, index: number) => (
            <div key={section.id} className="group relative">
              {viewMode === 'list' ? (
                <Card className="p-4 flex items-center justify-between border-none shadow-sm hover:shadow-md transition-all group-hover:translate-x-1">
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
                    {renderSectionPreview(section)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {selectedPage.site_sections?.length === 0 && (
            <Card className="p-12 text-center border-dashed border-2 bg-muted/20">
              <Layout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Esta página ainda não possui seções de conteúdo.</p>
            </Card>
          )}
          
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> Páginas
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="w-4 h-4" /> SEO & Meta
          </TabsTrigger>
          <TabsTrigger value="scripts" className="flex items-center gap-2">
            <Code className="w-4 h-4" /> Scripts (Headers/Footers)
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="flex items-center gap-2">
            <MapIcon className="w-4 h-4" /> Site Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black text-brand-blue-dark">Páginas e Cabeçalho/Rodapé</h2>
            <p className="text-muted-foreground">Selecione uma página ou elemento global para editar o layout e conteúdo.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(p => (
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
        </TabsContent>

        <TabsContent value="seo">
          <Card className="p-8">
            <h3 className="text-xl font-bold mb-4">Configurações de SEO</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Meta Descrição Padrão</Label>
                <Textarea placeholder="Descreva seu site para os buscadores..." />
              </div>
              <div className="grid gap-2">
                <Label>Palavras-chave</Label>
                <Input placeholder="coworking, praia grande, escritorio virtual" />
              </div>
              <Button className="bg-brand-orange text-white">Salvar SEO</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <Card className="p-8">
            <h3 className="text-xl font-bold mb-4">Scripts Customizados</h3>
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label>Header Scripts (Google Ads, Analytics, Facebook Pixel)</Label>
                <Textarea className="font-mono text-xs" rows={6} placeholder="<script>...</script>" />
              </div>
              <div className="grid gap-2">
                <Label>Footer Scripts</Label>
                <Textarea className="font-mono text-xs" rows={6} placeholder="<script>...</script>" />
              </div>
              <Button className="bg-brand-orange text-white">Salvar Scripts</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sitemap">
          <Card className="p-8">
            <h3 className="text-xl font-bold mb-4">Site Map</h3>
            <p className="text-sm text-muted-foreground mb-4">Gere ou visualize o sitemap.xml do seu projeto.</p>
            <div className="bg-muted p-4 rounded-lg font-mono text-xs">
              {window.location.origin}/sitemap.xml
            </div>
            <Button variant="outline" className="mt-4">Atualizar Sitemap</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChevronRight(props: any) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

