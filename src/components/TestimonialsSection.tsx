import { useState, useEffect } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { getPageContent } from "@/lib/cms";

const TestimonialsSection = () => {
  const [index, setIndex] = useState(0);
  const [content, setContent] = useState({
    tag: "QUEM TRABALHA AQUI RECOMENDA",
    title: 'Depoimentos de quem vive a <span class="text-primary">experiência.</span>',
    testimonials: [
      { name: "Juliana R.", role: "Advogada", text: "O Coworking Kennedy me ajudou a atender meus clientes com mais profissionalismo. Ambiente impecável.", avatar: "https://i.pravatar.cc/120?img=47" },
      { name: "Carlos M.", role: "Contador", text: "Ambiente excelente, internet rápida e localização perfeita. Recomendo para qualquer profissional.", avatar: "https://i.pravatar.cc/120?img=12" },
      { name: "Renato S.", role: "Representante", text: "As salas de reunião fazem toda a diferença nas minhas apresentações.", avatar: "https://i.pravatar.cc/120?img=33" },
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'testimonials');
        if (section && section.content) {
          setContent({ ...content, ...section.content });
        }
      }
    };
    loadContent();
  }, []);

  const visible = 3;
  const max = Math.max(0, content.testimonials.length - visible);

  return (
    <section className="py-24 bg-brand-blue-dark relative overflow-hidden">
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-4 gap-8 mb-12 items-end">
          <div className="lg:col-span-3">
            <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">{content.tag}</span>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-white leading-tight" dangerouslySetInnerHTML={{ __html: content.title }} />
          </div>
          <div className="flex gap-3 lg:justify-end">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="w-12 h-12 rounded-full bg-white/10 hover:bg-secondary text-white flex items-center justify-center transition-all disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setIndex(Math.min(max, index + 1))} disabled={index === max} className="w-12 h-12 rounded-full bg-white/10 hover:bg-secondary text-white flex items-center justify-center transition-all disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="flex gap-6 transition-transform duration-500" style={{ transform: `translateX(calc(-${index} * (100% / ${visible} + 0px)))` }}>
            {content.testimonials.map((t: any, i: number) => (
              <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 flex-shrink-0" style={{ width: `calc((100% - ${(visible - 1) * 24}px) / ${visible})` }}>
                <Quote className="w-7 h-7 text-secondary mb-4" />
                <p className="text-white/85 leading-relaxed mb-6 text-sm">{t.text}</p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
                  <div>
                    <p className="font-heading font-bold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-white/60">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
