import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Users, Calendar, TrendingUp, AlertCircle, Clock, CheckCircle2, RefreshCw, Loader2, UserPlus, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { reservaEncerrada, statusExibido } from "@/lib/checkin";

type SalaInfo = { nome: string; minutosAbertos: number };
type ClientePendente = { id: string; nome: string; created_at: string };

const minutos = (valor?: string | null) => {
  if (!valor) return 0;
  const [h, m] = valor.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
};
const dataBR = (iso?: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const ATUALIZAR_A_CADA_MS = 60_000;

function corDoStatus(status: string) {
  if (status.startsWith("realizada")) return "bg-emerald-100 text-emerald-700";
  if (status === "confirmada") return "bg-blue-100 text-blue-700";
  if (status === "cancelada") return "bg-red-100 text-red-700";
  if (status.includes("sem check-in")) return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function AdminDashboard({ reservas, onRefresh, onNavigate }: {
  reservas: any[];
  contratos?: any[];
  onRefresh?: () => Promise<void> | void;
  onNavigate?: (tab: string) => void;
}) {
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [clientesPendentes, setClientesPendentes] = useState<ClientePendente[]>([]);
  const [salas, setSalas] = useState<Record<string, SalaInfo>>({});
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [agora, setAgora] = useState(new Date());
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const carregar = useCallback(async (recarregarReservas = false) => {
    setCarregando(true);
    const [clientesResult, salasResult] = await Promise.all([
      supabase.from("clientes_corp").select("id, razao_social, responsavel_nome, status_acesso, created_at").is("deleted_at", null),
      supabase.from("salas").select("id, nome, status, unidades(horario_abertura, horario_fechamento, status)"),
      recarregarReservas ? onRefreshRef.current?.() : null,
    ]);

    const clientes = clientesResult.data || [];
    setClientesAtivos(clientes.filter((c) => c.status_acesso === "aprovado").length);
    setClientesPendentes(clientes
      .filter((c) => c.status_acesso === "pendente")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => ({ id: c.id, nome: c.razao_social || c.responsavel_nome || "Sem nome", created_at: c.created_at })));

    const mapa: Record<string, SalaInfo> = {};
    (salasResult.data || []).forEach((sala: any) => {
      const ativa = ["disponivel", "ativa"].includes(sala.status) && /^ativ/i.test(sala.unidades?.status || "ativa");
      const abertos = minutos(sala.unidades?.horario_fechamento || "21:00") - minutos(sala.unidades?.horario_abertura || "08:00");
      mapa[sala.id] = { nome: sala.nome, minutosAbertos: ativa ? Math.max(abertos, 0) : 0 };
    });
    setSalas(mapa);
    setAtualizadoEm(new Date());
    setAgora(new Date());
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
    // Atualiza sozinho para refletir check-ins, novas reservas e checkouts automáticos.
    const id = window.setInterval(() => void carregar(true), ATUALIZAR_A_CADA_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  const hoje = format(agora, "yyyy-MM-dd");
  const ativas = useMemo(() => reservas.filter((r) => r.status !== "cancelada"), [reservas]);

  const reservasHoje = useMemo(
    () => ativas.filter((r) => r.data === hoje).sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || "")),
    [ativas, hoje],
  );
  const confirmadasHoje = reservasHoje.filter((r) => r.status === "confirmada" || r.status === "realizada").length;
  const aguardandoCheckinHoje = reservasHoje.filter((r) => r.status === "pendente" && !reservaEncerrada(r, agora)).length;

  // Ocupação de hoje: horas reservadas nas salas ativas / horas de funcionamento dessas salas.
  const minutosDisponiveis = Object.values(salas).reduce((total, sala) => total + sala.minutosAbertos, 0);
  const minutosReservados = reservasHoje
    .filter((r) => salas[r.sala_id]?.minutosAbertos)
    .reduce((total, r) => total + Math.max(minutos(r.hora_fim) - minutos(r.hora_inicio), 0), 0);
  const ocupacao = minutosDisponiveis ? Math.min(100, Math.round((minutosReservados / minutosDisponiveis) * 100)) : 0;

  const pendentesFuturas = ativas.filter((r) => r.status === "pendente" && r.data >= hoje && !reservaEncerrada(r, agora)).length;
  const semCheckin = ativas.filter((r) => r.status === "pendente" && reservaEncerrada(r, agora)).length;

  const recentes = useMemo(
    () => [...reservas].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6),
    [reservas],
  );

  const stats = [
    { label: "Clientes ativos", value: clientesAtivos, detalhe: `${clientesPendentes.length} aguardando liberação`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", tab: "clientes_corp" },
    { label: "Reservas hoje", value: reservasHoje.length, detalhe: `${confirmadasHoje} confirmadas · ${aguardandoCheckinHoje} aguardando check-in`, icon: Calendar, color: "text-brand-orange", bg: "bg-orange-50", tab: "calendario" },
    { label: "Ocupação hoje", value: `${ocupacao}%`, detalhe: `${(minutosReservados / 60).toFixed(1).replace(".", ",")}h de ${(minutosDisponiveis / 60).toFixed(0)}h disponíveis`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", tab: "calendario" },
    { label: "Pendentes", value: pendentesFuturas, detalhe: `${semCheckin} sem check-in (horário encerrado)`, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", tab: "reservas" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {atualizadoEm ? `Atualizado às ${format(atualizadoEm, "HH:mm")} · atualiza sozinho a cada minuto` : "Carregando dados…"}
        </p>
        <Button size="sm" variant="outline" onClick={() => void carregar(true)} disabled={carregando}>
          {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} role={onNavigate ? "button" : undefined} tabIndex={onNavigate ? 0 : undefined}
            onClick={() => onNavigate?.(stat.tab)}
            onKeyDown={(e) => { if (onNavigate && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onNavigate(stat.tab); } }}
            className={`p-5 border-none shadow-sm transition-shadow hover:shadow-md ${onNavigate ? "cursor-pointer" : ""}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-2xl font-black text-brand-blue-dark">{stat.value}</h3>
                <p className="truncate text-[11px] text-muted-foreground">{stat.detalhe}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 border-none shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-heading font-black text-brand-blue-dark">Agenda de hoje</h3>
            {onNavigate && <Button size="sm" variant="ghost" onClick={() => onNavigate("calendario")}>Ver calendário</Button>}
          </div>
          {reservasHoje.length === 0 ? (
            <p className="rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma reserva para hoje.</p>
          ) : (
            <div className="divide-y">
              {reservasHoje.map((r) => {
                const status = statusExibido(r);
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-blue-dark">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.hora_inicio?.slice(0, 5)} - {r.hora_fim?.slice(0, 5)} · {salas[r.sala_id]?.nome || "Sala não definida"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${corDoStatus(status)}`}>{status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-heading font-black text-brand-blue-dark">Cadastros aguardando</h3>
            <Badge variant="outline" className="font-bold">{clientesPendentes.length}</Badge>
          </div>
          {clientesPendentes.length === 0 ? (
            <p className="rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum cadastro aguardando liberação.</p>
          ) : (
            <div className="space-y-3">
              {clientesPendentes.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><UserPlus className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-blue-dark">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">Cadastrado em {dataBR(c.created_at)}</p>
                  </div>
                </div>
              ))}
              {onNavigate && <Button size="sm" variant="outline" className="w-full" onClick={() => onNavigate("clientes_corp")}>Liberar cadastros</Button>}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 border-none shadow-sm">
        <h3 className="mb-4 text-lg font-heading font-black text-brand-blue-dark">Atividades recentes</h3>
        {recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma reserva registrada.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((r) => {
              const status = statusExibido(r);
              const Icone = r.status === "cancelada" ? XCircle : r.status === "pendente" ? Clock : CheckCircle2;
              return (
                <div key={r.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${corDoStatus(status)}`}><Icone className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-blue-dark">{r.status === "cancelada" ? "Reserva cancelada" : "Reserva criada"}: {r.nome}</p>
                    <p className="text-xs text-muted-foreground">Para {dataBR(r.data)} {r.hora_inicio?.slice(0, 5)} · {salas[r.sala_id]?.nome || "Sala não definida"}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      {r.created_at ? `Registrada em ${format(new Date(r.created_at), "dd/MM HH:mm")}` : ""}{r.origem ? ` · ${r.origem}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
