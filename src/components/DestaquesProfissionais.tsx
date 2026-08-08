import { Stethoscope, Scale, HardHat, Cpu, Megaphone, Plus } from "lucide-react";

const DestaquesProfissionais = () => {
  const areas = [
    { icon: Stethoscope, title: "Saúde", desc: "Consultórios equipados para médicos, psicólogos e dentistas." },
    { icon: Scale, title: "Jurídico", desc: "Ambiente reservado para advogados e reuniões confidenciais." },
    { icon: HardHat, title: "Construção", desc: "Espaço para engenheiros e arquitetos desenvolverem seus projetos." },
    { icon: Cpu, title: "Tecnologia", desc: "Infraestrutura de alta performance para desenvolvedores e TI." },
    { icon: Megaphone, title: "Marketing", desc: "Clima criativo para agências e profissionais de comunicação." },
    { icon: Plus, title: "Outros", desc: "Soluções versáteis para qualquer área de atuação profissional." },
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-secondary font-heading font-bold text-sm tracking-widest uppercase mb-4 inline-block">Especialidades</span>
          <h2 className="font-heading font-black text-4xl md:text-5xl text-brand-blue-dark mb-6">
            O ambiente perfeito para sua <span className="text-secondary">área de atuação</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Nossa estrutura foi planejada para atender as necessidades específicas de diferentes nichos profissionais.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {areas.map((area, i) => (
            <div key={i} className="group p-8 rounded-[2rem] bg-brand-gray hover:bg-brand-blue-dark transition-all duration-300 shadow-sm hover:shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-secondary flex items-center justify-center mb-6 shadow-sm transition-colors">
                <area.icon className="w-7 h-7 text-brand-blue-dark group-hover:text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-brand-blue-dark group-hover:text-white mb-4">{area.title}</h3>
              <p className="text-muted-foreground group-hover:text-white/70 leading-relaxed">
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