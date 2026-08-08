import { useState, useEffect } from "react";
import { CheckCircle2, Wifi, Zap, Lock, MapPin, Coffee } from "lucide-react";
import { getPageContent } from "@/lib/cms";

const IdealParaSection = () => {
  const [content, setContent] = useState({
    tag: "BENEFÍCIOS DE CONTRATAR",
    title: 'Por que escolher o <span class="text-secondary">Coworking 013?</span>',
    benefits: [
      { icon: Zap, title: "Alta Performance", desc: "Produtividade máxima em um ambiente profissional." },
      { icon: Lock, title: "Segurança 24h", desc: "Monitoramento e controle de acesso rigoroso." },
      { icon: Wifi, title: "Internet Fibra", desc: "Conexão redundante de altíssima velocidade." },
      { icon: MapPin, title: "Localização", desc: "No coração da Vila Tupi, fácil para você e clientes." },
      { icon: Coffee, title: "Networking", desc: "Café à vontade e troca de experiências constante." },
      { icon: CheckCircle2, title: "Custo-Benefício", desc: "Reduza seus custos fixos em até 60%." },
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

  return (
    <section id="beneficios" className="py-24 bg-brand-gray">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-secondary font-heading font-bold text-sm tracking-widest uppercase mb-4 inline-block">{content.tag}</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl text-brand-blue-dark mb-6" dangerouslySetInnerHTML={{ __html: content.title }} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {content.benefits.map((benefit: any, i: number) => (
            <div key={i} className="flex gap-5">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-brand-blue-dark mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IdealParaSection;