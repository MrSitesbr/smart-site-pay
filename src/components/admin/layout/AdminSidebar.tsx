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
  SidebarFooter
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
  LogOut
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const menuItems: NavItem[] = [
    { 
      title: "Calendário", 
      icon: Calendar,
      items: [
        { title: "Calendário Geral", id: "calendario" },
        { title: "Reservas", id: "reservas" },
        { title: "Visitas", id: "visitantes" },
      ]
    },
    { 
      title: "CRM", 
      icon: Users,
      items: [
        { title: "CRM Leads", id: "clientes" },
        { title: "Clientes", id: "clientes_corp" },
        { title: "Colaboradores", id: "funcionarios" },
        { title: "Visitantes", id: "visitantes_crm" },
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
      ]
    },
    { 
      title: "Marketing / Site", 
      icon: Globe,
      items: [
        { title: "Header & Footer (Fixos)", id: "paginas_fixos" },
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
        { title: "Proxy de Mídia (Forçar Sinc)", id: "media_proxy" },
        { title: "Roteiro Construtor Dev", id: "docs_ia" },
      ]
    },
  ];

  return (
    <Sidebar className="border-r border-brand-blue-dark/10 bg-[#2c3338] text-[#eee]">
      <SidebarContent className="bg-[#2c3338]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 px-4 py-4 font-black uppercase text-[10px] tracking-widest">
            Admin CoWorking
          </SidebarGroupLabel>
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
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[#eee] hover:bg-white/10 transition-colors rounded-md text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Ver Site</span>
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("admin_bypass");
            window.location.href = "/auth-admin";
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors rounded-md text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
