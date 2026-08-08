import { Stethoscope, Scale, HardHat, Cpu, Megaphone, Plus, Briefcase, Heart, Palette } from "lucide-react";

const DestaquesProfissionais = () => {
  const areas = [
    { 
      icon: Stethoscope, 
      title: "Saúde", 
      desc: "Consultórios preparados para profissionais que valorizam o bem-estar dos pacientes.",
      bg: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    { 
      icon: Scale, 
      title: "Advocacia", 
      desc: "Privacidade e credibilidade para atendimentos jurídicos e reuniões estratégicas.",
      bg: "bg-amber-50",
      iconColor: "text-amber-600"
    },
    { 
      icon: HardHat, 
      title: "Engenharia", 
      desc: "Infraestrutura completa para projetos, orçamentos e reuniões técnicas.",
      bg: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    { 
      icon: Briefcase, 
      title: "Contabilidade", 
      desc: "O endereço fiscal e comercial que sua empresa contábil precisa para crescer.",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    { 
      icon: Palette, 
      title: "Arquitetura", 
      desc: "Espaço criativo e funcional para apresentações de projetos e atendimento a clientes.",
      bg: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    { 
      icon: Megaphone, 
      title: "Marketing", 
      desc: "Ambiente dinâmico para agências e profissionais liberais da área de comunicação.",
      bg: "bg-rose-50",
      iconColor: "text-rose-600"
    },
  ];

  return (
    <section id="especialidades" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-secondary font-heading font-bold text-sm tracking-widest uppercase mb-4 inline-block">Soluções por Área</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl text-brand-blue-dark mb-6">
            O ambiente perfeito para sua <span className="text-secondary">profissão</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Nossa estrutura foi desenhada para atender as exigências de diferentes nichos do mercado profissional.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {areas.map((area, i) => (
            <div key={i} className={`group p-8 rounded-[2rem] ${area.bg} hover:shadow-xl transition-all duration-300 border border-transparent hover:border-brand-orange/20`}>
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110">
                <area.icon className={`w-8 h-8 ${area.iconColor}`} />
              </div>
              <h3 className="font-heading font-bold text-2xl text-brand-blue-dark mb-4">{area.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
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
