import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import IdealParaSection from "@/components/IdealParaSection";
import DestaquesProfissionais from "@/components/DestaquesProfissionais";
import InstitucionalSection from "@/components/InstitucionalSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const Index = () => {
  useEffect(() => {
    // Log for debugging login issues on deploy
    console.log("App Index loaded at:", window.location.origin);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <IdealParaSection />
      <DestaquesProfissionais />
      <InstitucionalSection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
