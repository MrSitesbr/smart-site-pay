
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { assets } from "@/lib/migration-assets";

const Unidades = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="font-heading font-black text-5xl md:text-7xl text-brand-blue-dark mb-6">
              Nossas <span className="text-secondary">Unidades</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Estrutura completa com unidades estratégicas em Praia Grande para atender seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              {
                nome: "Unidade Av. Costa e Silva",
                endereco: "Av. P. Costa e Silva, 609 - S. 906, Boqueirão - Praia Grande - SP",
                desc: "Nossa unidade premium, focada em escritórios privativos e consultórios de alto padrão.",
                img: assets.images.vistaAerea
              },
              {
                nome: "Unidade Rua São Caetano",
                endereco: "R. São Caetano, 86, Boqueirão - Praia Grande - SP",
                desc: "Localizada no coração do Boqueirão, ideal para quem busca networking e agilidade.",
                img: assets.images.recepcao
              },
              {
                nome: "Unidade Rua Jaú",
                endereco: "R. Jaú, 955 Conj. 26, Boqueirão - Praia Grande - SP",
                desc: "Espaço moderno e funcional para profissionais que buscam praticidade e excelente localização.",
                img: assets.images.recepcao
              }
            ].map((unidade, idx) => (
              <div key={idx} className="flex flex-col bg-slate-50 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-64 overflow-hidden">
                  <img src={unidade.img} className="w-full h-full object-cover" alt={unidade.nome} />
                </div>
                <div className="p-8">
                  <h2 className="font-heading font-bold text-2xl text-brand-blue-dark mb-3">{unidade.nome}</h2>
                  <p className="text-muted-foreground mb-4 text-sm">{unidade.endereco}</p>
                  <p className="text-slate-600">{unidade.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default Unidades;