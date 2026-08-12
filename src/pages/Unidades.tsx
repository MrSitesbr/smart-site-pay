import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PageRenderer } from "@/components/PageRenderer";
import { getPageContent } from "@/lib/cms";
import { SectionData } from "@/types/page-builder";

const Unidades = () => {
  const [layout, setLayout] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      const pageData = await getPageContent("/unidades");
      if (pageData && pageData.site_sections) {
        const dynamicSection = pageData.site_sections.find((s: any) => s.section_key === 'dynamic-layout');
        if (dynamicSection?.content?.layout) {
          setLayout(dynamicSection.content.layout);
        }
      }
      setLoading(false);
    };

    loadContent();
  }, []);

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

export default Unidades;
