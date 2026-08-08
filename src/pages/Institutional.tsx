import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import sabrina from "@/assets/sabrina-cow013.png.asset.json";

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
                  Localizado estrategicamente na Praia Grande, o CoWorking 013 é muito mais do que um espaço de trabalho. Somos um ecossistema projetado para impulsionar o seu sucesso.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Oferecemos infraestrutura de alto padrão, tecnologia de ponta e um ambiente que respira inovação. Seja você um profissional liberal ou uma empresa em expansão, aqui você encontra o suporte necessário para focar no que realmente importa: seus resultados.
                </p>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[500px]">
                <img src={sabrina.url} alt="Nossa Unidade" className="w-full h-full object-cover" />
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
