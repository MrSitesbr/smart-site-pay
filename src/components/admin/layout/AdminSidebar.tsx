import { useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { LayoutDashboard, Calendar, Users, Briefcase, DollarSign, BarChart3, Building2, FileText, Settings, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const items = [
    { title: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
    { title: "Calendários", icon: Calendar, id: "calendario" },
    { title: "Contratações", icon: Briefcase, id: "contratos" },
    { title: "Reservas", icon: Calendar, id: "reservas" },
    { title: "CRM Clientes", icon: Users, id: "clientes" },
    { title: "Financeiro", icon: DollarSign, id: "financeiro" },
    { title: "ERP Ocupação", icon: BarChart3, id: "erp" },
    { title: "Repasses Woba", icon: Building2, id: "woba" },
    { title: "Artigos (Blog)", icon: BookOpen, id: "artigos" },
    { title: "Serviços", icon: FileText, id: "servicos" },
    { title: "Unidades", icon: Building2, id: "unidades" },
    { title: "Páginas", icon: FileText, id: "paginas" },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-brand-blue-dark/20 bg-muted/10">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton onClick={() => console.log("Nav to", item.id)}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
