import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Mail, Phone, ArrowRight } from "lucide-react";
import { assets } from "@/lib/migration-assets";
import DOMPurify from "dompurify";

const HeroSection = ({ content, settings }: { content?: any, settings?: any }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    servico: "",
    empresa: "",
    periodo: "",
    nome: "",
    email: "",
    telefone: ""
  });

  const sectionContent = {
    title: 'MUDE SUA <span class="text-secondary">ROTINA</span> <br />DE TRABALHO',
    subtitle: 'O espaço que seu negócio merece, com a flexibilidade que você precisa. Descubra como podemos transformar sua produtividade.',
    location_label: 'Sede Vila Tupi - Praia Grande',
    form_type: 'reserva',
    ...(content || {})
  };


  const sectionSettings = settings || {};
  const paddingY = sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : "pt-20";
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';


  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  return (
    <section 
      id="home" 
      className="relative min-h-[90vh] flex items-center overflow-hidden bg-brand-blue-dark"
      style={{ 
        ...bgStyle,
        paddingTop: sectionSettings.paddingY !== undefined ? paddingY : undefined,
        paddingBottom: sectionSettings.paddingY !== undefined ? paddingY : undefined,
        marginBottom: sectionSettings.marginBottom ? `${sectionSettings.marginBottom}px` : undefined
      }}
    >
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={sectionSettings.backgroundImage || assets.images.vistaAerea} 
          alt="Coworking 013" 
          className="w-full h-full object-cover opacity-40" 
          style={{ opacity: sectionSettings.overlayOpacity !== undefined ? 1 - sectionSettings.overlayOpacity : 0.4 }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-r from-brand-blue-dark via-brand-blue-dark/80 to-transparent" 
          style={sectionSettings.backgroundColor ? { backgroundImage: `linear-gradient(to right, ${sectionSettings.backgroundColor}, transparent)` } : {}}
        />
      </div>

      <div className={`${widthClass} relative z-10`}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white animate-fade-in-up" style={textStyle}>
            <h1 
              className="font-heading font-black text-5xl md:text-7xl leading-tight mb-6 tracking-tighter"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sectionContent.title) }}
            />
            <p className="text-xl text-white/90 mb-8 max-w-xl leading-relaxed" style={textStyle}>
              {sectionContent.subtitle}
            </p>
            <div className="flex items-center gap-4 font-heading font-bold uppercase tracking-widest text-sm" style={sectionContent.secondary_color ? { color: sectionContent.secondary_color } : { color: '#FF7F00' }}>
              <span className="w-12 h-[2px]" style={sectionContent.secondary_color ? { backgroundColor: sectionContent.secondary_color } : { backgroundColor: '#FF7F00' }} />
              {sectionContent.location_label}
            </div>
          </div>


          <div className="bg-white rounded-3xl p-8 shadow-2xl animate-fade-in-up delay-200 max-w-md mx-auto lg:mr-0 w-full">
            <div className="mb-6 text-center">
              <h2 className="font-heading font-bold text-2xl text-brand-blue-dark">Seleção de Serviço</h2>
              <p className="text-muted-foreground text-sm">Coworking 013</p>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Selecionar Serviço:</label>
                  <Select onValueChange={(v) => setFormData({...formData, servico: v})}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compartilhado">Escritório Compartilhado</SelectItem>
                      <SelectItem value="privativo">Escritório Privativo</SelectItem>
                      <SelectItem value="consultorio">Consultório Privativo</SelectItem>
                      <SelectItem value="reuniao">Sala de Reunião</SelectItem>
                      <SelectItem value="auditorio">Auditório</SelectItem>
                      <SelectItem value="virtual">Endereço Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Empresa:</label>
                  <Select onValueChange={(v) => setFormData({...formData, empresa: v})}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="construcao">Construção</SelectItem>
                      <SelectItem value="tecnologia">Tecnologia</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Período:</label>
                  <Select onValueChange={(v) => setFormData({...formData, periodo: v})}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200">
                      <SelectValue placeholder="Selecione um período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleNext} 
                  disabled={!formData.servico || !formData.empresa || !formData.periodo}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold py-6 rounded-xl mt-4"
                >
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Nome:</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Seu nome completo" 
                      className="pl-10 rounded-xl border-gray-200"
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">E-mail:</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="pl-10 rounded-xl border-gray-200"
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">N. Telefone:</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="(13) 99999-9999" 
                      className="pl-10 rounded-xl border-gray-200"
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Button variant="outline" onClick={handleBack} className="rounded-xl font-bold py-6">Voltar</Button>
                  <Button className="bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white rounded-xl font-bold py-6">Solicitar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;