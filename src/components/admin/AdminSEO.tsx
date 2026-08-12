
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Code, Map as MapIcon, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSEO() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    meta_description: "",
    keywords: "",
    header_scripts: "",
    footer_scripts: "",
    sitemap_url: `${window.location.origin}/sitemap.xml`
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setFetching(true);
    try {
      // Usamos a coluna 'content' de uma seção global para persistir dados, já que 'settings' na site_pages não existe no schema atual
      const { data, error } = await supabase
        .from('site_sections')
        .select('content')
        .eq('section_key', 'seo_global')
        .single();
      
      if (data?.content) {
        setSettings(prev => ({ ...prev, ...data.content }));
      }
    } catch (error) {
      console.error("Erro ao carregar SEO:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Verifica se a seção existe
      const { data: existing } = await supabase
        .from('site_sections')
        .select('id')
        .eq('section_key', 'seo_global')
        .single();

      if (existing) {
        await supabase
          .from('site_sections')
          .update({ content: settings })
          .eq('id', existing.id);
      } else {
        // Busca a página global Header para vincular a seção se ela não existir
        const { data: page } = await supabase
          .from('site_pages')
          .select('id')
          .eq('is_global', true)
          .limit(1)
          .single();

        if (page) {
          await supabase
            .from('site_sections')
            .insert({
              page_id: page.id,
              section_key: 'seo_global',
              content: settings,
              order_index: 999
            });
        }
      }
      
      toast.success("Configurações de SEO e Scripts atualizadas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">SEO & Scripts</h2>
        <p className="text-muted-foreground">
          Gerencie as tags de busca, scripts de rastreamento e mapa do site de forma global.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-8 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-brand-orange">
            <Search className="w-5 h-5" />
            <h3 className="text-xl font-bold">SEO & Meta Tags</h3>
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Meta Descrição Padrão</Label>
              <Textarea 
                placeholder="Descreva seu site para os buscadores..." 
                value={settings.meta_description}
                onChange={e => setSettings({...settings, meta_description: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Palavras-chave</Label>
              <Input 
                placeholder="coworking, praia grande, escritorio virtual" 
                value={settings.keywords}
                onChange={e => setSettings({...settings, keywords: e.target.value})}
              />
            </div>
          </div>
        </Card>

        <Card className="p-8 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-brand-orange">
            <Code className="w-5 h-5" />
            <h3 className="text-xl font-bold">Scripts Customizados</h3>
          </div>
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label>Header Scripts (Google Ads, Analytics, Facebook Pixel)</Label>
              <Textarea 
                className="font-mono text-xs" 
                rows={6} 
                placeholder="<script>...</script>" 
                value={settings.header_scripts}
                onChange={e => setSettings({...settings, header_scripts: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Footer Scripts</Label>
              <Textarea 
                className="font-mono text-xs" 
                rows={6} 
                placeholder="<script>...</script>" 
                value={settings.footer_scripts}
                onChange={e => setSettings({...settings, footer_scripts: e.target.value})}
              />
            </div>
          </div>
        </Card>

        <Card className="p-8 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-brand-orange">
            <MapIcon className="w-5 h-5" />
            <h3 className="text-xl font-bold">Site Map</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">O mapa do site é gerado automaticamente para os buscadores.</p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs">
            {settings.sitemap_url}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg px-8 py-6 text-lg font-black uppercase tracking-widest"
          >
            {loading ? "Salvando..." : <><Save className="w-5 h-5 mr-2" /> Salvar Tudo</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
