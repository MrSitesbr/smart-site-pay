
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { assets } from "@/lib/migration-assets";
import { Check } from "lucide-react";

const Ambientes = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="font-heading font-black text-5xl md:text-7xl text-brand-blue-dark mb-6">
              Nossos <span className="text-secondary">Ambientes</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Estrutura completa com unidades estratégicas em Praia Grande para atender seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20" id="saocaetano">
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl h-[400px]">
              <img src={assets.images.recepcao} className="w-full h-full object-cover" alt="Unidade São Caetano" />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="font-heading font-bold text-3xl text-brand-blue-dark mb-6">Unidade Rua São Caetano</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Localizada no coração do Boqueirão, esta unidade oferece um ambiente vibrante e moderno, ideal para quem busca networking e agilidade.
              </p>
              <ul className="space-y-4 mb-8">
                {["Coworking Compartilhado", "Salas de Reunião", "Endereço Fiscal", "Copa Equipada"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-5 h-5 text-secondary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20 flex-row-reverse" id="costasilva">
            <div className="flex flex-col justify-center order-2 md:order-1">
              <h2 className="font-heading font-bold text-3xl text-brand-blue-dark mb-6">Unidade Av. Costa e Silva</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Nossa unidade premium, focada em escritórios privativos e consultórios de alto padrão. Localização estratégica e vista privilegiada.
              </p>
              <ul className="space-y-4 mb-8">
                {["Escritórios Privativos", "Consultórios Médicos", "Auditório Modular", "Estacionamento"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-5 h-5 text-secondary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl h-[400px] order-1 md:order-2">
              <img src={assets.images.vistaAerea} className="w-full h-full object-cover" alt="Unidade Costa e Silva" />
            </div>
          </div>
        </div>
      </main>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default Unidades;
