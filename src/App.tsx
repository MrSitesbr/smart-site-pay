import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useParams } from "react-router-dom";
import DynamicPage from "./pages/DynamicPage";
import Blog from "./pages/Blog";
import ArtigoIndividual from "./pages/ArtigoIndividual";
import Reservar from "./pages/Reservar";
import CalendarioPublico from "./pages/CalendarioPublico";
import Contratar from "./pages/Contratar";
import Painel from "./pages/Painel";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminUnidadeDetalhe from "./components/admin/AdminUnidadeDetalhe";
import AdminUnidadeFormPage from "./components/admin/AdminUnidadeFormPage";
import AdminSalaDetalhe from "./components/admin/AdminSalaDetalhe";
import AdminSalaFormPage from "./components/admin/AdminSalaFormPage";
import AdminPlanoDetalhe from "./components/admin/AdminPlanoDetalhe";
import AdminClienteCorpDetalhe from "./components/admin/AdminClienteCorpDetalhe";
import AuthAdmin from "./pages/AuthAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DynamicPageWrapper = () => {
  const { unidadeId } = useParams<{ unidadeId: string }>();
  return <DynamicPage unidadeId={unidadeId} />;
};

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Main Dynamic Pages */}
          <Route path="/" element={<DynamicPage />} />
          <Route path="/unidades/:unidadeId" element={<DynamicPageWrapper />} />
          <Route path="/institucional" element={<DynamicPage />} />
          <Route path="/unidades" element={<DynamicPage />} />
          <Route path="/escritorio-privativo" element={<DynamicPage />} />
          <Route path="/auditorio-modular" element={<DynamicPage />} />
          <Route path="/consultorio-privativo" element={<DynamicPage />} />
          <Route path="/endereco-virtual" element={<DynamicPage />} />
          <Route path="/servicos" element={<DynamicPage />} />
          <Route path="/contatos" element={<DynamicPage />} />
          <Route path="/contato" element={<DynamicPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<ArtigoIndividual />} />
          
          
          {/* Functional Pages */}
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/reservar/calendario" element={<CalendarioPublico />} />
          <Route path="/contratar" element={<Contratar />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/admin/unidades/novo" element={<AdminUnidadeFormPage />} />
          <Route path="/admin/unidades/:id/editar" element={<AdminUnidadeFormPage />} />
          <Route path="/admin/unidades/:id" element={<AdminUnidadeDetalhe />} />
          <Route path="/admin/unidades/:unidadeId/salas/novo" element={<AdminSalaFormPage />} />
          <Route path="/admin/unidades/salas/:id/editar" element={<AdminSalaFormPage />} />
          <Route path="/admin/unidades/sala/:id" element={<AdminSalaDetalhe />} />
          <Route path="/admin/planos/:id" element={<AdminPlanoDetalhe />} />
          <Route path="/admin/clientes-corp/:id" element={<AdminClienteCorpDetalhe />} />
          <Route path="/auth-admin" element={<AuthAdmin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

