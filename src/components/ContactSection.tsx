import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, Send, Clock, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getPageContent } from "@/lib/cms";

const DEFAULTS = {
  cta_title: 'Pronto para levar seu negócio para outro nível?',
  cta_subtitle: 'Agende uma visita e conheça de perto o que o Coworking 013 pode fazer por você.',
  cta_button: 'Agendar Visita Agora',
  title: 'Tire dúvidas ou agende uma visita.',
  contact_items: [
    { icon: "Phone", title: "WhatsApp", value: "(13) 98805-0358", href: "https://wa.me/5513988050358" },
    { icon: "Mail", title: "E-mail", value: "contato@coworking013.com.br", href: "mailto:contato@coworking013.com.br" },
    { icon: "MapPin", title: "Unidades", value: "Av. P. Costa e Silva, 609 - S. 906\nR. São Caetano, 86\nR. Jaú, 955 Conj. 26\nPraia Grande - SP", href: "#" },
    { icon: "Clock", title: "Atendimento", value: "Seg. à Sex.: 08h às 21h\nSábados: 08h às 12h", href: "" },
  ]
};

const ContactSection = ({ content, settings }: { content?: any, settings?: any }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "planos", message: "" });
  const [localContent, setLocalContent] = useState<any>({ ...DEFAULTS, ...(content || {}) });

  useEffect(() => {
    if (content) setLocalContent({ ...DEFAULTS, ...content });
  }, [content]);


  const sectionSettings = settings || {};
  const bgStyle = sectionSettings.backgroundColor ? { backgroundColor: sectionSettings.backgroundColor } : {};
  const textStyle = sectionSettings.textColor ? { color: sectionSettings.textColor } : {};
  const widthClass = sectionSettings.widthMode === 'full' ? 'w-full px-4' : 'container mx-auto px-4';

  useEffect(() => {
    const loadContent = async () => {
      if (content) return;
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'contact');
        if (section && section.content) {
          setLocalContent(prev => ({ ...prev, ...section.content }));
        }
      }
    };
    loadContent();
  }, [content]);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Phone': return Phone;
      case 'Mail': return Mail;
      case 'MapPin': return MapPin;
      case 'Clock': return Clock;
      default: return Phone;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    setForm({ name: "", email: "", phone: "", subject: "planos", message: "" });
  };

  return (
    <section 
      id="contato" 
      className="py-24 bg-brand-gray"
      style={{
        ...bgStyle,
        paddingTop: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        paddingBottom: sectionSettings.paddingY !== undefined ? `${sectionSettings.paddingY}px` : undefined,
        marginBottom: sectionSettings.marginBottom ? `${sectionSettings.marginBottom}px` : undefined
      }}
    >
      <div className={widthClass}>
        <div className="relative bg-gradient-to-r from-secondary to-brand-blue-dark rounded-3xl p-8 md:p-10 mb-16 overflow-hidden text-white">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-black text-2xl md:text-3xl leading-tight">{localContent.cta_title}</h3>
                <p className="text-white/80 text-sm mt-2">{localContent.cta_subtitle}</p>
              </div>
            </div>
            <div className="flex md:justify-end">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-brand-orange-light rounded-full font-heading font-bold px-8">
                {localContent.cta_button} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">FALE COM A GENTE</span>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight mb-8" style={textStyle} dangerouslySetInnerHTML={{ __html: localContent.title }} />
            <div className="space-y-5">
              {localContent.contact_items.map((item: any, i: number) => {
                const Icon = getIcon(item.icon);
                const Inner = (
                  <div className="flex items-start gap-4 bg-card rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{item.title}</p>
                      <p className="font-heading font-bold text-foreground text-sm whitespace-pre-line">{item.value}</p>
                    </div>
                  </div>
                );
                return item.href ? <a key={i} href={item.href} className="block">{Inner}</a> : <div key={i}>{Inner}</div>;
              })}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="lg:col-span-3 bg-card rounded-3xl p-8 md:p-10 shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input className="rounded-xl h-12" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input className="rounded-xl h-12" type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Textarea className="rounded-xl" placeholder="Mensagem" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold py-6 text-base">
              <Send className="w-4 h-4 mr-2" /> Enviar Mensagem
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;