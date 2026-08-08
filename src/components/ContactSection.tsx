import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, Send, Clock, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getPageContent } from "@/lib/cms";

const ContactSection = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "planos", message: "" });
  const [content, setContent] = useState({
    cta_title: 'Pronto para levar seu negócio para outro nível?',
    cta_subtitle: 'Agende uma visita e conheça de perto o que o Coworking 013 pode fazer por você.',
    cta_button: 'Agendar Visita Agora',
    title: 'Tire dúvidas ou agende uma visita.',
    contact_items: [
      { icon: "Phone", title: "Telefone", value: "(13) 9.9744-0130", href: "tel:13997440130" },
      { icon: "Mail", title: "E-mail", value: "contato@coworking013.com.br", href: "mailto:contato@coworking013.com.br" },
      { icon: "MapPin", title: "Endereço", value: "Av. Presidente Kennedy, 5214 - Praia Grande - SP", href: "" },
      { icon: "Clock", title: "Horário", value: "Seg a Sex: 09h às 17h", href: "" },
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      const data = await getPageContent('/');
      if (data && data.site_sections) {
        const section = data.site_sections.find((s: any) => s.section_key === 'contact');
        if (section && section.content) {
          setContent({ ...content, ...section.content });
        }
      }
    };
    loadContent();
  }, []);

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
    <section id="contato" className="py-24 bg-brand-gray">
      <div className="container mx-auto px-4">
        <div className="relative bg-gradient-to-r from-secondary to-brand-blue-dark rounded-3xl p-8 md:p-10 mb-16 overflow-hidden text-white">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-black text-2xl md:text-3xl leading-tight">{content.cta_title}</h3>
                <p className="text-white/80 text-sm mt-2">{content.cta_subtitle}</p>
              </div>
            </div>
            <div className="flex md:justify-end">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-brand-orange-light rounded-full font-heading font-bold px-8">
                {content.cta_button} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <span className="inline-block text-secondary font-heading font-bold text-xs tracking-widest mb-4 uppercase">FALE COM A GENTE</span>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-foreground leading-tight mb-8" dangerouslySetInnerHTML={{ __html: content.title }} />
            <div className="space-y-5">
              {content.contact_items.map((item: any, i: number) => {
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
