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
  return (
    <div className="bg-brand-blue-dark py-4 px-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
         <div className="w-8 h-8 bg-brand-orange rounded-lg"></div>
         <span className="text-white font-black">HEADER</span>
      </div>
      <div className="flex gap-4 text-white/60 text-xs font-bold uppercase">
         <span>Início</span>
         <span>Serviços</span>
         <span>Contato</span>
      </div>
    </div>
  );
};

export const GlobalFooterWidget: React.FC<{ content: any; styles: any }> = ({ content, styles }) => {
  return (
    <div className="bg-[#1a1a1a] py-8 px-8 border-t border-white/10 text-center">
      <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Global Footer Section</span>
    </div>
  );
};
