import { useState, useEffect } from "react";
import { LayoutDashboard, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const logoIconUrlDefault = "/assets/logo.png";
import { getPageContent } from "@/lib/cms";

// Componentes de ícones de redes sociais (SVG)
const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const YoutubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

const WhatsappIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.5 0 4.8.8 6.7 2.2L18.6 3.3a1.5 1.5 0 0 1 2.1 1.8l-3.2 3.2a9 9 0 0 1-2.2-6.7z"/>
    <path d="M12 12l-1.5 1.5a3.5 3.5 0 0 0 5 5l2.5-2.5a3.5 3.5 0 0 0-5-5z"/>
    <path d="M7.5 13.5a3.5 3.5 0 0 0 5-5l2.5-2.5a3.5 3.5 0 0 0-5 5z"/>
  </svg>
);

const getExternalUrl = (url?: string) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return "#";
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
};

const Footer = () => {
  const [cmsContent, setCmsContent] = useState<any>(null);
  const [unitAddresses, setUnitAddresses] = useState<Array<{ name: string; address: string }>>([]);

  useEffect(() => {
    loadCms();
  }, []);

  const loadCms = async () => {
    const { data: unitsData } = await supabase
      .from('unidades')
      .select('nome, endereco')
      .order('nome', { ascending: true });

    if (unitsData?.length) {
      setUnitAddresses(unitsData.map((unit) => ({
        name: unit.nome,
        address: unit.endereco || "Endereço não informado",
      })));
    }

    // Load Navigation Menus for Footer
    const { data: navData } = await supabase
      .from('navigation_menus')
      .select('*, items:navigation_items(*)')
      .eq('slug', 'footer-nav')
      .single();

    const { data: servData } = await supabase
      .from('navigation_menus')
      .select('*, items:navigation_items(*)')
      .eq('slug', 'footer-services')
      .single();

    const organizedCols = [];

    if (navData) {
      organizedCols.push({
        title: navData.name,
        links: navData.items.sort((a: any, b: any) => a.order_index - b.order_index).map((i: any) => ({
          label: i.label,
          href: i.url,
          route: !i.is_external && !i.url.startsWith('#')
        }))
      });
    }

    if (servData) {
      organizedCols.push({
        title: servData.name,
        links: servData.items.sort((a: any, b: any) => a.order_index - b.order_index).map((i: any) => ({
          label: i.label,
          href: i.url,
          route: !i.is_external && !i.url.startsWith('#')
        }))
      });
    }

    if (organizedCols.length > 0) {
      setCmsContent(prev => ({ ...prev, columns: organizedCols }));
    }

    // Load Global Footer Content
    const data = await getPageContent("global-footer");
    if (data && data.site_sections) {
      const footerSection = data.site_sections.find((s: any) => 
        (s.section_key === 'dynamic-layout' || s.section_key === 'footer') && s.is_visible
      );
      if (footerSection) {
        const content = footerSection.content;
        setCmsContent(prev => ({ ...prev, ...content }));
      }
    }
  };

  const defaultCols = [
    {
      title: "Navegação",
      links: [
        { label: "Início", href: "/", route: true },
        { label: "Institucional", href: "/institucional", route: true },
        { label: "Unidades", href: "/unidades", route: true },
        { label: "Contato", href: "#contato" },
        { label: "Área do Cliente", href: "/painel", route: true },
      ],
    },
    {
      title: "Serviços",
      links: [
        { label: "Salas Privativas", href: "/escritorio-privativo", route: true },
        { label: "Sala de Reunião", href: "/auditorio-modular", route: true },
        { label: "Auditório Modular", href: "/auditorio-modular", route: true },
        { label: "Consultório Privativo", href: "/consultorio-privativo", route: true },
        { label: "Endereço Virtual", href: "/endereco-virtual", route: true },
      ],
    },
  ];

  const defaultUnitAddresses = [
    { name: "Unidade 01 - Rua Jaú", address: "R. Jaú, 955 Conj. 26, Boqueirão - Praia Grande - SP" },
    { name: "Unidade 02 - Av. Costa e Silva", address: "Av. P. Costa e Silva, 609 - S. 906, Boqueirão - Praia Grande - SP" },
    { name: "Unidade 03 - Rua São Caetano", address: "R. São Caetano, 86, Boqueirão - Praia Grande - SP" },
    { name: "Unidade 04 - Helbor São Vicente", address: "Rua Benjamin Constant, 61, Centro - São Vicente - SP" }
  ];
  const unidades = unitAddresses.length > 0 ? unitAddresses : defaultUnitAddresses;

  const cols = cmsContent?.columns || defaultCols;
  const footerCols = cols.map((col: any, index: number) => index === 0 && !col.links.some((link: any) => link.href === "/agendamento")
    ? { ...col, links: [...col.links.slice(0, 1), { label: "Agendamento", href: "/agendamento", route: true }, ...col.links.slice(1)] }
    : col);
  const description = cmsContent?.description || "O seu espaço de trabalho e networking na Praia Grande.";
  const phone = cmsContent?.phone || "(13) 98805-0358";
  const email = cmsContent?.email || "contato@coworking013.com.br";
  const workingHoursWeek = cmsContent?.working_hours_week || "Seg. à Sex.: 08h às 21h";
  const workingHoursSat = cmsContent?.working_hours_sat || "Sáb: 08h às 12h";
  const logoTop = cmsContent?.logo_text_top || "CoWorking";
  const logoBottom = cmsContent?.logo_text_bottom || "013";
  const logoIconUrl = cmsContent?.logo_icon || logoIconUrlDefault;

  return (
    <footer className="bg-[#031d36] text-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid gap-y-8 md:grid-cols-2 md:gap-x-8 lg:grid-cols-[18%_16%_18%_25%_23%] lg:gap-x-0 mb-12">
          <div className="lg:pr-4">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
              <div className="flex flex-col leading-none">
                <span className="font-heading font-bold text-[12px] tracking-tighter leading-[1] text-white">
                  CoWorking
                </span>
                <span className="font-heading font-bold text-[28px] tracking-tighter leading-[0.8] text-brand-orange">
                  013
                </span>
              </div>
            </div>
            <p className="text-base text-white/70 leading-relaxed">
              {description}
            </p>
          </div>

           {footerCols.map((col: any, i: number) => (
            <div key={i} className="lg:px-2">
              <h4 className="font-heading font-bold mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}>
                    {(l as any).route ? (
                      <Link to={l.href} className="text-sm text-white/60 hover:text-secondary transition-colors inline-flex items-center gap-1.5">
                        {l.label === "Área do Cliente" || l.label === "Admin" ? (
                          <LayoutDashboard className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-white/60 hover:text-secondary transition-colors inline-flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5" />
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:px-2">
            <h4 className="font-heading font-bold mb-4">Unidades</h4>
            <ul className="space-y-3 text-sm text-white/70">
              {unidades.map((unidade, i) => (
                <li key={i}>
                  <strong className="text-white">{unidade.name}:</strong>{" "}
                  <span>{unidade.address}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-3">
            <h4 className="font-heading font-bold mb-4">Informações</h4>
            <div className="space-y-3 text-sm text-white/70">
              <p><strong className="text-white">Contatos e Atendimento</strong></p>
              <p><strong className="text-white">Telefone / WhatsApp:</strong> {phone}</p>
              <p><strong className="text-white">E-mail:</strong> {email}</p>
              <p><strong className="text-white">Horário de Atendimento:</strong> {workingHoursWeek} | {workingHoursSat} (atendimento e telefone centralizados na sede)</p>
            </div>
            <div className="flex gap-3 mt-6">
              <a href={getExternalUrl(cmsContent?.instagram_url)} target="_blank" rel="noopener noreferrer" aria-label="Abrir Instagram em nova aba" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href={getExternalUrl(cmsContent?.facebook_url)} target="_blank" rel="noopener noreferrer" aria-label="Abrir Facebook em nova aba" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors">
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a href={getExternalUrl(cmsContent?.youtube_url)} target="_blank" rel="noopener noreferrer" aria-label="Abrir YouTube em nova aba" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors">
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a href={getExternalUrl(cmsContent?.whatsapp_url)} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp em nova aba" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors">
                <WhatsappIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Coworking 013. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-secondary">Política de Privacidade</a>
            <a href="#" className="hover:text-secondary">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
