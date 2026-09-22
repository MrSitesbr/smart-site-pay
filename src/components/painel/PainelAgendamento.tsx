import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp, ImageOff, Loader2, LockKeyhole, Plus, Send, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isBookableDay } from "@/lib/holidays";
import { toast } from "@/hooks/use-toast";

interface PainelAgendamentoProps {
  cliente: any;
  user: any;
  onRefresh: () => Promise<void>;
}

type SalaPublica = { id: string; nome: string; unidade_id: string | null; unidadeNome: string; abertura: number; fechamento: number; fotoUrl: string | null; descricao: string | null; tipo: string; capacidade: number | null };
type Ocupacao = { sala_id: string; data: string; hora_inicio: string; hora_fim: string; color_slot: number };
type Selecao = { salaId: string; inicioIndex: number; fimIndex: number };
type Periodo = { id: string; salaId: string; data: string; inicio: string; fim: string };
type Ambiente = "estacao" | "sala_privativa" | "sala_reuniao";

function ambienteDaSala(tipo: string): Ambiente {
  if (/privativ/i.test(tipo)) return "sala_privativa";
  if (/reuni|consult|audit/i.test(tipo)) return "sala_reuniao";
  return "estacao";
}

const SLOTS = Array.from({ length: 12 }, (_, index) => 8 * 60 + index * 60);
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CORES = ["bg-primary", "bg-secondary", "bg-destructive", "bg-accent", "bg-foreground", "bg-muted-foreground"];
const MAX_PERIODOS = 20;

const isoDate = (date: Date) => format(date, "yyyy-MM-dd");
const horarioMinutos = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const minutos = (valor: string) => { const [h, m] = valor.slice(0, 5).split(":").map(Number); return h * 60 + m; };

// Cores para status das reservas do usuário
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-500",
  aprovada: "bg-blue-500",
  paga: "bg-green-500",
  concluida: "bg-emerald-700",
  cancelada: "bg-red-500",
};

export default function PainelAgendamento({ cliente, user, onRefresh }: PainelAgendamentoProps) {
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [dia, setDia] = useState(startOfDay(new Date()));
  const [salas, setSalas] = useState<SalaPublica[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeId, setUnidadeId] = useState("todas");
  const [salaId, setSalaId] = useState("todas");
  const [ocupacoes, setOcupacoes] = useState<Ocupacao[]>([]);
  const [reservasDoUsuario, setReservasDoUsuario] = useState<any[]>([]);
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [modoSala, setModoSala] = useState<"especifica" | "qualquer">("especifica");
  const [salaDetalhes, setSalaDetalhes] = useState<SalaPublica | null>(null);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const arrastandoRef = useRef(false);
  const selecaoRef = useRef<Selecao | null>(null);

  const atualizarSelecao = (valor: Selecao | null) => { selecaoRef.current = valor; setSelecao(valor); };

  // Carregar salas e unidades
  useEffect(() => {
    let ativo = true;
    async function carregarDados() {
      setCarregandoSalas(true);
      
      // Carregar salas disponíveis
      const { data: salasData, error: salasError } = await supabase
        .from("salas")
        .select("id, nome, unidade_id, status, foto_url, galeria, descricao, tipo, capacidade, unidades(nome, horario_abertura, horario_fechamento)")
        .in("status", ["disponivel", "ativa"])
        .order("nome");
      
      if (!ativo) return;
      if (salasError) {
        toast({ title: "Não foi possível carregar as salas", description: salasError.message, variant: "destructive" });
        setCarregandoSalas(false);
        return;
      }
      
      const { data: unidadesData, error: unidadesError } = await supabase
        .from("unidades")
        .select("id, nome, horario_abertura, horario_fechamento")
        .ilike("status", "ativ%")
        .order("nome");
      
      if (unidadesError) {
        toast({ title: "Não foi possível carregar as unidades", description: unidadesError.message, variant: "destructive" });
        setCarregandoSalas(false);
        return;
      }
      
      const dadosUnidades = new Map<string, any>(unidadesData.map((u: any) => [u.id, u]));
      setUnidades(unidadesData || []);
      
      const salasProcessadas = (salasData || []).map((sala: any) => {
        const unidade = dadosUnidades.get(String(sala.unidade_id));
        return {
          id: sala.id,
          nome: sala.nome,
          unidade_id: sala.unidade_id,
          unidadeNome: unidade?.nome || "Unidade",
          abertura: minutos(unidade?.horario_abertura || "08:00"),
          fechamento: minutos(unidade?.horario_fechamento || "20:00"),
          fotoUrl: sala.foto_url || sala.galeria?.[0] || null,
          descricao: sala.descricao,
          tipo: sala.tipo,
          capacidade: sala.capacidade
        };
      }).filter((sala: any) => sala.unidade_id);
      
      setSalas(salasProcessadas);
      setCarregandoSalas(false);
    }
    
    void carregarDados();
    return () => { ativo = false; };
  }, []);

  const salasFiltradas = useMemo(() => {
    if (unidadeId === "todas") return salas;
    return salas.filter((sala) => sala.unidade_id === unidadeId);
  }, [salas, unidadeId]);
  
  useEffect(() => {
    if (salaId !== "todas" && !salasFiltradas.some((sala) => sala.id === salaId)) setSalaId("todas");
  }, [salaId, salasFiltradas]);

  // Carregar agenda
  const carregarAgenda = useCallback(async () => {
    setCarregandoAgenda(true);
    
    // Carregar ocupacoes (todas as reservas de todos os usuários)
    const { data: ocupacoesData, error: ocupacoesError } = await supabase.rpc("get_public_room_availability", {
      p_start_date: isoDate(startOfMonth(mes)),
      p_end_date: isoDate(endOfMonth(mes)),
      p_sala_id: salaId === "todas" ? undefined : salaId
    });
    
    if (ocupacoesError) {
      toast({ title: "Não foi possível consultar a agenda", description: ocupacoesError.message, variant: "destructive" });
      setOcupacoes([]);
    } else {
      setOcupacoes((ocupacoesData || []) as Ocupacao[]);
    }
    
    // Carregar reservas do usuário logado
    const { data: reservasData, error: reservasError } = await supabase
      .from("reservations")
      .select("*")
      .eq("email", user?.email)
      .gte("data", isoDate(startOfMonth(mes)))
      .lte("data", isoDate(endOfMonth(mes)))
      .order("data", { ascending: true });
    
    if (reservasError) {
      console.error("Erro ao carregar reservas:", reservasError);
    } else {
      setReservasDoUsuario(reservasData || []);
    }
    
    setCarregandoAgenda(false);
  }, [mes, salaId, user?.email]);
  
  useEffect(() => { void carregarAgenda(); }, [carregarAgenda]);

  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) }), [mes]);
  const ocupacoesDoDia = ocupacoes.filter((item) => item.data === isoDate(dia));
  const diaBloqueado = isBefore(dia, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(dia)}T12:00:00`));
  const salasGantt = salaId === "todas" ? salasFiltradas : salasFiltradas.filter((sala) => sala.id === salaId);
  const slotsVisiveis = useMemo(() => {
    if (!salasGantt.length) return SLOTS;
    const abertura = Math.min(...salasGantt.map((sala) => sala.abertura));
    const fechamento = Math.max(...salasGantt.map((sala) => sala.fechamento));
    return SLOTS.filter((slot) => slot >= abertura && slot < fechamento);
  }, [salasGantt]);

  const foraDoExpediente = (id: string, index: number) => {
    const sala = salas.find((item) => item.id === id);
    const slot = slotsVisiveis[index];
    return !sala || slot < sala.abertura || slot + 60 > sala.fechamento;
  };
  
  const ocupacaoNoSlot = (id: string, index: number) => {
    const inicio = slotsVisiveis[index], fim = inicio + 60;
    return ocupacoesDoDia.find((item) => item.sala_id === id && inicio < minutos(item.hora_fim) && fim > minutos(item.hora_inicio));
  };
  
  const reservaDoUsuarioNoSlot = (id: string, index: number) => {
    const inicio = slotsVisiveis[index], fim = inicio + 60;
    return reservasDoUsuario.find((r: any) => 
      r.sala_id === id && 
      r.data === isoDate(dia) && 
      inicio < minutos(r.hora_fim) && 
      fim > minutos(r.hora_inicio)
    );
  };
  
  const periodoNoSlot = (id: string, index: number) => {
    const inicio = slotsVisiveis[index], fim = inicio + 60;
    return periodos.find((item) => item.salaId === id && item.data === isoDate(dia) && inicio < minutos(item.fim) && fim > minutos(item.inicio));
  };
  
  const intervaloLivre = (id: string, a: number, b: number) => {
    const inicio = Math.min(a, b), fim = Math.max(a, b);
    return Array.from({ length: fim - inicio + 1 }, (_, offset) => inicio + offset).every((index) => 
      !foraDoExpediente(id, index) && 
      !ocupacaoNoSlot(id, index) && 
      !periodoNoSlot(id, index)
    );
  };
  
  const slotSelecionado = (id: string, index: number) => 
    Boolean(periodoNoSlot(id, index)) || 
    (selecao?.salaId === id && index >= Math.min(selecao.inicioIndex, selecao.fimIndex) && index <= Math.max(selecao.inicioIndex, selecao.fimIndex));

  const adicionarSelecao = useCallback((atual: Selecao) => {
    const inicio = horarioMinutos(slotsVisiveis[Math.min(atual.inicioIndex, atual.fimIndex)]);
    const fim = horarioMinutos(slotsVisiveis[Math.max(atual.inicioIndex, atual.fimIndex)] + 60);
    const novo: Periodo = { id: `${isoDate(dia)}-${inicio}-${fim}`, salaId: atual.salaId, data: isoDate(dia), inicio, fim };
    setPeriodos((lista) => lista.some((item) => item.id === novo.id) ? lista : [...lista, novo].sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`)));
    setConfirmacaoAberta(true);
  }, [dia, slotsVisiveis]);

  useEffect(() => {
    const finalizar = () => {
      if (!arrastandoRef.current) return;
      arrastandoRef.current = false;
      const atual = selecaoRef.current;
      if (atual) adicionarSelecao(atual);
    };
    window.addEventListener("pointerup", finalizar);
    window.addEventListener("pointercancel", finalizar);
    return () => { 
      window.removeEventListener("pointerup", finalizar); 
      window.removeEventListener("pointercancel", finalizar); 
    };
  }, [adicionarSelecao]);

  const salaSelecionada = selecao ? salas.find((sala) => sala.id === selecao.salaId) : null;
  const salaDosPeriodos = periodos.length ? salas.find((sala) => sala.id === periodos[0].salaId) : salaSelecionada;

  function iniciarSelecao(id: string, index: number) {
    if (foraDoExpediente(id, index) || ocupacaoNoSlot(id, index) || periodoNoSlot(id, index)) return;
    if (periodos.length && periodos[0].salaId !== id) {
      toast({ title: "Escolha a mesma sala", description: "Envie esta solicitação ou remova os períodos antes de escolher outra sala." });
      return;
    }
    if (periodos.length >= MAX_PERIODOS) {
      toast({ title: "Limite atingido", description: `Você pode enviar até ${MAX_PERIODOS} períodos por solicitação.` });
      return;
    }
    arrastandoRef.current = true;
    setConfirmacaoAberta(false);
    atualizarSelecao({ salaId: id, inicioIndex: index, fimIndex: index });
  }

  function ampliarSelecao(id: string, index: number) {
    const atual = selecaoRef.current;
    if (!arrastandoRef.current || !atual || atual.salaId !== id || !intervaloLivre(id, atual.inicioIndex, index)) return;
    atualizarSelecao({ ...atual, fimIndex: index });
  }

  // Função para solicitar nova reserva
  async function solicitarNovaReserva() {
    if (!periodos.length || !salaDosPeriodos || !cliente) return;
    
    setSolicitando(true);
    
    try {
      // Criar solicitação de reserva para cada período
      for (const periodo of periodos) {
        const { error } = await supabase.from("reservations").insert({
          user_id: user.id,
          cliente_corp_id: cliente.id,
          sala_id: modoSala === "qualquer" ? null : salaDosPeriodos.id,
          data: periodo.data,
          hora_inicio: periodo.inicio,
          hora_fim: periodo.fim,
          ambiente: ambienteDaSala(salaDosPeriodos?.tipo || "estacao"),
          status: "pendente",
          nome: cliente.responsavel_nome || user.user_metadata?.nome || user.email,
          email: cliente.responsavel_email || user.email,
          whatsapp: cliente.responsavel_telefone || user.user_metadata?.telefone || "",
          tipo_negocio: user.user_metadata?.nicho || "",
        });
        
        if (error) {
          toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
          setSolicitando(false);
          return;
        }
      }
      
      toast({ 
        title: "Reserva(s) solicitada(s)", 
        description: `${periodos.length} período${periodos.length > 1 ? "s" : ""} solicitado${periodos.length > 1 ? "s" : ""}`
      });
      setConfirmacaoAberta(false);
      atualizarSelecao(null);
      setPeriodos([]);
      setModoSala("especifica");
      await carregarAgenda();
      if (onRefresh) await onRefresh();
      
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSolicitando(false);
  }

  function removerPeriodo(id: string) {
    setPeriodos((lista) => {
      const atualizada = lista.filter((item) => item.id !== id);
      if (!atualizada.length) setConfirmacaoAberta(false);
      return atualizada;
    });
  }

  // Contar reservas do usuário por dia para mostrar no calendário mensal
  const reservasPorDia = useMemo(() => {
    const map = new Map<string, any[]>();
    reservasDoUsuario.forEach((r) => {
      const key = r.data;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [reservasDoUsuario]);

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      {/* Header da página */}
      <div className="mb-5 max-w-3xl">
        <p className="mb-1 font-heading text-xs font-bold uppercase text-primary">Agendamento</p>
        <h1 className="font-heading text-3xl font-black sm:text-4xl">Agenda de salas</h1>
        <p className="mt-2 text-sm text-foreground/70">Escolha uma data e arraste pelos horários livres para reservar.</p>
      </div>
      
      {/* Controles de filtro e mês */}
      <section className="mb-4 rounded-lg border-2 border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold">Unidade</label>
            <Select value={unidadeId} onValueChange={setUnidadeId} disabled={carregandoSalas}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {unidades.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Sala</label>
            <Select value={salaId} onValueChange={setSalaId} disabled={carregandoSalas}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as salas</SelectItem>
                {salasFiltradas.map((sala) => (
                  <SelectItem key={sala.id} value={sala.id}>{sala.nome} · {sala.unidadeNome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMes((atual) => subMonths(atual, 1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="min-w-40 text-center font-heading font-bold capitalize">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p>
            <Button variant="outline" size="icon" onClick={() => setMes((atual) => addMonths(atual, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Calendário mensal */}
        <div className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map((nome) => (
            <div key={nome} className="py-1 text-center text-[11px] font-bold text-foreground/70 sm:text-xs">{nome}</div>
          ))}
          {Array.from({ length: getDay(startOfMonth(mes)) }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {dias.map((data) => {
            const selecionado = isSameDay(data, dia);
            const bloqueado = isBefore(data, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(data)}T12:00:00`));
            const key = isoDate(data);
            const info = reservasPorDia.get(key);
            const qtd = info ? info.length : 0;
            
            return (
              <Button
                key={key}
                variant={selecionado ? "default" : "outline"}
                className="h-11 flex-col gap-0 border-border p-0.5 sm:h-12"
                onClick={() => { setDia(data); atualizarSelecao(null); }}
                disabled={bloqueado}
              >
                <span className="text-sm font-bold">{format(data, "d")}</span>
                <span className="text-[9px] font-semibold sm:text-[10px]">
                  {bloqueado ? "Fechado" : qtd ? `${qtd} reserva${qtd > 1 ? "s" : ""}` : "Livre"}
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      {/* Grade de horários do dia */}
      <section className="overflow-hidden rounded-lg border-2 border-border bg-card shadow-sm" aria-label="Agenda de horários do dia">
        <div className="flex items-center gap-3 border-b-2 border-border bg-muted/50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-primary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold capitalize text-foreground">
              {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-xs font-medium text-foreground/70">Clique e arraste para selecionar um período</p>
          </div>
        </div>
        
        {carregandoAgenda ? (
          <div className="flex min-h-56 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando agenda...
          </div>
        ) : diaBloqueado ? (
          <div className="m-4 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Não há atendimento nesta data.
          </div>
        ) : salasGantt.length === 0 ? (
          <div className="m-4 rounded-md border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma sala encontrada neste filtro.
          </div>
        ) : (
          <div className="max-h-[620px] overflow-auto select-none">
            <div className="min-w-[680px]">
              {/* Header das salas */}
              <div className="sticky top-0 z-20 grid border-b-2 border-border bg-muted" style={{ 
                gridTemplateColumns: `64px repeat(${salasGantt.length}, minmax(150px, 1fr))` 
              }}>
                <div className="flex items-center px-2 py-2 text-xs font-bold text-foreground">Hora</div>
                {salasGantt.map((sala) => (
                  <div key={sala.id} className="border-l-2 border-border px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-11 shrink-0 overflow-hidden rounded border border-border bg-background">
                        {sala.fotoUrl ? (
                          <img src={sala.fotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-bold text-foreground sm:text-sm">{sala.nome}</p>
                        <p className="truncate text-[10px] font-medium text-foreground/70">{sala.unidadeNome}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Mais informações sobre ${sala.nome}`}
                        title="Mais informações"
                        onClick={() => setSalaDetalhes(sala)}
                      >
                        <CircleHelp className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-1 text-center text-[10px] font-medium text-foreground/70">
                      {horarioMinutos(sala.abertura)}–{horarioMinutos(sala.fechamento)}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Slots de tempo */}
              {slotsVisiveis.map((slot, index) => (
                <div key={slot} className={`grid border-b border-border ${index % 2 ? "bg-muted/30" : "bg-background"}`} style={{ 
                  gridTemplateColumns: `64px repeat(${salasGantt.length}, minmax(150px, 1fr))` 
                }}>
                  <div className="flex min-h-9 items-center border-r border-border px-2 text-[11px] font-bold text-foreground">
                    {horarioMinutos(slot)}
                  </div>
                  {salasGantt.map((sala) => {
                    const ocupacao = ocupacaoNoSlot(sala.id, index);
                    const reservaUser = reservaDoUsuarioNoSlot(sala.id, index);
                    const selecionado = slotSelecionado(sala.id, index);
                    const fechado = foraDoExpediente(sala.id, index);
                    const indisponivel = Boolean(ocupacao || fechado);
                    
                    // Se tem reserva do usuário, mostrar com cor do status
                    if (reservaUser) {
                      const statusColor = STATUS_COLORS[reservaUser.status] || "bg-blue-500";
                      const statusLabel = reservaUser.status === "pendente" ? "Pendente" :
                                         reservaUser.status === "aprovada" ? "Aprovada" :
                                         reservaUser.status === "paga" ? "Pago" :
                                         reservaUser.status === "cancelada" ? "Cancelada" : "Reservado";
                      return (
                        <div
                          key={sala.id}
                          className={`relative min-h-9 border-l border-border ${statusColor} text-white text-[9px] font-bold cursor-not-allowed`}
                        >
                          <div className="flex h-full items-center justify-center px-1">
                            {statusLabel}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={sala.id}
                        role="button"
                        tabIndex={indisponivel ? -1 : 0}
                        aria-label={indisponivel ? `${sala.nome}, ${horarioMinutos(slot)}, indisponível` : `${sala.nome}, ${horarioMinutos(slot)}, disponível`}
                        onPointerDown={(event) => { 
                          event.preventDefault(); 
                          iniciarSelecao(sala.id, index); 
                        }}
                        onPointerEnter={() => ampliarSelecao(sala.id, index)}
                        onKeyDown={(event) => { 
                          if (!indisponivel && !periodoNoSlot(sala.id, index) && (event.key === "Enter" || event.key === " ")) { 
                            event.preventDefault(); 
                            iniciarSelecao(sala.id, index); 
                            arrastandoRef.current = false; 
                            adicionarSelecao({ salaId: sala.id, inicioIndex: index, fimIndex: index }); 
                          } 
                        }}
                        className={`relative min-h-9 border-l border-border transition-colors ${
                          ocupacao ? `${CORES[ocupacao.color_slot % CORES.length]} cursor-not-allowed text-primary-foreground` :
                          fechado ? "cursor-not-allowed bg-muted text-muted-foreground" :
                          selecionado ? "cursor-grabbing bg-primary/20 ring-2 ring-inset ring-primary" :
                          "cursor-crosshair hover:bg-primary/10"
                        }`}
                      >
                        {ocupacao ? (
                          <div className="flex h-full items-center justify-center px-1 text-[10px] font-bold">
                            <span className="mr-1">🔒</span>Indisponível
                          </div>
                        ) : fechado ? (
                          <div className="flex h-full items-center justify-center text-[9px] font-semibold uppercase">Fechado</div>
                        ) : selecionado ? (
                          <span className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modal de confirmação */}
      <Dialog open={confirmacaoAberta} onOpenChange={(aberta) => { setConfirmacaoAberta(aberta); if (!aberta) atualizarSelecao(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Confirmar solicitação</DialogTitle>
            <DialogDescription>Confira todos os períodos escolhidos.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            {salaDosPeriodos && (
              <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                <div>
                  <label className="text-sm font-medium">Preferência de sala</label>
                  <Select value={modoSala} onValueChange={(valor: "especifica" | "qualquer") => setModoSala(valor)}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especifica">{salaDosPeriodos.nome} · {salaDosPeriodos.unidadeNome}</SelectItem>
                      <SelectItem value="qualquer">Qualquer sala disponível</SelectItem>
                    </SelectContent>
                  </Select>
                  {modoSala === "qualquer" && (
                    <p className="mt-2 text-xs text-muted-foreground">A unidade e a sala serão escolhidas pelo administrador conforme a disponibilidade.</p>
                  )}
                </div>
                <div className="space-y-2">
                  {periodos.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
                      <div>
                        <p className="font-semibold">{format(new Date(`${item.data}T12:00:00`), "dd/MM/yyyy")}</p>
                        <p className="text-sm text-muted-foreground">{item.inicio} às {item.fim}</p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label="Remover período" onClick={() => removerPeriodo(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => { setConfirmacaoAberta(false); atualizarSelecao(null); }} disabled={periodos.length >= MAX_PERIODOS}>
              <Plus className="mr-2 h-4 w-4" />Adicionar outra data ou horário
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => void solicitarNovaReserva()} disabled={solicitando || !periodos.length}>
              {solicitando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Solicitar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes da sala */}
      <Dialog open={Boolean(salaDetalhes)} onOpenChange={(aberta) => { if (!aberta) setSalaDetalhes(null); }}>
        <DialogContent className="max-w-lg">
          {salaDetalhes && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-black">{salaDetalhes.nome}</DialogTitle>
                <DialogDescription>{salaDetalhes.unidadeNome}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {salaDetalhes.fotoUrl ? (
                  <img
                    src={salaDetalhes.fotoUrl}
                    alt={salaDetalhes.nome}
                    className="aspect-video w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
                    <ImageOff className="mr-2 h-5 w-5" />Sem foto cadastrada
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-md border bg-muted px-3 py-1.5">{salaDetalhes.tipo}</span>
                  {salaDetalhes.capacidade && (
                    <span className="inline-flex items-center rounded-md border bg-muted px-3 py-1.5">
                      <Users className="mr-1.5 h-4 w-4" />Até {salaDetalhes.capacidade} pessoas
                    </span>
                  )}
                  <span className="rounded-md border bg-muted px-3 py-1.5">
                    {horarioMinutos(salaDetalhes.abertura)}–{horarioMinutos(salaDetalhes.fechamento)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {salaDetalhes.descricao || "Nenhuma descrição cadastrada para esta sala."}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
