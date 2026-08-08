import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Reservar from "./pages/Reservar";
import Contratar from "./pages/Contratar";
import Painel from "./pages/Painel";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AuthAdmin from "./pages/AuthAdmin";
import NotFound from "./pages/NotFound";
import Institutional from "./pages/Institutional";
import Ambientes from "./pages/Ambientes";
import EscritorioPrivativo from "./pages/EscritorioPrivativo";
import AuditorioModular from "./pages/AuditorioModular";
import ConsultorioPrivativo from "./pages/ConsultorioPrivativo";
import EnderecoVirtual from "./pages/EnderecoVirtual";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/institucional" element={<Institutional />} />
          <Route path="/ambientes" element={<Ambientes />} />
          <Route path="/escritorio-privativo" element={<EscritorioPrivativo />} />
          <Route path="/auditorio-modular" element={<AuditorioModular />} />
          <Route path="/consultorio-privativo" element={<ConsultorioPrivativo />} />
          <Route path="/endereco-virtual" element={<EnderecoVirtual />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/contratar" element={<Contratar />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth-admin" element={<AuthAdmin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
