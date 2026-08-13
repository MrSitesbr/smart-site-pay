import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getPageContent } from "@/lib/cms";
import { assets } from "@/lib/migration-assets";

const DEFAULTS = {
  tag: "NOSSOS AMBIENTES",
  title: 'Espaços planejados para o seu <span class="text-secondary">sucesso.</span>',
  services: [
    { 
      title: "Salas Privativas", 
      desc: "Escritórios exclusivos para sua empresa ou equipe, com total privacidade.",
      href: "/escritorio-privativo",
      image: assets.images.recepcao
    },
    { 
      title: "Sala de Reunião", 
      desc: "Ambiente profissional para receber clientes e realizar fechamentos importantes.",
      href: "/auditorio-modular",
      image: assets.icons.reuniao
    },
    { 
      title: "Coworking", 
      desc: "Estações de trabalho em ambiente compartilhado, ideal para networking.",
      href: "/ambientes",
      image: assets.icons.compartilhado
    },
    { 
      title: "Endereço Fiscal", 
      desc: "Sua empresa no endereço comercial de maior prestígio da Vila Tupi.",
      href: "/endereco-virtual",
      image: assets.icons.fiscal
    },
    { 
      title: "Consultórios", 
      desc: "Salas equipadas para profissionais da saúde e bem-estar.",
      href: "/consultorio-privativo",
      image: assets.icons.consultorio
    },
    { 
      title: "Auditório", 
      desc: "Espaço modular para cursos, palestras e treinamentos corporativos.",
      href: "/auditorio-modular",
      image: assets.icons.auditorio
    },
  ]
};

const normalizeContent = (content?: any) => ({
  ...DEFAULTS,
  ...(content || {}),
  services: Array.isArray(content?.services) ? content.services.filter(Boolean) : DEFAULTS.services,
});

const IdealParaSection = ({ content, settings }: { content?: any, settings?: any }) => {
  const [localContent, setLocalContent] = useState<any>(() => normalizeContent(content));

  useEffect(() => {
    if (content) setLocalContent(normalizeContent(content));
  }, [content]);


  const sectionSettings = settings || {};
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';


  useEffect(() => {
    const loadContent = async () => {
      if (content) return; // Se as props já vieram, não busca no CMS
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'features');
        if (section && section.content) {
          setLocalContent(normalizeContent(section.content));
        }
      }
    };
    loadContent();
  }, [content]);


  return (
    <section 
      id="ambientes" 
      className="py-24 bg-brand-gray"
      style={{
        ...bgStyle,
        paddingTop: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        paddingBottom: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        marginBottom: sectionSettings.marginBottom ? `${sectionSettings.marginBottom}px` : undefined
      }}
    >
      <div className={widthClass}>
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-secondary font-heading font-bold text-sm tracking-widest uppercase mb-4 inline-block">{localContent.tag}</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl text-brand-blue-dark mb-6" style={textStyle} dangerouslySetInnerHTML={{ __html: localContent.title }} />
        </div>


        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {localContent.services.map((service: any, i: number) => (
            <Link key={i} to={service.href} className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col">
              <div className="relative h-64 overflow-hidden">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <span className="text-white font-bold flex items-center gap-2">Ver Detalhes <ArrowRight className="w-4 h-4" /></span>
                </div>
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3 className="font-heading font-bold text-2xl text-brand-blue-dark mb-3 group-hover:text-orange-500 transition-colors">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">{service.desc}</p>
                <div className="flex items-center text-orange-500 font-bold text-sm uppercase tracking-wider gap-2">
                  Saber mais <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IdealParaSection;