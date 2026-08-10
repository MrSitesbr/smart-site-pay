
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";
import { supabase } from "@/integrations/supabase/client";
import { assets } from "@/lib/migration-assets";
import { Skeleton } from "@/components/ui/skeleton";

const Unidades = () => {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('nome');
      
      if (!error && data) {
        setUnidades(data);
      }
      setLoading(false);
    }
    fetchUnidades();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="font-heading font-black text-5xl md:text-7xl text-brand-blue-dark mb-6">
              Nossas <span className="text-secondary">Unidades</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Estrutura completa com unidades estratégicas em Praia Grande para atender seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-[2.5rem]" />
                  <Skeleton className="h-8 w-3/4 mx-auto" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))
            ) : unidades.length > 0 ? (
              unidades.map((unidade) => (
                <div key={unidade.id} className="flex flex-col bg-slate-50 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-64 overflow-hidden relative group">
                    <img 
                      src={unidade.foto_url || assets.images.recepcao} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt={unidade.nome} 
                    />
                  </div>
                  <div className="p-8">
                    <h2 className="font-heading font-bold text-2xl text-brand-blue-dark mb-3">{unidade.nome}</h2>
                    <p className="text-muted-foreground mb-4 text-sm font-medium">{unidade.endereco}</p>
                    <p className="text-slate-600 line-clamp-3">
                      {unidade.descricao || "Unidade equipada com toda a infraestrutura necessária para o seu sucesso profissional."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-muted-foreground italic">
                Nenhuma unidade cadastrada no sistema.
              </div>
            )}
          </div>
        </div>
      </main>

      <ContactSection />
      <Footer />
    </div>
  );
};

export default Unidades;