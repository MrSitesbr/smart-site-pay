import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Calendar, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png.asset.json";
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
    { label: "Início", href: "/", route: true },
    { label: "Institucional", href: "/institucional", route: true },
    { label: "Ambientes", href: "/ambientes", route: true },
    { label: "Endereço Virtual", href: "/endereco-virtual", route: true },
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
        <a href="#home" className="flex items-center gap-2 group">
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
            href="tel:13997440130"
            className={`flex items-center gap-2 text-sm font-medium ${
              scrolled ? "text-foreground" : "text-white"
            }`}
          >
            <Phone className="w-4 h-4 text-primary" />
            (13) 99744-0130
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