import React, { useEffect, useState } from "react";
import { Building2, MapPin, Mail, Check, ArrowRight } from "lucide-react";
import virtualAddressPeople from "@/assets/home/endereco-virtual-profissionais.png.asset.json";

const BENEFICIOS = [
  { icon: Building2, text: "Endereço fiscal para abertura ou transferência do CNPJ" },
  { icon: MapPin, text: "Endereço comercial para site, cartões e divulgação" },
  { icon: Mail, text: "Recebimento e gestão de correspondências" },
  { icon: Check, text: "Mais credibilidade sem o custo de um escritório físico" },
];

const virtualAddressPeopleUrl = virtualAddressPeople.url.startsWith('/__l5e/assets-v1/')
  ? `https://smart-site-pay.lovable.app${virtualAddressPeople.url}`
  : virtualAddressPeople.url;

function VirtualAddressSlide() {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl bg-brand-blue-dark px-5 sm:px-8 lg:px-12">
      <div className="grid h-full w-full grid-rows-[minmax(0,1fr)_130px] gap-1 sm:grid-rows-[minmax(0,1fr)_190px] sm:gap-3 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-1 lg:gap-10">
        <div className="flex min-h-0 translate-y-5 flex-col justify-center space-y-2.5 py-4 sm:translate-y-0 sm:space-y-4 sm:py-8 lg:py-14">
          <div className="inline-flex items-center w-max gap-3">
            <div className="h-1 w-10 bg-brand-orange rounded-full" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange sm:text-xs">Endereço Virtual</span>
          </div>
          <h2 className="max-w-xl text-[22px] font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
            Endereço fiscal e comercial para a sua empresa
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Tenha um endereço profissional para registrar seu CNPJ, divulgar sua empresa e preservar a privacidade da sua casa.
          </p>
          <ul className="space-y-1 sm:space-y-2">
            {BENEFICIOS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-xs leading-snug text-white sm:text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <a href="/endereco-virtual" className="inline-flex w-max items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-orange/90 sm:py-2.5 sm:text-sm">
            Conheça o Endereço Virtual <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="flex h-full min-h-0 items-end justify-center self-end overflow-hidden">
          <img
            src={virtualAddressPeopleUrl}
            alt="Profissionais atendidos pelo serviço de endereço virtual do Coworking 013"
            className="block h-full w-full max-w-[540px] object-contain object-bottom"
          />
        </div>
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
    <div className="relative z-10 h-full w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid h-full overflow-hidden">
        {slides.map((s, idx) => (
          <div key={idx} aria-hidden={idx !== i}
            className={`col-start-1 row-start-1 h-full transition-all duration-700 ease-out ${idx === 1 ? "bg-brand-blue-dark" : ""} ${idx === i ? "opacity-100 translate-x-0 pointer-events-auto" : `opacity-0 pointer-events-none ${idx < i ? "-translate-x-12" : "translate-x-12"}`}`}>
            {s}
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, idx) => (
          <button key={idx} type="button" aria-label={`Ir para o destaque ${idx + 1}`} onClick={() => setI(idx)}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-brand-orange" : "w-2 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
