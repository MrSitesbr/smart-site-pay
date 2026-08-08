import { useState, useEffect } from "react";
import { FileText, Users, Briefcase, Network, CheckCircle2, Wifi } from "lucide-react";
import salaPrivativa from "@/assets/escritorio-cow013.png.asset.json";
import coworkingArea from "@/assets/auditorio-cow013.png.asset.json";
import salaReuniao2 from "@/assets/consultorio-cow013.png.asset.json";
import { getPageContent } from "@/lib/cms";

const IdealParaSection = () => {
  const [content, setContent] = useState({
    tag: "FEITO PARA VOCÊ",
    title: 'Soluções sob medida para <span class="text-secondary">você e seu time.</span>',
    features: [
      { icon: "FileText", title: "Salas Privativas", desc: "Privacidade total para sua equipe" },
      { icon: "Users", title: "Sala de Reunião", desc: "Equipada para seus encontros" },
      { icon: "Briefcase", title: "Coworking", desc: "Estações de trabalho produtivas" },
      { icon: "Network", title: "Endereço Fiscal", desc: "Credibilidade para seu negócio" },
    ],
    benefits_tag: "INFRAESTRUTURA COMPLETA",
    benefits_title: 'Tudo pronto para você <span class="text-primary">focar no que importa</span>: seu resultado.',
    benefits_list: [
      "Internet de alta velocidade 500MB",
      "Ambientes climatizados",
      "Consultórios e Escritórios Mobiliados",
      "Estrutura completa",
      "Localização estratégica",
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'features');
        if (section && section.content) {
          setContent({ ...content, ...section.content });
        }
      }
    };
    loadContent();
  }, []);

  const getIcon = (name: string) => {
    switch (name) {
      case 'FileText': return FileText;
      case 'Users': return Users;
      case 'Briefcase': return Briefcase;
      case 'Network': return Network;
      default: return FileText;
    }
  };

  return (
    <section id="solucoes" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-20">
          <div className="grid md:grid-cols-3 gap-10 items-start mb-14">
            <div>
              <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">
                {content.tag}
              </span>
              <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight" dangerouslySetInnerHTML={{ __html: content.title }} />
            </div>
            <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-6">
              {content.features.map((f: any, i: number) => {
                const Icon = getIcon(f.icon);
                return (
                  <div key={i} className="group">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary group-hover:scale-110 transition-all">
                      <Icon className="w-6 h-6 text-secondary group-hover:text-secondary-foreground" />
                    </div>
                    <h3 className="font-heading font-bold text-base text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden aspect-square">
              <img src={salaPrivativa.url} alt="Sala Privativa" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square">
              <img src={coworkingArea.url} alt="Coworking" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[2/1] col-span-2">
              <img src={salaReuniao2.url} alt="Sala de Reunião" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="lg:col-span-5 bg-brand-blue-dark rounded-2xl p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-secondary/20 blur-3xl" />
            <div className="relative">
              <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">
                {content.benefits_tag}
              </span>
              <h3 className="font-heading font-black text-3xl md:text-4xl text-white leading-tight mb-6" dangerouslySetInnerHTML={{ __html: content.benefits_title }} />
              <ul className="space-y-3">
                {content.benefits_list.map((b: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-white/85">
                    <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative mt-8 rounded-2xl p-6 bg-gradient-to-br from-primary via-brand-orange-light to-secondary">
              <Wifi className="w-8 h-8 text-white mb-2" />
              <p className="font-heading font-black text-3xl text-white leading-none">Internet 500MB</p>
              <p className="text-white/90 text-sm mt-1">Estável. Rápida. Sem interrupções.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IdealParaSection;
