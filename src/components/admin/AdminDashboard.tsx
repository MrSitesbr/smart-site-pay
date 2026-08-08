import { Card } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard({ reservas, contratos }: { reservas: any[], contratos: any[] }) {
  const stats = [
    { label: "Clientes Ativos", value: "58", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Reservas Mês", value: (reservas.length + 12).toString(), icon: Calendar, color: "text-brand-orange", bg: "bg-orange-50" },
    { label: "Taxa Ocupação", value: "82%", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pendentes", value: reservas.filter(r => r.status === 'pendente').length.toString(), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 border-none shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-black text-brand-blue-dark">{stat.value}</h3>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-black text-brand-blue-dark">Atividades Recentes</h3>
            <Badge variant="outline" className="font-bold">Ver tudo</Badge>
          </div>
          <div className="space-y-6">
            {reservas.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-start gap-4 pb-4 border-b border-dashed last:border-0 last:pb-0">
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${r.status === 'confirmada' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {r.status === 'confirmada' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-blue-dark">Nova reserva: {r.nome}</p>
                  <p className="text-xs text-muted-foreground">{r.ambiente} · {new Date(r.data).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Há 2 horas</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-brand-blue-dark text-white">
          <h3 className="text-lg font-heading font-black mb-2">Status do Sistema</h3>
          <p className="text-white/60 text-sm mb-6">Todos os serviços estão operacionais.</p>
          
          <div className="space-y-4">
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Sincronização Google Agenda</span>
              <Badge className="bg-green-500 hover:bg-green-500 border-none">Online</Badge>
            </div>
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Pagamentos PIX/Stripe</span>
              <Badge className="bg-green-500 hover:bg-green-500 border-none">Online</Badge>
            </div>
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Notificações WhatsApp</span>
              <Badge className="bg-green-500 hover:bg-green-500 border-none">Online</Badge>
            </div>
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Site Publicado (Vercel)</span>
              <Badge className="bg-green-500 hover:bg-green-500 border-none">Online</Badge>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Última atualização: agora mesmo</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
