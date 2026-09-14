import { useState, useEffect } from "react";
import { Stethoscope, Scale, HardHat, Cpu, Megaphone, Briefcase } from "lucide-react";
import { assets } from "@/lib/migration-assets";
import { getPageContent } from "@/lib/cms";
import DOMPurify from "dompurify";

const DEFAULTS = {
  tag: "Soluções por Área",
  title: 'O ambiente perfeito para sua <span class="text-secondary">profissão</span>',
  subtitle: 'Nossa estrutura foi desenhada para atender as exigências de diferentes nichos do mercado profissional.',
  areas: [
    { icon: "atendimento", title: "Saúde", desc: "Consultórios modernos e equipados, prontos para receber seus pacientes com total conforto e biossegurança.", bg: "bg-blue-50/50" },
    { icon: "profissional", title: "Jurídico", desc: "Privacidade absoluta e ambiente corporativo de alto nível para reuniões com clientes e parceiros.", bg: "bg-slate-50/50" },
    { icon: "documentos", title: "Engenharia", desc: "Espaço ideal para desenvolvimento de projetos, reuniões de equipe e gestão de obras com agilidade.", bg: "bg-orange-50/50" },
    { icon: "foco", title: "Tecnologia", desc: "Conectividade ultra veloz e ambiente focado em produtividade para desenvolvedores e startups.", bg: "bg-indigo-50/50" },
    { icon: "produtividade", title: "Marketing", desc: "Ambiente criativo e dinâmico para agências e profissionais que buscam inovação constante.", bg: "bg-pink-50/50" },
    { icon: "qualidade", title: "Consultoria", desc: "Toda a estrutura necessária para atender seus clientes com profissionalismo e eficiência.", bg: "bg-emerald-50/50" },
  ]
};

const DestaquesProfissionais = ({ content, settings }: { content?: any, settings?: any }) => {
  const [localContent, setLocalContent] = useState<any>({ ...DEFAULTS, ...(content || {}) });

  useEffect(() => {
    if (content) setLocalContent({ ...DEFAULTS, ...content });
  }, [content]);


  const sectionSettings = settings || {};
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';

  useEffect(() => {
    const loadContent = async () => {
      if (content) return;
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'especialidades');
        if (section && section.content) {
          setLocalContent(prev => ({ ...prev, ...section.content }));
        }
      }
    };
    loadContent();
  }, [content]);

  return (
    <section 
      id="especialidades" 
      className="py-24 bg-white overflow-hidden"
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
          <h2 className="font-heading font-black text-4xl md:text-5xl text-brand-blue-dark mb-6" style={textStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(localContent.title) }} />
          <p className="text-muted-foreground text-lg" style={textStyle}>
            {localContent.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {localContent.areas.map((area: any, i: number) => (
            <div key={i} className={`group p-8 rounded-[2rem] ${area.bg} hover:shadow-xl transition-all duration-300 border border-transparent hover:border-brand-orange/20`}>
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110 overflow-hidden">
                <img src={assets.icons[area.icon as keyof typeof assets.icons] || assets.icons.profissional} className="w-full h-full object-contain p-2" alt={area.title} />
              </div>
              <h3 className="font-heading font-bold text-2xl text-brand-blue-dark mb-4" style={textStyle}>{area.title}</h3>
              <p className="text-muted-foreground leading-relaxed" style={textStyle}>
                {area.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DestaquesProfissionais;