import { useState, useEffect } from "react";
import { MapPin, Building2, Navigation, Store } from "lucide-react";
import sabrina from "@/assets/sabrina-cow013.png.asset.json";
import { getPageContent } from "@/lib/cms";

const InstitucionalSection = ({ content, settings }: { content?: any, settings?: any }) => {
  const [localContent, setLocalContent] = useState(content || {
    title: 'Localização que aproxima você de mais oportunidades',
    description: 'Estamos localizados na Av. Presidente Kennedy, 5214 — fácil acesso e ótima visibilidade para o seu negócio na Vila Tupi.',
    location_tag: 'Praia Grande - SP',
    features: [
      { icon: "Navigation", title: "Fácil acesso e mobilidade" },
      { icon: "Building2", title: "Região estratégica" },
      { icon: "Store", title: "Próximo a serviços" },
    ]
  });

  const sectionSettings = settings || {};
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';


  useEffect(() => {
    const loadContent = async () => {
      if (content) return;
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'institucional');
        if (section && section.content) {
          setLocalContent(prev => ({ ...prev, ...section.content }));
        }
      }
    };
    loadContent();
  }, [content]);


  const getIcon = (name: string) => {
    switch (name) {
      case 'Navigation': return Navigation;
      case 'Building2': return Building2;
      case 'Store': return Store;
      default: return MapPin;
    }
  };

  return (
    <section 
      id="institucional" 
      className="py-24 bg-background"
      style={{
        ...bgStyle,
        paddingTop: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        paddingBottom: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        marginBottom: sectionSettings.marginBottom ? `${sectionSettings.marginBottom}px` : undefined
      }}
    >
      <div className={widthClass}>
        <div 
          className="relative bg-brand-blue-dark rounded-[2rem] overflow-hidden"
          style={sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {}}
        >

          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary/30 blur-3xl pointer-events-none" />
          <div className="grid lg:grid-cols-2 items-stretch">
            <div className="relative h-80 lg:h-96">
              <img src={sabrina.url} alt="Sabrina - Coworking 013" className="w-full h-full object-cover" />
              <div className="hidden lg:block absolute top-0 right-0 h-full w-24 bg-brand-blue-dark" style={{ clipPath: "ellipse(100% 60% at 100% 50%)" }} />
            </div>
            <div className="relative p-8 lg:p-14">
              <div className="flex items-center gap-2 text-secondary mb-4">
                <MapPin className="w-5 h-5" />
                <span className="font-heading font-bold text-sm">{content.location_tag}</span>
              </div>
              <h2 className="font-heading font-black text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-5" dangerouslySetInnerHTML={{ __html: content.title }} />
              <p className="text-white/75 leading-relaxed mb-8">{content.description}</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {content.features.map((f: any, i: number) => {
                  const Icon = getIcon(f.icon);
                  return (
                    <div key={i} className="flex flex-col items-start gap-2">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-secondary" />
                      </div>
                      <p className="text-sm text-white/85 font-medium leading-snug">{f.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstitucionalSection;
