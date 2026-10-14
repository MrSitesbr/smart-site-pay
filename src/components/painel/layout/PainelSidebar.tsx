import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  CalendarDays,
  ClipboardList,
  Contact,
  CreditCard,
  FileText,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  Users,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  id: string;
  title: string;
  icon: any;
  badge?: number;
}

export default function PainelSidebar({ aba, onAbaChange, contadores }: {
  aba: string;
  onAbaChange: (id: string) => void;
  contadores: { colaboradores: number; visitantes: number; solicitacoes: number; canceladas: number };
}) {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  const menuItems: NavItem[] = [
    { id: "dados", title: "Meus dados", icon: UserCog },
    { id: "calendario", title: "Calendário", icon: CalendarDays },
    { id: "colaboradores", title: "Colaboradores", icon: Users, badge: contadores.colaboradores },
    { id: "visitantes", title: "Visitantes", icon: Contact, badge: contadores.visitantes },
    { id: "plano", title: "Meu plano", icon: CreditCard },
    { id: "documentos", title: "Documentos", icon: FileText },
    { id: "suporte", title: "Suporte", icon: LifeBuoy },
    { id: "lista", title: "Minhas solicitações", icon: ClipboardList, badge: contadores.solicitacoes },
    { id: "canceladas", title: "Canceladas", icon: XCircle, badge: contadores.canceladas },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-brand-blue-dark/10 bg-[#2c3338] text-[#eee]">
      <SidebarHeader className="border-b border-white/10 bg-[#2c3338] p-3">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:hidden">
            <img src="/assets/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col leading-none text-left">
              <span className="font-heading font-bold text-[12px] text-[#eee]">Meu</span>
              <span className="font-heading font-bold text-[24px] leading-[0.9] text-brand-orange">Painel</span>
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
      </SidebarHeader>

      <SidebarContent className="bg-[#2c3338]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onAbaChange(item.id)}
                    isActive={aba === item.id}
                    tooltip={item.title}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/10 ${
                      aba === item.id ? "bg-brand-orange text-white hover:bg-brand-orange" : "text-[#eee]"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                    {!!item.badge && <SidebarMenuBadge className="bg-white/10 text-[#eee] group-data-[collapsible=icon]:hidden">{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuButton>
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
          <ExternalLink className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Ver Site</span>
        </button>
        <button
          onClick={logout}
          aria-label="Sair"
          title="Sair"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors rounded-md text-sm font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}