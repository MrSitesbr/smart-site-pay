import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import IdealParaSection from "@/components/IdealParaSection";

const Ambientes = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20">
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-black text-brand-blue-dark mb-6">
              Nossos Ambientes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conheça os espaços planejados para oferecer o máximo de conforto e produtividade para você e seu negócio.
            </p>
          </div>
          <IdealParaSection />
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Ambientes;
