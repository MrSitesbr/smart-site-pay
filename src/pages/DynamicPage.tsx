import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PageRenderer } from "@/components/PageRenderer";
import { getPageContent } from "@/lib/cms";
import { SectionData } from "@/types/page-builder";

const DynamicPage = () => {
  const [layout, setLayout] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      // Desativar cache para carregamento em tempo real
      const pageData = await getPageContent(location.pathname);
      
      if (pageData && pageData.site_sections) {
        const dynamicSection = pageData.site_sections.find((s: any) => s.section_key === 'dynamic-layout');
        if (dynamicSection?.content?.layout) {
          setLayout(dynamicSection.content.layout);
        } else {
          setLayout([]);
        }
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
  }, [location.pathname]);

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
