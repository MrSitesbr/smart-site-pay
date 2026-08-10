import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png.asset.json";
import ReservaDialog from "@/components/ReservaDialog";


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Início", href: "/", route: true },
    { label: "Institucional", href: "/institucional", route: true },
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
          <img src={logoIcon.url} alt="Logo" className="h-10 w-auto object-contain" />
          <div className="flex flex-col leading-[0.8] items-start">
            <span className="text-[14px] font-heading font-semibold tracking-tight text-orange-500">
              CoWorking
            </span>
            <h1 className={`text-3xl font-heading font-extrabold transition-colors ${
              scrolled ? "text-black" : "text-white"
            } -mt-1`}>
              013
            </h1>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {links.map((link) => (
            <div key={link.label} className="relative group">
              {link.submenu ? (
                <>
                  <button
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                      scrolled ? "text-foreground hover:text-orange-500" : "text-white hover:text-orange-500"
                    }`}
                  >
                    {link.label} <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    {link.submenu.map((sub) => (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-orange-500 transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : link.route ? (
                <Link
                  to={link.href}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? "text-foreground hover:text-orange-500" : "text-white hover:text-orange-500"
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
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
            href="tel:13997440130"
            className={`flex items-center gap-2 text-sm font-medium ${
              scrolled ? "text-foreground" : "text-white"
            }`}
          >
            <Phone className="w-4 h-4 text-primary" />
            (13) 98805-0358
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
          {links.map((link) => (
            <div key={link.label}>
              {link.submenu ? (
                <>
                  <div className="py-3 text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{link.label}</div>
                  {link.submenu.map((sub) => (
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
              ) : link.route ? (
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