import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Play, Star, ArrowUpRight } from "lucide-react";
import salaReuniao from "@/assets/sala-reuniao-1.jpg";
import ReservaDialog from "@/components/ReservaDialog";
import { getPageContent } from "@/lib/cms";

const HeroSection = () => {
  const [reservaOpen, setReservaOpen] = useState(false);
  const [content, setContent] = useState({
    title: 'Tudo que você precisa para <span class="text-primary">escalar</span> <span class="text-secondary">o seu negócio.</span>',
    subtitle: 'Salas privativas, salas de reunião e estações de trabalho em um ambiente moderno, confortável e com toda estrutura que o seu negócio precisa para crescer.',
    cta_primary: 'Reservar',
    cta_secondary: 'Conheça o espaço'
  });

  useEffect(() => {
    const loadContent = async () => {
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'hero');
        if (section && section.content) {
          setContent({ ...content, ...section.content });
        }
      }
    };
    loadContent();
  }, []);

  return (
    <section id="home" className="relative bg-brand-blue-dark overflow-hidden pt-24 pb-16 lg:pb-24">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <span className="inline-block text-secondary font-heading font-bold text-sm tracking-widest mb-6">
              COWORKING 013 · PRAIA GRANDE - SP
            </span>
            <h1 className="font-heading font-black text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white mb-6" dangerouslySetInnerHTML={{ __html: content.title }} />
            <p className="text-lg text-white/70 mb-8 max-w-lg leading-relaxed">{content.subtitle}</p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Button onClick={() => setReservaOpen(true)} size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold px-8 py-6 text-base">
                <Calendar className="w-5 h-5 mr-2" /> {content.cta_primary}
              </Button>
              <a href="#solucoes">
                <Button size="lg" variant="outline" className="bg-white/5 backdrop-blur border-white/20 text-white hover:bg-white/10 hover:text-white rounded-full font-heading font-bold px-8 py-6 text-base">
                  <Play className="w-4 h-4 mr-2 fill-white" /> {content.cta_secondary}
                </Button>
              </a>
            </div>
          </div>

          <div className="relative animate-fade-in-up">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/3]">
              <img src={salaReuniao} alt="Espaço" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-6 bg-brand-blue-dark border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 max-w-[260px]">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
              </div>
              <div>
                <p className="font-heading font-bold text-white text-sm">Ambiente Profissional</p>
                <p className="text-xs text-white/60">Conforto e Privacidade</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReservaDialog open={reservaOpen} onOpenChange={setReservaOpen} />
    </section>
  );
};

export default HeroSection;
