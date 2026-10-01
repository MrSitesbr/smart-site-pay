import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase, 
  DollarSign, 
  BarChart3, 
  Building2, 
  FileText, 
  Settings, 
  BookOpen,
  ChevronDown,
  ClipboardList,
  UserPlus,
  Globe,
  Settings2,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface NavSubItem {
  title: string;
  id: string;
}

interface NavItem {
  title: string;
  id?: string;
  icon: any;
  items?: NavSubItem[];
}

export default function AdminSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();

  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    localStorage.removeItem("admin_bypass");
    navigate("/auth-admin", { replace: true });
  }

  const menuItems: NavItem[] = [
    { 
      title: "Calendário", 
      icon: Calendar,
      items: [
        { title: "Calendário Geral", id: "calendario" },
        { title: "Reservas", id: "reservas" },
      ]
    },
    { 
      title: "CRM", 
      icon: Users,
      items: [
        { title: "Leads de contratação", id: "clientes" },
        { title: "Empresas clientes", id: "clientes_corp" },
      ]
    },
    { 
      title: "Unidades", 
      icon: Building2,
      items: [
        { title: "Gerenciar Unidades", id: "unidades" },
        { title: "Salas", id: "unidades" }, // Na mesma tela, mas com foco em salas se puder scrollar
      ]
    },
    { 
      title: "Planos", 
      icon: ClipboardList,
      items: [
        { title: "Planos", id: "planos_horas" },
        { title: "Locação Fixa", id: "locacao_fixa" },
      ]
    },
    { 
      title: "ERP & Operações", 
      icon: Briefcase,
      items: [
        { title: "Contratações", id: "contratos" },
        { title: "ERP Ocupação", id: "erp" },
      ]
    },
    { 
      title: "Financeiro", 
      icon: DollarSign,
      items: [
        { title: "Financeiro Geral", id: "financeiro" },
        { title: "Repasses Woba", id: "woba" },
        { title: "Pendências", id: "pendencias" },
      ]
    },
    { 
      title: "Marketing / Site", 
      icon: Globe,
      items: [
        { title: "Informações Globais", id: "paginas_fixos" },
        { title: "Páginas do Site", id: "paginas" },
        { title: "Menus de Navegação", id: "menus" },
        { title: "Artigos (Blog)", id: "artigos" },
        { title: "Serviços", id: "servicos" },
        { title: "Mídias", id: "midias" },
        { title: "SEO & Scripts", id: "seo" },
      ]
    },
    { 
      title: "Configurações", 
      icon: Settings,
      items: [
        { title: "Configurações Gerais", id: "configuracoes" },
        { title: "Manual do Painel", id: "documentacao" },
        { title: "Suporte", id: "suporte" },
        { title: "Roteiro Construtor Dev", id: "docs_ia" },
      ]
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-brand-blue-dark/10 bg-[#2c3338] text-[#eee]">
      <SidebarContent className="bg-[#2c3338]">
        <div className="flex items-center justify-between py-4 px-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden">
            <img src="/assets/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col leading-none text-left">
              <span className="font-heading font-bold text-[12px] text-[#eee]">CoWorking</span>
              <span className="font-heading font-bold text-[28px] leading-[0.8] text-brand-orange">013</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={state === "expanded" ? "Recolher menu lateral" : "Expandir menu lateral"}
            title={state === "expanded" ? "Recolher menu lateral" : "Expandir menu lateral"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#eee] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            {state === "expanded" ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible defaultOpen={item.items.some(sub => sub.id === activeTab)} className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full flex items-center justify-between px-4 py-2.5 text-[#eee] hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-4 border-l border-white/10 mt-1 space-y-1">
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                onClick={() => onTabChange(subItem.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 transition-colors rounded-md ${
                                  activeTab === subItem.id ? "bg-brand-orange text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <span className="text-xs font-medium">{subItem.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id!)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-brand-orange hover:text-white ${
                        activeTab === item.id ? "bg-brand-orange text-white" : "text-[#eee] hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-[#2c3338] border-t border-white/10 p-4 space-y-2">
        <button
          onClick={() => navigate("/")}
          aria-label="Ver Site"
          title="Ver Site"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[#eee] hover:bg-white/10 transition-colors rounded-md text-sm font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="group-data-[collapsible=icon]:hidden">Ver Site</span>
        </button>
        <button
          onClick={logout}
          aria-label="Sair"
          title="Sair"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors rounded-md text-sm font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
