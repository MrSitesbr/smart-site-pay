import { useState, useEffect } from "react";
import { MessageCircle, LayoutDashboard, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const logoIconUrlDefault = "/assets/logo.png";
import { getPageContent } from "@/lib/cms";

const Footer = () => {
  const [cmsContent, setCmsContent] = useState<any>(null);

  useEffect(() => {
    loadCms();
  }, []);

  const loadCms = async () => {
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

  const cols = cmsContent?.columns || defaultCols;
  const description = cmsContent?.description || "O seu espaço de trabalho e networking na Praia Grande.";
  const phone = cmsContent?.phone || "(13) 98805-0358";
  const email = cmsContent?.email || "contato@coworking013.com.br";
  const address1 = cmsContent?.address_1 || "Av. P. Costa e Silva, 609 - S. 906 - Boqueirão - Praia Grande - SP";
  const address2 = cmsContent?.address_2 || "R. São Caetano, 86 - Boqueirão - Praia Grande - SP";
  const address3 = cmsContent?.address_3 || "R. Jaú, 955 Conj. 26 - Boqueirão - Praia Grande - SP";
  const workingHoursWeek = cmsContent?.working_hours_week || "Seg. à Sex.: 08h às 21h";
  const workingHoursSat = cmsContent?.working_hours_sat || "Sáb: 08h às 12h";
  const logoTop = cmsContent?.logo_text_top || "CoWorking";
  const logoBottom = cmsContent?.logo_text_bottom || "013";
  const logoIconUrl = cmsContent?.logo_icon || logoIconUrlDefault;

  return (
    <footer className="bg-brand-blue-dark text-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logoIconUrl} alt="Logo" className="h-8 w-auto object-contain" />
              <div className="flex flex-col leading-[0.8] items-start">
                <span className="text-[14px] font-heading font-semibold tracking-tight text-orange-500">
                  {logoTop}
                </span>
                <h1 className="text-3xl font-heading font-extrabold text-white -mt-1">
                  {logoBottom}
                </h1>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              {description}
            </p>
            <div className="flex gap-3">
              {[MessageCircle, LayoutDashboard].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((col, i) => (
            <div key={i}>
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

          <div>
            <h4 className="font-heading font-bold mb-4">Informações</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li>{phone}</li>
              <li>{email}</li>
              <li>{address1}</li>
              <li>{address2}</li>
              <li>{address3}</li>
              <li>{workingHoursWeek}</li>
              <li>{workingHoursSat}</li>
            </ul>
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
