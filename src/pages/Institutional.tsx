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
                <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">
                  Institucional
                </h1>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  O CoWorking 013 nasceu da visão de transformar a forma como as pessoas trabalham na Praia Grande. Localizado estrategicamente na Vila Tupi, oferecemos uma infraestrutura completa e moderna para profissionais que buscam networking, produtividade e credibilidade.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Nossa missão é proporcionar um ambiente colaborativo onde empresas e empreendedores possam crescer e prosperar, eliminando as preocupações com gestão de escritório e permitindo o foco total no que realmente importa: o seu negócio.
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
