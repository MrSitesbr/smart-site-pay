import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
                <p className="text-lg text-muted-foreground mb-6">
                  Espaço exclusivo para trabalhar com privacidade, personalização e credibilidade. Ideal para empresas e empreendedores que buscam um ambiente profissional e reservado.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Mobiliário ergonômico completo",
                    "Ar-condicionado individual",
                    "Acesso 24/7 (conforme plano)",
                    "Endereço comercial e fiscal",
                    "Limpeza e manutenção inclusas",
                    "Internet de alta velocidade"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-orange/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-brand-orange" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-6 px-8 rounded-full text-lg">
                  Solicitar Cotação
                </Button>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-video">
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" alt="Escritório Privativo" className="w-full h-full object-cover" />
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
