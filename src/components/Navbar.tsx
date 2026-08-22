import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Calendar, ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const logoIconUrlDefault = "/assets/logo.png";
import ReservaDialog from "@/components/ReservaDialog";
import { getPageContent } from "@/lib/cms";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cmsContent, setCmsContent] = useState<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    loadCms();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadCms = async () => {
    // 1. Load Dynamic Menus
    const { data: menuData } = await supabase
      .from('navigation_menus')
      .select('*, items:navigation_items(*)')
      .eq('slug', 'main-header')
      .single();

    if (menuData) {
      const items = menuData.items || [];
      const rootItems = items.filter((i: any) => !i.parent_id).sort((a: any, b: any) => a.order_index - b.order_index);
      const organized = rootItems.map((root: any) => ({
        label: root.label,
        href: root.url,
        target: root.target || '_self',
        route: !root.is_external && !root.url.startsWith('#') && !root.url.startsWith('http'),
        submenu: items
          .filter((i: any) => i.parent_id === root.id)
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((sub: any) => ({
            label: sub.label,
            href: sub.url,
            target: sub.target || '_self',
            route: !sub.is_external && !sub.url.startsWith('#') && !sub.url.startsWith('http')
          }))
      }));
      
      organized.forEach((item: any) => {
        if (item.submenu && item.submenu.length === 0) item.submenu = undefined;
      });
      setCmsContent(prev => ({ ...prev, links: organized }));
    }

    // 2. Load Global Header Content
    const data = await getPageContent("global-header");
    if (data && data.site_sections) {
      const headerSection = data.site_sections.find((s: any) => 
        (s.section_key === 'dynamic-layout' || s.section_key === 'navbar') && s.is_visible
      );
      if (headerSection) {
        const content = headerSection.content;
        setCmsContent(prev => ({ ...prev, ...content }));
      }
    }
  };

  const defaultLinks = [
    { label: "Início", href: "/", route: true },
    { 
      label: "Serviços", 
      href: "#", 
      submenu: [
        { label: "Escritório Privativo", href: "/escritorio-privativo", route: true },
        { label: "Consultório Privativo", href: "/consultorio-privativo", route: true },
        { label: "Auditório Modular", href: "/auditorio-modular", route: true },
        { label: "Endereço Virtual", href: "/endereco-virtual", route: true },
      ]
    },
    { label: "Unidades", href: "/unidades", route: true },
    { label: "Institucional", href: "/institucional", route: true },
    { label: "Contato", href: "/#contato" },
  ];

  const links = cmsContent?.links || defaultLinks;
  const logoTop = cmsContent?.logo_text_top || "CoWorking";
  const logoBottom = cmsContent?.logo_text_bottom || "013";
  const phone = cmsContent?.phone || "(13) 98805-0358";
  const phoneHref = cmsContent?.phone_href || "tel:13988050358";
  const logoIconUrl = cmsContent?.logo_icon || logoIconUrlDefault;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-md border-b border-border"
          : "bg-[#002f5e]"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <Link to="/" className="flex items-center gap-2 group relative z-10">
          <img src={logoIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
          <div className="flex flex-col leading-[0.8] items-start">
            <span className="text-[14px] font-heading font-semibold tracking-tight text-orange-500">
              {logoTop}
            </span>
            <h1 className={`text-3xl font-heading font-extrabold transition-colors ${
              scrolled ? "text-black" : "text-white"
            } -mt-1`}>
              {logoBottom}
            </h1>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {links.map((link: any) => (
            <div key={link.label} className="relative">
              {link.submenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none ${
                        scrolled ? "text-foreground hover:text-orange-500" : "text-white hover:text-orange-500"
                      }`}
                    >
                      {link.label} <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl border border-slate-100 shadow-xl">
                    {link.submenu.map((sub: any) => (
                      <DropdownMenuItem key={sub.href} asChild>
                        {sub.route ? (
                          <Link
                            to={sub.href}
                            target={sub.target}
                            className="w-full cursor-pointer px-3 py-2 text-sm text-slate-700 hover:text-orange-500 rounded-lg transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ) : (
                          <a
                            href={sub.href}
                            target={sub.target}
                            className="w-full cursor-pointer px-3 py-2 text-sm text-slate-700 hover:text-orange-500 rounded-lg transition-colors"
                          >
                            {sub.label}
                          </a>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : link.route ? (
                <Link
                  to={link.href}
                  target={link.target}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? "text-foreground hover:text-orange-500" : "text-white hover:text-orange-500"
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  target={link.target}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? "text-foreground hover:text-orange-500" : "text-white hover:text-orange-500"
                  }`}
                >
                  {link.label}
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href={phoneHref}
            className={`flex items-center gap-2 text-sm font-medium ${
              scrolled ? "text-foreground" : "text-white"
            }`}
          >
            <Phone className="w-4 h-4 text-primary" />
            {phone}
          </a>
          <Button onClick={() => setReservaOpen(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold px-6">
            <Calendar className="w-4 h-4 mr-2" />
            Reservar
          </Button>

        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`lg:hidden ${scrolled ? "text-foreground" : "text-white"}`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-background border-t border-border px-4 pb-4">
          {links.map((link: any) => (
            <div key={link.label}>
              {link.submenu ? (
                <>
                  <div className="py-3 text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{link.label}</div>
                  {link.submenu.map((sub: any) => (
                    <Link
                      key={sub.href}
                      to={sub.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 pl-4 text-sm font-medium text-foreground hover:text-orange-500"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </>
              ) : link.route || link.href.startsWith('/') ? (
                <Link
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 text-sm font-medium text-foreground hover:text-orange-500"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 text-sm font-medium text-foreground hover:text-orange-500"
                >
                  {link.label}
                </a>
              )}
            </div>
          ))}
          <Button
            onClick={() => { setIsOpen(false); setReservaOpen(true); }}
            className="w-full mt-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Reservar
          </Button>

        </div>
      )}
      <ReservaDialog open={reservaOpen} onOpenChange={setReservaOpen} />
    </nav>
  );
};

export default Navbar;