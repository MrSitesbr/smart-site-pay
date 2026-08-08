import { Instagram, Linkedin, Youtube, MessageCircle, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-cow013-v2.png.asset.json";

const Footer = () => {
  const cols = [
    {
      title: "Navegação",
      links: [
        { label: "Início", href: "#home" },
        { label: "Soluções", href: "#solucoes" },
        { label: "Planos", href: "#planos" },
        { label: "Institucional", href: "#institucional" },
        { label: "Contato", href: "#contato" },
        { label: "Painel do cliente", href: "/painel", route: true },
        { label: "Admin", href: "/auth-admin", route: true },
      ],
    },
    {
      title: "Soluções",
      links: [
        { label: "Salas Privativas", href: "#solucoes" },
        { label: "Sala de Reunião", href: "#solucoes" },
        { label: "Estações de Trabalho", href: "#solucoes" },
        { label: "Endereço Comercial", href: "#solucoes" },
        { label: "Virtual Office", href: "#solucoes" },
      ],
    },
  ];

  return (
    <footer className="bg-brand-blue-dark text-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo.url} alt="Coworking 013" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              O seu espaço de trabalho e networking na Praia Grande.
            </p>
            <div className="flex gap-3">
              {[Instagram, MessageCircle, Youtube, Linkedin].map((Icon, i) => (
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
                        <LayoutDashboard className="w-3.5 h-3.5" /> {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-white/60 hover:text-secondary transition-colors">
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
              <li>(13) 9.9744-0130</li>
              <li>contato@coworking013.com.br</li>
              <li>Av. Presidente Kennedy, 5214<br />Vila Tupi - Praia Grande - SP</li>
              <li>Seg-Sex: 09h às 17h</li>
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
