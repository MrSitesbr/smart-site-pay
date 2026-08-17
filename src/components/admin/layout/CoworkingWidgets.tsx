import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { WIDGET_REGISTRY } from "../WidgetRegistry";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const UnitsWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .limit(content.limit || 6);
      
      if (!error && data) setUnits(data);
      setLoading(false);
    };
    fetchUnits();
  }, [content.limit]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-2xl"></div>)}
  </div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {units.map((unit) => (
        <div key={unit.id} className="bg-white rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all border border-brand-gray/20">
          <div className="h-48 overflow-hidden relative">
            <img 
              src={unit.foto_url || "https://images.unsplash.com/photo-1497366216548-37526070297c"} 
              alt={unit.nome}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute top-4 right-4 bg-brand-orange text-white text-[10px] font-black px-3 py-1 rounded-full">
              UNIDADE
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-black text-brand-blue-dark mb-2 uppercase tracking-tight">{unit.nome}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 font-medium">{unit.endereco}</p>
            <a href={`/unidades/${unit.id}`} className="inline-flex items-center text-brand-orange font-black text-xs uppercase tracking-widest hover:gap-2 transition-all">
              Ver Detalhes <span className="ml-2">→</span>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PlansWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .limit(content.limit || 3);
      
      if (!error && data) setPlans(data);
      setLoading(false);
    };
    fetchPlans();
  }, [content.limit]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-80 bg-muted rounded-3xl"></div>)}
  </div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {plans.map((plan) => (
        <div key={plan.id} className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-transparent hover:border-brand-orange transition-all relative overflow-hidden flex flex-col">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-brand-blue-dark mb-2 uppercase tracking-tighter">{plan.nome}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-brand-orange font-black text-3xl">R$ {plan.preco}</span>
              <span className="text-muted-foreground text-xs font-bold uppercase">/ mês</span>
            </div>
          </div>
          <div className="flex-1 space-y-3 mb-8">
             <p className="text-muted-foreground text-sm font-medium">{plan.descricao}</p>
             <div className="h-[1px] bg-brand-gray/20 w-full my-4"></div>
             <div className="flex items-center gap-2 text-brand-blue-dark font-bold text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
                {plan.quantidade_horas} Horas Inclusas
             </div>
          </div>
          <button className="w-full py-4 bg-brand-blue-dark text-white font-black rounded-2xl hover:bg-brand-orange transition-colors uppercase tracking-widest text-xs">
            Assinar Agora
          </button>
        </div>
      ))}
    </div>
  );
};

export const RoomsWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleBooking = async (room: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Se não estiver logado, redireciona para login/cadastro com retorno
      navigate(`/auth?redirect=/reservar&sala=${room.id}`);
    } else {
      // Se estiver logado, vai direto para a página de reserva
      navigate(`/reservar?sala=${room.id}`);
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('salas')
        .select('*, unidades(nome)')
        .limit(content.limit || 6);
      
      if (!error && data) setRooms(data);
      setLoading(false);
    };
    fetchRooms();
  }, [content.limit]);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-2xl"></div>)}
  </div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <div key={room.id} className="group relative bg-brand-blue-dark rounded-3xl overflow-hidden shadow-2xl h-80">
          <img 
            src={room.foto_url || room.galeria?.[0] || "https://images.unsplash.com/photo-1497366216548-37526070297c"} 
            alt={room.nome}
            className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-40 transition-all duration-700"
          />
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <div className="mb-2">
              <span className="bg-brand-orange text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
                {room.tipo}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">{room.nome}</h3>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-4">
              {room.unidades?.nome} • Cap. {room.capacidade}
            </p>
            <button 
              onClick={() => handleBooking(room)}
              className="w-fit py-2 px-6 bg-white text-brand-blue-dark font-black rounded-xl hover:bg-brand-orange hover:text-white transition-all uppercase tracking-widest text-[10px]"
            >
              Reservar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const GlobalHeaderWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  const [cmsData, setCmsData] = useState<any>(null);

  useEffect(() => {
    const loadHeaderData = async () => {
      // Prioritize menu from content settings, fallback to main-header slug
      const menuSlug = content?.menu_slug || 'main-header';
      const { data: menuData } = await supabase
        .from('navigation_menus')
        .select('*, items:navigation_items(*)')
        .eq('slug', menuSlug)
        .single();

      const organizedLinks = menuData?.items
        ? menuData.items
            .filter((i: any) => !i.parent_id)
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((root: any) => ({
              label: root.label,
              href: root.url
            }))
        : [];

      setCmsData({
        links: organizedLinks,
        phone: content?.phone || "(13) 98805-0358",
        logoTop: content?.logo_text_top || "CoWorking",
        logoBottom: content?.logo_text_bottom || "013",
        backgroundColor: styles?.backgroundColor || "#002f5e"
      });
    };
    loadHeaderData();
  }, [content, styles]);

  if (!cmsData) return <div className="h-20 bg-[#002f5e] animate-pulse rounded-xl" />;
  
  return (
    <div 
      className="py-6 px-8 shadow-lg rounded-xl overflow-hidden"
      style={{ backgroundColor: cmsData.backgroundColor }}
    >
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Coluna 1: Logo */}
        <div className="flex items-center gap-2 justify-start">
           <img src="/logo-icon.png" alt="Logo" className="h-10 w-auto object-contain" onError={(e) => {
             (e.target as HTMLImageElement).src = "https://smart-site-pay.lovable.app/assets/logo-icon.png";
           }} />
           <div className="flex flex-col leading-[0.8] items-start">
              <span className="text-[14px] font-bold tracking-tight text-orange-500 uppercase">
                {cmsData.logoTop}
              </span>
              <span className="text-3xl font-black text-white tracking-tighter -mt-1">
                {cmsData.logoBottom}
              </span>
           </div>
        </div>

        {/* Coluna 2: Menu */}
        <div className="flex gap-6 text-white/80 text-[10px] font-black uppercase tracking-widest items-center justify-center">
           {cmsData.links.map((link: any, i: number) => (
             <span key={i} className="hover:text-orange-500 cursor-pointer transition-colors whitespace-nowrap">{link.label}</span>
           ))}
           {cmsData.links.length === 0 && <span className="text-[8px] opacity-50 italic">Nenhum menu selecionado</span>}
        </div>

        {/* Coluna 3: Contato e Reserva */}
        <div className="flex items-center gap-4 justify-end">
           <div className="hidden lg:flex items-center gap-2 text-white text-xs font-bold whitespace-nowrap">
              <span className="text-orange-500">📞</span> {cmsData.phone}
           </div>
           <button className="bg-[#0066cc] text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-full hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs">📅</span> Reservar
           </button>
        </div>
      </div>
    </div>
  );
};

export const GlobalFooterWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  const [footerData, setFooterData] = useState<any>(null);

  useEffect(() => {
    const loadFooterData = async () => {
      const { data: menuNav } = await supabase.from('navigation_menus').select('*, items:navigation_items(*)').eq('slug', 'footer-nav').single();
      const { data: menuServ } = await supabase.from('navigation_menus').select('*, items:navigation_items(*)').eq('slug', 'footer-services').single();

      setFooterData({
        nav: menuNav?.items || [],
        services: menuServ?.items || [],
        phone: content?.phone || "(13) 98805-0358",
        logoTop: content?.logo_text_top || "CoWorking",
        logoBottom: content?.logo_text_bottom || "013"
      });
    };
    loadFooterData();
  }, [content]);

  if (!footerData) return <div className="h-64 bg-[#0b0b0b] animate-pulse" />;
  
  return (
    <div className="bg-[#0b0b0b] py-16 px-8 border-t border-white/5 rounded-xl mt-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
             <img src="/logo-icon.png" alt="Logo" className="h-8 w-auto object-contain" onError={(e) => {
               (e.target as HTMLImageElement).src = "https://smart-site-pay.lovable.app/assets/logo-icon.png";
             }} />
             <div className="flex flex-col leading-[0.8] items-start">
                <span className="text-[12px] font-bold tracking-tight text-orange-500 uppercase">
                  {footerData.logoTop}
                </span>
                <span className="text-2xl font-black text-white tracking-tighter -mt-1">
                  {footerData.logoBottom}
                </span>
             </div>
          </div>
          <p className="text-white/40 text-xs font-medium leading-relaxed">
            O melhor espaço de coworking da Baixada Santista. Produtividade e networking em um só lugar.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Menu</h4>
          <ul className="space-y-3 text-white/40 text-xs font-bold uppercase tracking-widest">
            {footerData.nav.map((item: any) => (
              <li key={item.id} className="hover:text-orange-500 cursor-pointer transition-colors">{item.label}</li>
            ))}
            {footerData.nav.length === 0 && (
              <>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Home</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Sobre Nós</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Contato</li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Serviços</h4>
          <ul className="space-y-3 text-white/40 text-xs font-bold uppercase tracking-widest">
            {footerData.services.map((item: any) => (
              <li key={item.id} className="hover:text-orange-500 cursor-pointer transition-colors">{item.label}</li>
            ))}
            {footerData.services.length === 0 && (
              <>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Privativo</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Virtual</li>
                <li className="hover:text-orange-500 cursor-pointer transition-colors">Salas</li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6">Contato</h4>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Santos - SP<br />
            {footerData.phone}<br />
            contato@coworking013.com.br
          </p>
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-white/5 text-center">
        <span className="text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">© 2026 CoWorking 013 - Todos os direitos reservados</span>
      </div>
    </div>
  );
};
