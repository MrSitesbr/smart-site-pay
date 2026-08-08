import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const EnderecoVirtual = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">
                  Endereço Virtual
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Dê credibilidade ao seu negócio com um endereço comercial de prestígio e serviços de apoio administrativo, sem a necessidade de um espaço físico permanente.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    "Endereço comercial para materiais",
                    "Endereço fiscal para abertura de empresa",
                    "Gestão de correspondência",
                    "Avisos via WhatsApp/E-mail",
                    "Descontos em salas de reunião",
                    "Atendimento telefônico opcional"
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
                  Contratar Agora
                </Button>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-video">
                <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200" alt="Endereço Virtual" className="w-full h-full object-cover" />
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

export default EnderecoVirtual;
