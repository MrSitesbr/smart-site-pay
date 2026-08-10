
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { assets } from "@/lib/migration-assets";

const Institutional = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-6xl font-heading font-black text-brand-blue-dark mb-6 leading-tight">
                  Sempre em constante <span className="text-orange-500">evolução</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Localizado estrategicamente na Praia Grande, o CoWorking 013 é muito mais do que um espaço de trabalho. Somos um ecossistema projetado para impulsionar o seu sucesso profissional.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Com unidades estrategicamente posicionadas, oferecemos infraestrutura de alto padrão, tecnologia de ponta e um ambiente que respira inovação e colaboração. Nossa missão é prover a base sólida que sua empresa precisa para crescer sem burocracia.
                </p>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-3xl font-black text-brand-blue-dark mb-1">2+</h3>
                    <p className="text-sm text-muted-foreground">Unidades Premium</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-3xl font-black text-brand-blue-dark mb-1">100+</h3>
                    <p className="text-sm text-muted-foreground">Empresas Sediadas</p>
                  </div>
                </div>
              </div>
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl h-[600px] border-[12px] border-white group">
                <img src={assets.images.sabrinaLarge} alt="Sabrina - CoWorking 013" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-brand-gray">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center flex-row-reverse">
              <div className="order-2 lg:order-1 rounded-[3rem] overflow-hidden shadow-2xl h-[450px]">
                <img src={assets.images.recepcao} alt="Nossa Estrutura" className="w-full h-full object-cover" />
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">Nossa <span className="text-orange-500">Estrutura</span></h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Cada detalhe do CoWorking 013 foi pensado para maximizar a sua produtividade. Desde o café premium sempre fresco até a internet de altíssima velocidade com redundância.
                </p>
                <ul className="space-y-4">
                  {[
                    "Atendimento humanizado e recepção profissional",
                    "Ambientes climatizados com controle individual",
                    "Segurança monitorada 24 horas",
                    "Networking qualificado com outros profissionais"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium text-brand-blue-dark">
                      <img src={assets.icons.qualidade} className="w-6 h-6" alt="check" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Institutional;
