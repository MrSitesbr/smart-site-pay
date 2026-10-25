import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CalendarPlus, ClipboardList, Contact, CreditCard, Loader2, Users } from "lucide-react";
import UsoPlanoBarras from "@/components/planos/UsoPlanoBarras";
import { fmtData, fmtNumeroCadastro, type ResumoPlano } from "@/lib/planosApi";

const STATUS_LABEL: Record<string, string> = { pendente: "Aguardando confirmação", confirmada: "Confirmada", realizada: "Realizada" };

type Props = {
  cliente: any;
  resumo: ResumoPlano | null;
  carregandoResumo: boolean;
  reservas: any[];
  contadores: { colaboradores: number; visitantes: number; solicitacoes: number };
  onAbrir: (aba: string) => void;
};

/** Visão geral do cliente: plano, próximas reservas e atalhos. */
export default function PainelDashboard({ cliente, resumo, carregandoResumo, reservas, contadores, onAbrir }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const proximas = reservas
    .filter((r) => r.status !== "cancelada" && String(r.data) >= hoje)
    .sort((a, b) => `${a.data}${a.hora_inicio}`.localeCompare(`${b.data}${b.hora_inicio}`))
    .slice(0, 5);
  const semPlano = !resumo || resumo.status === "sem_plano";
  const nome = cliente?.responsavel_nome?.split(" ")[0] || cliente?.razao_social || "";

  const atalhos = [
    { label: "Colaboradores", valor: contadores.colaboradores, icon: Users, aba: "colaboradores" },
    { label: "Visitantes", valor: contadores.visitantes, icon: Contact, aba: "visitantes" },
    { label: "Solicitações", valor: contadores.solicitacoes, icon: ClipboardList, aba: "lista" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading font-black text-2xl">Olá{nome ? `, ${nome}` : ""}!</h2>
          <p className="text-sm text-muted-foreground">
            {cliente?.razao_social || "Sua empresa"}{cliente?.numero_cadastro ? ` · Cadastro ${fmtNumeroCadastro(cliente.numero_cadastro)}` : ""}
          </p>
        </div>
        <Button onClick={() => onAbrir("calendario")}><CalendarPlus className="mr-2 h-4 w-4" />Reservar horário</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Meu plano</p>
              <h3 className="font-heading font-black text-xl">{semPlano ? "Nenhum plano ativo" : resumo?.plano_nome}</h3>
            </div>
            <Button size="sm" variant="outline" onClick={() => onAbrir("plano")}><CreditCard className="mr-2 h-4 w-4" />Detalhes</Button>
          </div>
          {carregandoResumo && !resumo ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : semPlano ? (
            <p className="text-sm text-muted-foreground">Sem plano ativo, suas reservas são cobradas como avulso. Veja as opções em "Meu plano".</p>
          ) : (
            <UsoPlanoBarras resumo={resumo!} />
          )}
        </Card>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {atalhos.map((a) => (
            <Card key={a.aba} role="button" tabIndex={0} onClick={() => onAbrir(a.aba)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAbrir(a.aba)}
              className="flex cursor-pointer flex-col items-center gap-1 p-3 text-center transition-colors hover:border-secondary lg:flex-row lg:gap-3 lg:p-4 lg:text-left">
              <a.icon className="h-5 w-5 shrink-0 text-secondary" />
              <div className="min-w-0">
                <p className="font-heading text-xl font-black leading-none">{a.valor}</p>
                <p className="truncate text-xs text-muted-foreground">{a.label}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-heading font-bold"><CalendarDays className="h-4 w-4" />Próximas reservas</h3>
          <Button size="sm" variant="ghost" onClick={() => onAbrir("calendario")}>Ver calendário</Button>
        </div>
        {proximas.length ? (
          <ul className="divide-y">
            {proximas.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>{fmtData(r.data)} · {String(r.hora_inicio).slice(0, 5)}–{String(r.hora_fim).slice(0, 5)}</span>
                <Badge variant={r.status === "confirmada" ? "default" : "secondary"}>{STATUS_LABEL[r.status] || r.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma reserva agendada. Use "Reservar horário" para agendar.</p>
        )}
      </Card>
    </div>
  );
}
