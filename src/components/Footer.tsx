import { Instagram, Linkedin, Youtube, MessageCircle, LayoutDashboard, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png.asset.json";
import { assets } from "@/lib/migration-assets";

const Footer = () => {
  const cols = [
    {
      title: "Navegação",
      links: [
        { label: "Início", href: "/", route: true },
        { label: "Institucional", href: "/institucional", route: true },
        { label: "Unidades", href: "/unidades", route: true },
        { label: "Contato", href: "#contato" },
        { label: "Área do Cliente", href: "/painel", route: true },
        { label: "Admin", href: "/auth-admin", route: true },
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

  return (
    <footer className="bg-brand-blue-dark text-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logoIcon.url} alt="Logo" className="h-8 w-auto object-contain" />
              <div className="flex flex-col leading-[0.8] items-start">
                <span className="text-[14px] font-heading font-semibold tracking-tight text-orange-500">
                  CoWorking
                </span>
                <h1 className="text-3xl font-heading font-extrabold text-white -mt-1">
                  013
                </h1>
              </div>
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
              <li>(13) 98805-0358</li>
              <li>contato@coworking013.com.br</li>
              <li>Av. P. Costa e Silva, 609 - S. 906<br />Boqueirão - Praia Grande - SP</li>
              <li>R. São Caetano, 86<br />Boqueirão - Praia Grande - SP</li>
              <li>R. Jaú, 955 Conj. 26<br />Boqueirão - Praia Grande - SP</li>
              <li>Seg. à Sex.: 08h às 21h</li>
              <li>Sáb: 08h às 12h</li>
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
