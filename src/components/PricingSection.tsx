import { useState, useEffect } from "react";
import { Check, X, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReservaDialog from "@/components/ReservaDialog";
import { getPageContent } from "@/lib/cms";

const PricingSection = () => {
  const [reservaOpen, setReservaOpen] = useState(false);
  const [content, setContent] = useState({
    title: 'Planos que se adaptam ao <span class="text-primary">seu crescimento.</span>',
    subtitle: 'Escolha a melhor opção para você ou para sua equipe. Sem burocracia, sem fiador, apenas foco no seu trabalho.',
    plans_individual: [
      { name: "Day Pass", price: "R$ 70", period: "/dia", features: ["Cadeira rotativa", "Internet 500mb", "Café e água", "Ambiente climatizado"], highlight: false },
      { name: "Coworking", price: "R$ 550", period: "/mês", features: ["Uso ilimitado", "Locker individual", "Endereço comercial", "Desconto salas reunião"], highlight: true },
      { name: "Endereço Virtual", price: "R$ 150", period: "/mês", features: ["Domicílio fiscal", "Gestão de correspondência", "Divulgação de endereço", "Atendimento telefônico opcional"], highlight: false },
      { name: "Sala Privativa", price: "A partir de R$ 1.500", period: "/mês", features: ["Sala exclusiva", "Móveis inclusos", "Chave da sala", "Ar condicionado individual"], highlight: false },
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'pricing');
        if (section && section.content) {
          setContent({ ...content, ...section.content });
        }
      }
    };
    loadContent();
  }, []);

  return (
    <section id="planos" className="py-24 bg-brand-gray relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground mb-6" dangerouslySetInnerHTML={{ __html: content.title }} />
          <p className="text-muted-foreground text-lg">{content.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {content.plans_individual.map((plan: any, i: number) => (
            <div key={i} className={`bg-white rounded-[2rem] p-8 border-2 transition-all ${plan.highlight ? 'border-brand-orange shadow-xl scale-105 relative z-10' : 'border-transparent shadow-sm hover:shadow-md'}`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Mais Popular</div>
              )}
              <h3 className="font-heading font-bold text-2xl mb-4">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-black text-brand-blue-dark">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((f: string, j: number) => (
                  <li key={j} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="w-5 h-5 text-brand-orange" /> {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => setReservaOpen(true)} className={`w-full py-6 rounded-full font-bold ${plan.highlight ? 'bg-brand-orange hover:bg-brand-orange/90' : 'bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white'}`}>Contratar Agora</Button>
            </div>
          ))}
        </div>
      </div>
      <ReservaDialog open={reservaOpen} onOpenChange={setReservaOpen} />
    </section>
  );
};

export default PricingSection;
