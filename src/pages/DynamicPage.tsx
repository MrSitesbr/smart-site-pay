import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PageRenderer } from "@/components/PageRenderer";
import { getPageContent } from "@/lib/cms";
import { SectionData } from "@/types/page-builder";
import { supabase } from "@/integrations/supabase/client";
import { unidadeDetailPageLayout, unidadesPageLayout } from "@/lib/defaultPageLayouts";

const getVisibleLayout = (sections: any[] | null | undefined): SectionData[] => {
  if (!Array.isArray(sections)) return [];

  return [...sections]
    .filter((section) => section?.is_visible !== false && Array.isArray(section?.content?.layout))
    .sort((first, second) => (first.order_index ?? 0) - (second.order_index ?? 0))
    .flatMap((section) => section.content.layout.filter(Boolean));
};

const DynamicPage = ({ isAdmin = false, unidadeId }: { isAdmin?: boolean, unidadeId?: string }) => {
  const [layout, setLayout] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      const pageData = await getPageContent(location.pathname, unidadeId);
      
      if (pageData && pageData.site_sections) {
        const visibleLayout = getVisibleLayout(pageData.site_sections);

        if (visibleLayout.length > 0) {
          setLayout(visibleLayout);
        } else if (unidadeId) {
          const { data: unidade } = await supabase
            .from("unidades")
            .select("id, nome, descricao, endereco, foto_url, galeria, servicos_infra")
            .eq("id", unidadeId)
            .maybeSingle();
          setLayout(unidade ? unidadeDetailPageLayout(unidade) : []);
        } else if (location.pathname === "/unidades") {
          setLayout(unidadesPageLayout);
        } else {
          setLayout([]);
        }
      } else if (unidadeId) {
        const { data: unidade } = await supabase
          .from("unidades")
          .select("id, nome, descricao, endereco, foto_url, galeria, servicos_infra")
          .eq("id", unidadeId)
          .maybeSingle();
        setLayout(unidade ? unidadeDetailPageLayout(unidade) : []);
      } else if (location.pathname === "/unidades") {
        setLayout(unidadesPageLayout);
      } else {
        setLayout([]);
      }
      setLoading(false);
    };

    loadContent();
    
    // Inscrição em tempo real para mudanças na tabela site_sections
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_sections'
        },
        () => {
          loadContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.pathname, unidadeId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
          </div>
        ) : (
          <PageRenderer layout={layout} />
        )}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default DynamicPage;
