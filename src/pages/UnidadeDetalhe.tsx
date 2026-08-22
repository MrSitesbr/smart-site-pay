import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PageRenderer } from "@/components/PageRenderer";
import { getPageContent } from "@/lib/cms";
import { SectionData } from "@/types/page-builder";
import { supabase } from "@/integrations/supabase/client";

const UnidadeDetalhe = () => {
  const { id } = useParams();
  const [layout, setLayout] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      // First try to find a page linked to this specific unit
      const pageData = await getPageContent(location.pathname, id);
      
      if (pageData && pageData.site_sections) {
        let dynamicSection = pageData.site_sections.find((s: any) => 
          s.section_key === 'dynamic-layout' && s.is_visible
        );

        if (!dynamicSection) {
          dynamicSection = pageData.site_sections.find((s: any) => 
            s.is_visible && s.content?.layout
          );
        }
        
        if (dynamicSection?.content?.layout) {
          setLayout(dynamicSection.content.layout);
          setLoading(false);
          return;
        }
      }

      // Fallback: If no specific page exists for this unit, we could show a default template
      // For now, let's try to fetch unit data directly if layout is empty
      const { data: unit } = await supabase.from('unidades').select('*').eq('id', id).single();
      
      if (unit) {
        // Create a basic layout if none exists in CMS
        const defaultLayout: SectionData[] = [
          {
            id: 'unit-hero',
            type: 'hero',
            settings: { fullWidth: true, backgroundColor: '#002f5e' },
            columns: [
              {
                id: 'c1',
                widthPercentage: 100,
                widgets: [
                  {
                    id: 'w1',
                    type: 'heading',
                    content: { text: unit.nome, level: 'h1' },
                    styles: { color: '#ffffff', alignment: 'center' }
                  },
                  {
                    id: 'w2',
                    type: 'text',
                    content: { text: unit.endereco },
                    styles: { color: '#ffffff', alignment: 'center', opacity: 0.8 }
                  }
                ]
              }
            ]
          },
          {
            id: 'unit-content',
            type: 'section',
            settings: { padding: { top: 80, bottom: 80 } },
            columns: [
              {
                id: 'c2',
                widthPercentage: 100,
                widgets: [
                  {
                    id: 'w3',
                    type: 'image',
                    content: { url: unit.foto_url },
                    styles: { borderRadius: 20 }
                  },
                  {
                    id: 'w4',
                    type: 'text',
                    content: { text: unit.descricao || 'Conheça nossa unidade e aproveite a melhor infraestrutura de Santos.' }
                  }
                ]
              }
            ]
          }
        ];
        setLayout(defaultLayout);
      }
      
      setLoading(false);
    };

    loadContent();
    
    const channel = supabase
      .channel('unit-page-changes')
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
  }, [id, location.pathname]);

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

export default UnidadeDetalhe;
