import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Phone } from "lucide-react";
import { assets } from "@/lib/migration-assets";

const EnderecoVirtual = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-heading font-black text-brand-blue-dark mb-6">
                Endereço <span className="text-orange-500">Virtual</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                A solução ideal para profissionais liberais, nômades digitais e empresas que precisam de uma base sólida e prestigiada na Praia Grande, sem os custos de uma sala física.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h3 className="text-2xl font-heading font-bold text-brand-blue-dark mb-6">Benefícios Inclusos</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      "Endereço Comercial de Prestígio",
                      "Endereço Fiscal para CNPJ",
                      "Gestão de Correspondências",
                      "Avisos via WhatsApp em tempo real",
                      "Descontos em Salas de Reunião",
                      "Networking com a Comunidade",
                      "Uso da marca 013 no seu material",
                      "Segurança e Credibilidade"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <img src={assets.icons.qualidade} className="w-5 h-5 object-contain flex-shrink-0" alt="check" />
                        <span className="text-sm text-muted-foreground font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-7 rounded-2xl text-xl shadow-lg shadow-orange-500/20 transition-all transform hover:-translate-y-1">
                    Contratar Endereço Fiscal
                  </Button>
                  <p className="text-center text-sm text-muted-foreground italic">
                    Planos mensais sem burocracia e com ativação imediata.
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-50 flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-heading font-bold text-brand-blue-dark mb-2">Localização Estratégica</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Sua empresa sediada na Av. Presidente Kennedy, o principal eixo comercial da Praia Grande.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-50 flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-7 h-7 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-heading font-bold text-brand-blue-dark mb-2">Gestão de Documentos</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Recebemos e organizamos suas cartas e encomendas, notificando você instantaneamente.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-50 flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-heading font-bold text-brand-blue-dark mb-2">Atendimento de Elite</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Nossa recepção está preparada para fornecer as melhores informações sobre sua localização.
                    </p>
                  </div>
                </div>
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