import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DynamicPage from "./pages/DynamicPage";
import Reservar from "./pages/Reservar";
import Contratar from "./pages/Contratar";
import Painel from "./pages/Painel";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminUnidadeDetalhe from "./components/admin/AdminUnidadeDetalhe";
import AdminSalaDetalhe from "./components/admin/AdminSalaDetalhe";
import AdminPlanoDetalhe from "./components/admin/AdminPlanoDetalhe";
import AdminClienteCorpDetalhe from "./components/admin/AdminClienteCorpDetalhe";
import AuthAdmin from "./pages/AuthAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main Dynamic Pages */}
          <Route path="/" element={<DynamicPage />} />
          <Route path="/institucional" element={<DynamicPage />} />
          <Route path="/unidades" element={<DynamicPage />} />
          <Route path="/escritorio-privativo" element={<DynamicPage />} />
          <Route path="/auditorio-modular" element={<DynamicPage />} />
          <Route path="/consultorio-privativo" element={<DynamicPage />} />
          <Route path="/endereco-virtual" element={<DynamicPage />} />
          
          {/* Functional Pages */}
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/contratar" element={<Contratar />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/admin/unidades/:id" element={<AdminUnidadeDetalhe />} />
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

