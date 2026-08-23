import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Image as ImageIcon, Phone, Mail, MapPin, Globe, Loader2 } from "lucide-react";

export default function AdminHeaderFooterSimple() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerContent, setHeaderContent] = useState<any>({
    logo_icon: "",
    logo_text_top: "CoWorking",
    logo_text_bottom: "013",
    phone: "(13) 98805-0358",
    phone_href: "tel:13988050358"
  });
  const [footerContent, setFooterContent] = useState<any>({
    logo_icon: "",
    logo_text_top: "CoWorking",
    logo_text_bottom: "013",
    description: "O seu espaço de trabalho e networking na Praia Grande.",
    phone: "(13) 98805-0358",
    email: "contato@coworking013.com.br",
    address_1: "Av. P. Costa e Silva, 609 - S. 906 - Boqueirão - Praia Grande - SP",
    address_2: "R. São Caetano, 86 - Boqueirão - Praia Grande - SP",
    address_3: "R. Jaú, 955 Conj. 26 - Boqueirão - Praia Grande - SP",
    working_hours_week: "Seg. à Sex.: 08h às 21h",
    working_hours_sat: "Sáb: 08h às 12h"
  });

  const [headerSectionId, setHeaderSectionId] = useState<string | null>(null);
  const [footerSectionId, setFooterSectionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Header
      const { data: headerData } = await supabase
        .from('site_sections')
        .select('*')
        .eq('section_key', 'dynamic-layout')
        .eq('page_id', (await supabase.from('site_pages').select('id').eq('route', 'global-header').single()).data?.id)
        .single();

      if (headerData) {
        setHeaderSectionId(headerData.id);
        if (headerData.content && typeof headerData.content === 'object' && !Array.isArray(headerData.content)) {
          setHeaderContent(prev => ({ ...prev, ...(headerData.content as object) }));
        }
      }

      // Load Footer
      const { data: footerData } = await supabase
        .from('site_sections')
        .select('*')
        .eq('section_key', 'dynamic-layout')
        .eq('page_id', (await supabase.from('site_pages').select('id').eq('route', 'global-footer').single()).data?.id)
        .single();

      if (footerData) {
        setFooterSectionId(footerData.id);
        if (footerData.content && typeof footerData.content === 'object' && !Array.isArray(footerData.content)) {
          setFooterContent(prev => ({ ...prev, ...(footerData.content as object) }));
        }
      }
    } catch (error) {
      console.error("Error loading header/footer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: 'header' | 'footer') => {
    setSaving(true);
    try {
      const content = type === 'header' ? headerContent : footerContent;
      const sectionId = type === 'header' ? headerSectionId : footerSectionId;

      if (!sectionId) {
        toast.error(`Seção de ${type} não encontrada.`);
        return;
      }

      const { error } = await supabase
        .from('site_sections')
        .update({ content })
        .eq('id', sectionId);

      if (error) throw error;
      toast.success(`${type === 'header' ? 'Cabeçalho' : 'Rodapé'} salvo com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">Gestão de Cabeçalho e Rodapé</h2>
        <p className="text-muted-foreground font-medium">Edite as informações globais que aparecem em todo o site de forma simples.</p>
      </div>

      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="header" className="font-bold">Cabeçalho</TabsTrigger>
          <TabsTrigger value="footer" className="font-bold">Rodapé</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-6">
          <Card className="p-8 border-none shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-brand-blue-dark flex items-center gap-2 uppercase tracking-tight">
                  <ImageIcon className="w-5 h-5 text-brand-orange" /> Logo e Branding
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="h-logo">URL do Ícone do Logo</Label>
                  <Input 
                    id="h-logo" 
                    value={headerContent.logo_icon || ""} 
                    onChange={e => setHeaderContent({...headerContent, logo_icon: e.target.value})} 
                    placeholder="https://..."
                  />
                  <p className="text-[10px] text-muted-foreground">Deixe em branco para usar o padrão do sistema.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-brand-blue-dark flex items-center gap-2 uppercase tracking-tight">
                  <Phone className="w-5 h-5 text-brand-orange" /> Contato Rápido
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="h-phone">Telefone (Exibição)</Label>
                  <Input 
                    id="h-phone" 
                    value={headerContent.phone} 
                    onChange={e => setHeaderContent({...headerContent, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="h-phone-href">Link do Telefone (tel:xxx)</Label>
                  <Input 
                    id="h-phone-href" 
                    value={headerContent.phone_href} 
                    onChange={e => setHeaderContent({...headerContent, phone_href: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
              <Button 
                onClick={() => handleSave('header')} 
                disabled={saving}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-8"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                SALVAR CABEÇALHO
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <Card className="p-8 border-none shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-brand-blue-dark flex items-center gap-2 uppercase tracking-tight">
                  <ImageIcon className="w-5 h-5 text-brand-orange" /> Branding Rodapé
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="f-logo">URL do Ícone do Logo</Label>
                  <Input 
                    id="f-logo" 
                    value={footerContent.logo_icon || ""} 
                    onChange={e => setFooterContent({...footerContent, logo_icon: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-desc">Breve Descrição</Label>
                  <Textarea 
                    id="f-desc" 
                    value={footerContent.description} 
                    onChange={e => setFooterContent({...footerContent, description: e.target.value})} 
                    className="h-20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-brand-blue-dark flex items-center gap-2 uppercase tracking-tight">
                  <MapPin className="w-5 h-5 text-brand-orange" /> Localização e Contato
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="f-phone">Telefone</Label>
                  <Input 
                    id="f-phone" 
                    value={footerContent.phone} 
                    onChange={e => setFooterContent({...footerContent, phone: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-email">E-mail</Label>
                  <Input 
                    id="f-email" 
                    value={footerContent.email} 
                    onChange={e => setFooterContent({...footerContent, email: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Endereços (Até 3 unidades)</Label>
                  <Input 
                    className="mb-2"
                    value={footerContent.address_1} 
                    onChange={e => setFooterContent({...footerContent, address_1: e.target.value})} 
                    placeholder="Unidade 1"
                  />
                  <Input 
                    className="mb-2"
                    value={footerContent.address_2} 
                    onChange={e => setFooterContent({...footerContent, address_2: e.target.value})} 
                    placeholder="Unidade 2"
                  />
                  <Input 
                    value={footerContent.address_3} 
                    onChange={e => setFooterContent({...footerContent, address_3: e.target.value})} 
                    placeholder="Unidade 3"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-brand-blue-dark flex items-center gap-2 uppercase tracking-tight">
                  <Globe className="w-5 h-5 text-brand-orange" /> Horário de Funcionamento
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="f-hours-week">Segunda à Sexta</Label>
                  <Input 
                    id="f-hours-week" 
                    value={footerContent.working_hours_week} 
                    onChange={e => setFooterContent({...footerContent, working_hours_week: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="f-hours-sat">Sábado</Label>
                  <Input 
                    id="f-hours-sat" 
                    value={footerContent.working_hours_sat} 
                    onChange={e => setFooterContent({...footerContent, working_hours_sat: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
              <Button 
                onClick={() => handleSave('footer')} 
                disabled={saving}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-8"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                SALVAR RODAPÉ
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}