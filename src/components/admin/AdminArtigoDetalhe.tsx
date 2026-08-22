import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, Save, Loader2, Sparkles, Image as ImageIcon, 
  Table as TableIcon, Layout, Globe, Search, Type
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { MediaPickerModal } from "./MediaPickerModal";

// Configuração básica do editor
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

interface AdminArtigoDetalheProps {
  artigoId?: string;
  onBack: () => void;
  onSave: () => void;
}

export default function AdminArtigoDetalhe({ artigoId, onBack, onSave }: AdminArtigoDetalheProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(artigoId ? true : false);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  
  const [artigo, setArtigo] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    author: "Equipe 013",
    status: "Rascunho",
    image_url: "",
  });

  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (artigoId) {
      fetchArtigo();
    }
  }, [artigoId]);

  const fetchArtigo = async () => {
    try {
      const { data, error } = await supabase
        .from('site_articles')
        .select('*')
        .eq('id', artigoId)
        .single();
      
      if (error) throw error;
      if (data) setArtigo(data as any);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar artigo");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!artigo.title) {
      toast.error("O título é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const slug = artigo.slug || artigo.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const dataToSave = { ...artigo, slug };

      if (artigoId) {
        const { error } = await supabase
          .from('site_articles')
          .update(dataToSave)
          .eq('id', artigoId);
        if (error) throw error;
        toast.success("Artigo atualizado!");
      } else {
        const { error } = await supabase
          .from('site_articles')
          .insert(dataToSave);
        if (error) throw error;
        toast.success("Artigo criado!");
      }
      onSave();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateWithMistral = async () => {
    const topic = prompt("Sobre qual tema você deseja gerar um artigo de cauda longa (Começo, Meio e Fim)?");
    if (!topic) return;

    setGeneratingIA(true);
    try {
      // 1. Buscar API Key no global_settings
      const { data: settingsData } = await supabase
        .from('site_sections')
        .select('content')
        .eq('section_key', 'global_settings')
        .single();
      
      const apiKey = (settingsData?.content as any)?.mistral_api_key;
      
      if (!apiKey) {
        toast.error("Configure a chave da Mistral AI nas Configurações Gerais primeiro.");
        return;
      }

      // 2. Chamar API da Mistral
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "mistral-tiny",
          messages: [
            {
              role: "system", 
              content: "Você é um redator especialista em SEO e Coworking. Escreva um artigo completo de cauda longa com Introdução, Desenvolvimento (com sub-títulos) e Conclusão. Use formatação HTML básica (h2, p, strong, ul, li)."
            },
            {
              role: "user",
              content: `Escreva um artigo completo sobre o tema: ${topic}`
            }
          ]
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      if (content) {
        setArtigo(prev => ({ ...prev, content: prev.content + "\n" + content }));
        toast.success("Conteúdo gerado com sucesso pela IA!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar conteúdo com IA. Verifique sua chave de API.");
    } finally {
      setGeneratingIA(false);
    }
  };

  const handleInsertImage = (url: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'image', url);
    }
  };

  if (fetching) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-[#f8f9fa] flex flex-col">
      {/* Header */}
      <header className="h-16 bg-brand-blue-dark text-white flex items-center justify-between px-6 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
            <ChevronLeft className="w-5 h-5 mr-1" /> Sair do Editor
          </Button>
          <div className="h-6 w-px bg-white/20 mx-2" />
          <h2 className="font-heading font-bold text-lg truncate max-w-[300px]">
            {artigo.title || "Novo Artigo"}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateWithMistral}
            disabled={generatingIA}
            className="bg-transparent border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white font-bold"
          >
            {generatingIA ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            GERAR COM MISTRAL AI
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            PUBLICAR ARTIGO
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Editor Area */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="p-6 border-none shadow-sm space-y-4">
              <div className="space-y-2">
                <Label className="text-brand-blue-dark font-bold text-lg">Título do Artigo</Label>
                <Input 
                  value={artigo.title}
                  onChange={e => setArtigo({...artigo, title: e.target.value})}
                  placeholder="Ex: 10 Vantagens do Coworking em 2026"
                  className="text-xl font-bold border-brand-blue-dark/10 h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-brand-blue-dark font-bold">Conteúdo do Artigo</Label>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="text-xs h-7 text-brand-orange hover:bg-brand-orange/5"
                    onClick={() => setMediaPickerOpen(true)}
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Inserir Mídia
                  </Button>
                </div>
                <div className="bg-white min-h-[500px] border rounded-md overflow-hidden flex flex-col">
                  <ReactQuill 
                    ref={quillRef}
                    theme="snow" 
                    value={artigo.content} 
                    onChange={val => setArtigo({...artigo, content: val})}
                    modules={modules}
                    className="flex-1 h-full"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <Card className="p-6 border-none shadow-sm space-y-4">
              <h3 className="font-bold text-brand-blue-dark border-b pb-2">Status & Publicação</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select 
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
                    value={artigo.status}
                    onChange={e => setArtigo({...artigo, status: e.target.value})}
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Publicado">Publicado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Autor</Label>
                  <Input 
                    value={artigo.author}
                    onChange={e => setArtigo({...artigo, author: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input 
                    value={artigo.slug}
                    onChange={e => setArtigo({...artigo, slug: e.target.value})}
                    placeholder="url-do-artigo"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm space-y-4">
              <h3 className="font-bold text-brand-blue-dark border-b pb-2">Imagem de Destaque</h3>
              <div 
                className="aspect-video bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative"
                onClick={() => setMediaPickerOpen(true)}
              >
                {artigo.image_url ? (
                  <>
                    <img src={artigo.image_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs font-bold">Alterar Imagem</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Selecionar Imagem</span>
                  </>
                )}
              </div>
              <Input 
                value={artigo.image_url}
                onChange={e => setArtigo({...artigo, image_url: e.target.value})}
                placeholder="Link da imagem..."
                className="text-xs"
              />
            </Card>

            <Card className="p-6 border-none shadow-sm space-y-4">
              <h3 className="font-bold text-brand-blue-dark border-b pb-2">SEO & Resumo</h3>
              <div className="space-y-2">
                <Label>Resumo (Excerpt)</Label>
                <Textarea 
                  value={artigo.excerpt}
                  onChange={e => setArtigo({...artigo, excerpt: e.target.value})}
                  className="text-xs h-24"
                  placeholder="Breve descrição para redes sociais e buscas..."
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <MediaPickerModal 
        open={mediaPickerOpen} 
        onOpenChange={setMediaPickerOpen}
        onSelect={(media) => {
          // Se estamos com o editor em foco, inserimos no conteúdo, senão na imagem de destaque
          handleInsertImage(media.url);
          if (!artigo.image_url) {
            setArtigo(prev => ({ ...prev, image_url: media.url }));
          }
        }}
      />
    </div>
  );
}
