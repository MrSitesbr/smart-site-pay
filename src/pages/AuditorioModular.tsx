import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const AuditorioModular = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">
                  Auditório Modular
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Espaço versátil para treinamentos, palestras, reuniões e eventos corporativos. Com layout flexível, nosso auditório se adapta perfeitamente às necessidades do seu evento.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Capacidade flexível",
                    "Equipamentos audiovisuais completos",
                    "Ar-condicionado",
                    "Internet Wi-Fi dedicada",
                    "Suporte técnico",
                    "Opções de coffee break"
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
                  Reservar Agora
                </Button>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-video">
                <img src="https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=1200" alt="Auditório Modular" className="w-full h-full object-cover" />
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

export default AuditorioModular;
