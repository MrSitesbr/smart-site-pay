import React, { useEffect, useState } from "react";
import { MapPin, FileCheck2, Building2, Mail, ArrowRight } from "lucide-react";

const VANTAGENS = [
  { icon: FileCheck2, t: "Endereço fiscal para CNPJ", d: "Abra ou transfira sua empresa com endereço aceito pela Receita e pela Prefeitura." },
  { icon: Building2, t: "Endereço comercial de prestígio", d: "Mais credibilidade para clientes, sites, cartões e Google Meu Negócio." },
  { icon: Mail, t: "Recebimento de correspondências", d: "Cuidamos das suas cartas e avisamos quando chegarem." },
  { icon: MapPin, t: "Privacidade e economia", d: "Proteja o endereço da sua casa e economize com aluguel." },
];

function VirtualAddressSlide() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 py-16 lg:py-20">
      <div className="grid gap-8 lg:gap-16 items-center lg:grid-cols-2">
        <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center w-max gap-3">
            <div className="h-1 w-10 bg-brand-orange rounded-full" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">Endereço Virtual</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-snug tracking-tight">
            Sua empresa com <span className="text-brand-orange">endereço fiscal e comercial</span> em Santos
          </h2>
          <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-md">
            Formalize seu negócio, ganhe credibilidade e receba correspondências sem pagar por um escritório físico.
          </p>
          <a href="/endereco-virtual" className="inline-flex w-max items-center gap-2 px-6 py-3 bg-brand-orange text-white font-bold text-sm rounded-lg hover:bg-brand-orange/90 transition-colors">
            Conheça o Endereço Virtual <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {VANTAGENS.map(({ icon: Icon, t, d }) => (
            <li key={t} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
              <Icon className="h-6 w-6 text-brand-orange mb-2" />
              <p className="text-sm font-bold text-white">{t}</p>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HeroSlides({ first }: { first: React.ReactNode }) {
  const slides = [first, <VirtualAddressSlide key="ev" />];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 8000);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  return (
    <div className="relative z-10 w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => (
        <div key={idx} className={idx === i ? "animate-fade-in" : "hidden"}>{s}</div>
      ))}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, idx) => (
          <button key={idx} type="button" aria-label={`Ir para o destaque ${idx + 1}`} onClick={() => setI(idx)}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-brand-orange" : "w-2 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
