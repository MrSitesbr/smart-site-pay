import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { assets } from "@/lib/migration-assets";

const EscritorioPrivativo = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">
                  Escritório Privativo
                </h1>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Espaço exclusivo para trabalhar com privacidade, personalização e credibilidade. Ideal para empresas e empreendedores que buscam um ambiente profissional e reservado na Praia Grande.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Mobiliário ergonômico completo",
                    "Ar-condicionado individual",
                    "Acesso 24/7 (conforme plano)",
                    "Endereço comercial e fiscal incluso",
                    "Limpeza e manutenção diária",
                    "Internet de alta velocidade (Fibra)",
                    "Serviço de recepção e copa"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 px-8 rounded-full text-lg transition-all transform hover:scale-105">
                  Solicitar Cotação
                </Button>
              </div>
              <div className="rounded-3xl overflow-hidden shadow-2xl aspect-video relative group">
                <img src={assets.images.recepcao} alt="Escritório Privativo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
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

export default EscritorioPrivativo;