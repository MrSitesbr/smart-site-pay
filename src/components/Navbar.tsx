import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Calendar, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-coworking.png";
import ReservaDialog from "@/components/ReservaDialog";


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Início", href: "#home" },
    { label: "Soluções", href: "#solucoes" },
    { label: "Planos", href: "#planos" },
    { label: "Institucional", href: "#institucional" },
    { label: "Contato", href: "#contato" },
    { label: "Área do Cliente", href: "/painel", route: true },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md shadow-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <a href="#home" className="flex items-center gap-3">
          <img src={logo} alt="Coworking Kennedy" className="w-11 h-11 object-contain" />
          <div className="hidden sm:block">
            <span className="block text-xs font-body font-semibold text-primary leading-none">CoWorking</span>
            <span className={`block font-heading font-black text-lg leading-none -mt-0.5 ${scrolled ? "text-foreground" : "text-white"}`}>
              Kennedy
            </span>
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {links.map((link) =>
            (link as any).route ? (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  scrolled ? "text-foreground hover:text-primary" : "text-white hover:text-primary"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  scrolled ? "text-foreground hover:text-primary" : "text-white hover:text-primary"
                }`}
              >
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="tel:13992037957"
            className={`flex items-center gap-2 text-sm font-medium ${
              scrolled ? "text-foreground" : "text-white"
            }`}
          >
            <Phone className="w-4 h-4 text-primary" />
            (13) 9.9203-7957
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
          {links.map((link) =>
            (link as any).route ? (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 py-3 text-sm font-medium text-foreground hover:text-primary"
              >
                <LayoutDashboard className="w-4 h-4" />
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-3 text-sm font-medium text-foreground hover:text-primary"
              >
                {link.label}
              </a>
            )
          )}
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
