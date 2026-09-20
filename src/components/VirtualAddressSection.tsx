import { useState, useEffect } from "react";
import { Building2, FileText, MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPageContent } from "@/lib/cms";

const DEFAULTS = {
  title: "Endereço Virtual",
  subtitle: "Soluções completas de endereço comercial e fiscal para impulsionar seu negócio",
  cta_text: "Entrar em Contato",
  cta_subtitle: "Fale conosco para contratar seu endereço virtual",
  commercial_address: {
    title: "Endereço Comercial",
    description: "Dê credibilidade ao seu negócio com um endereço comercial profissional em localização privilegiada.",
    features: [
      "Endereço em localização comercial de alto padrão",
      "Recepção de correspondências e encomendas",
      "Sala de reunião disponível para clientes",
      "Gestão de sua correspondência com notificação",
      "Uso de endereço para contratos e documentos"
    ]
  },
  fiscal_address: {
    title: "Endereço Fiscal",
    description: "Regularize sua empresa com um endereço fiscal válido para registro e operação.",
    features: [
      "Endereço válido para CNPJ e MEI",
      "Comprovante de endereço fiscal",
      "Recebimento de notificações oficiais",
      "Atendimento de fiscalizações",
      "Compatível com contabilidade online"
    ]
  }
};

const VirtualAddressSection = ({ content, settings }: { content?: any, settings?: any }) => {
  const [localContent, setLocalContent] = useState<any>({ ...DEFAULTS, ...(content || { }) });

  useEffect(() => {
    if (content) setLocalContent({ ...DEFAULTS, ...content });
  }, [content]);

  useEffect(() => {
    const loadContent = async () => {
      if (content) return;
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'virtual_address');
        if (section && section.content) {
          setLocalContent(prev => ({ ...prev, ...section.content }));
        }
      }
    };
    loadContent();
  }, [content]);

  const sectionSettings = settings || {};
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';

  const handleContact = () => {
    const message = encodeURIComponent(localContent.cta_subtitle || DEFAULTS.cta_subtitle);
    window.open(`https://wa.me/5513988050358?text=${message}`, '_blank');
  };

  return (
    <section 
      id="endereco-virtual" 
      className="py-24 bg-brand-gray"
      style={{
        ...bgStyle,
        paddingTop: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        paddingBottom: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        marginBottom: sectionSettings.marginBottom ? `${sectionSettings.marginBottom}px` : undefined
      }}
    >
      <div className={widthClass}>
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">SOLUÇÕES EMPRESARIAIS</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight mb-4" style={textStyle}>
            {localContent.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            {localContent.subtitle}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Comercial Card */}
          <div className="bg-card rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-lg transition-shadow border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
              <Building2 className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-heading font-black text-2xl md:text-3xl text-foreground mb-4">
              {localContent.commercial_address?.title || DEFAULTS.commercial_address.title}
            </h3>
            <p className="text-muted-foreground mb-6">
              {localContent.commercial_address?.description || DEFAULTS.commercial_address.description}
            </p>
            <ul className="space-y-3">
              {(localContent.commercial_address?.features || DEFAULTS.commercial_address.features).map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                  </div>
                  <span className="text-foreground text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Fiscal Card */}
          <div className="bg-card rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-lg transition-shadow border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
              <FileText className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-heading font-black text-2xl md:text-3xl text-foreground mb-4">
              {localContent.fiscal_address?.title || DEFAULTS.fiscal_address.title}
            </h3>
            <p className="text-muted-foreground mb-6">
              {localContent.fiscal_address?.description || DEFAULTS.fiscal_address.description}
            </p>
            <ul className="space-y-3">
              {(localContent.fiscal_address?.features || DEFAULTS.fiscal_address.features).map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                  </div>
                  <span className="text-foreground text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={handleContact}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold px-10 py-6 text-base"
          >
            <Phone className="w-5 h-5 mr-2" />
            {localContent.cta_text || DEFAULTS.cta_text}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-muted-foreground text-sm mt-4">
            {localContent.cta_subtitle || DEFAULTS.cta_subtitle}
          </p>
        </div>
      </div>
    </section>
  );
};

export default VirtualAddressSection;
