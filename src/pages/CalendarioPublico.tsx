import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, isSameDay, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, LockKeyhole } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isBusinessDay } from "@/lib/holidays";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SalaPublica = {
  id: string;
  nome: string;
  unidade_id: string | null;
  unidadeNome: string;
};

type Ocupacao = {
  sala_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
};

const INICIOS = Array.from({ length: 9 }, (_, index) => 9 + index);
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function horario(hora: number) {
  return `${String(hora).padStart(2, "0")}:00`;
}

export default function CalendarioPublico() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [dia, setDia] = useState(startOfDay(new Date()));
  const [salas, setSalas] = useState<SalaPublica[]>([]);
  const [salaId, setSalaId] = useState("");
  const [ocupacoes, setOcupacoes] = useState<Ocupacao[]>([]);
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from("salas").select("id, nome, unidade_id, status").in("status", ["disponivel", "ativa"]).order("nome"),
      supabase.from("unidades").select("id, nome"),
      supabase.auth.getSession(),
    ]).then(([salasResponse, unidadesResponse, sessaoResponse]) => {
      if (!ativo) return;
      if (salasResponse.error) {
        toast({ title: "Não foi possível carregar as salas", description: salasResponse.error.message, variant: "destructive" });
      }
      const unidades = new Map((unidadesResponse.data || []).map((unidade) => [unidade.id, unidade.nome]));
      const proximasSalas = (salasResponse.data || []).map((sala) => ({
        id: sala.id,
        nome: sala.nome,
        unidade_id: sala.unidade_id,
        unidadeNome: sala.unidade_id ? unidades.get(sala.unidade_id) || "Unidade" : "Unidade",
      }));
      setSalas(proximasSalas);
      setSalaId((atual) => atual || proximasSalas[0]?.id || "");
      setAutenticado(Boolean(sessaoResponse.data.session));
      setCarregandoSalas(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAutenticado(Boolean(session)));
    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const carregarAgenda = useCallback(async () => {
    if (!salaId) {
      setOcupacoes([]);
      return;
    }
    setCarregandoAgenda(true);
    const { data, error } = await supabase.rpc("get_public_room_availability", {
      p_start_date: isoDate(startOfMonth(mes)),
      p_end_date: isoDate(endOfMonth(mes)),
      p_sala_id: salaId,
    });
    if (error) {
      toast({ title: "Não foi possível consultar a agenda", description: error.message, variant: "destructive" });
      setOcupacoes([]);
    } else {
      setOcupacoes(data || []);
    }
    setCarregandoAgenda(false);
  }, [mes, salaId]);

  useEffect(() => {
    void carregarAgenda();
  }, [carregarAgenda]);

  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) }), [mes]);
  const espacosIniciais = Array.from({ length: getDay(startOfMonth(mes)) });
  const ocupacoesDoDia = ocupacoes.filter((item) => item.data === isoDate(dia));
  const diaBloqueado = isBefore(dia, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(dia)}T12:00:00`));

  function estaOcupado(inicio: string, fim: string) {
    return ocupacoesDoDia.some((item) => inicio < item.hora_fim.slice(0, 5) && fim > item.hora_inicio.slice(0, 5));
  }

  async function solicitar(inicio: string, fim: string) {
    if (!autenticado) {
      toast({ title: "Entre na sua conta", description: "O pedido de reserva é exclusivo para clientes cadastrados e autorizados." });
      navigate("/auth");
      return;
    }
    setSolicitando(inicio);
    const { error } = await supabase.rpc("request_authenticated_reservation", {
      p_sala_id: salaId,
      p_data: isoDate(dia),
      p_hora_inicio: inicio,
      p_hora_fim: fim,
    });
    if (error) {
      toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reserva solicitada", description: "O horário ficou pendente até a confirmação da equipe." });
      await carregarAgenda();
    }
    setSolicitando(null);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="mb-2 font-heading text-sm font-bold uppercase text-primary">Agenda de salas</p>
          <h1 className="font-heading text-3xl font-black sm:text-4xl">Consulte os horários disponíveis</h1>
          <p className="mt-3 text-muted-foreground">Escolha uma sala e um dia. Por privacidade, a agenda mostra apenas horários livres ou indisponíveis.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-label="Calendário mensal">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-md">
                <label className="mb-2 block text-sm font-semibold">Sala</label>
                <Select value={salaId} onValueChange={setSalaId} disabled={carregandoSalas || salas.length === 0}>
                  <SelectTrigger><SelectValue placeholder={carregandoSalas ? "Carregando salas..." : "Selecione uma sala"} /></SelectTrigger>
                  <SelectContent>
                    {salas.map((sala) => <SelectItem key={sala.id} value={sala.id}>{sala.nome} · {sala.unidadeNome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Button variant="outline" size="icon" onClick={() => setMes((atual) => subMonths(atual, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
                <p className="min-w-40 text-center font-heading font-bold capitalize">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</p>
                <Button variant="outline" size="icon" onClick={() => setMes((atual) => addMonths(atual, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {DIAS_SEMANA.map((nome) => <div key={nome} className="py-2 text-center text-xs font-bold text-muted-foreground sm:text-sm">{nome}</div>)}
              {espacosIniciais.map((_, index) => <div key={`empty-${index}`} />)}
              {dias.map((data) => {
                const selecionado = isSameDay(data, dia);
                const bloqueado = isBefore(data, startOfDay(new Date())) || !isBusinessDay(new Date(`${isoDate(data)}T12:00:00`));
                const qtd = ocupacoes.filter((item) => item.data === isoDate(data)).length;
                return (
                  <Button
                    key={isoDate(data)}
                    type="button"
                    variant={selecionado ? "default" : "outline"}
                    className="h-16 flex-col gap-1 p-1 sm:h-20"
                    onClick={() => setDia(data)}
                    disabled={bloqueado}
                  >
                    <span className="text-base font-bold">{format(data, "d")}</span>
                    <span className="text-[10px] font-medium sm:text-xs">{bloqueado ? "Fechado" : qtd ? `${qtd} ocupado${qtd > 1 ? "s" : ""}` : "Livre"}</span>
                  </Button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6" aria-label="Horários do dia">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></div>
              <div>
                <h2 className="font-heading text-lg font-bold capitalize">{format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2>
                <p className="text-sm text-muted-foreground">Horários de uma hora</p>
              </div>
            </div>

            {carregandoAgenda ? (
              <div className="flex min-h-56 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Consultando agenda...</div>
            ) : !salaId ? (
              <div className="min-h-56 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma sala disponível no momento.</div>
            ) : diaBloqueado ? (
              <div className="min-h-56 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Não há atendimento nesta data.</div>
            ) : (
              <div className="space-y-2">
                {INICIOS.map((hora) => {
                  const inicio = horario(hora);
                  const fim = horario(hora + 1);
                  const ocupado = estaOcupado(inicio, fim);
                  return (
                    <div key={inicio} className="flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{inicio}–{fim}</span>
                      </div>
                      {ocupado ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Indisponível</span>
                      ) : (
                        <Button size="sm" onClick={() => void solicitar(inicio, fim)} disabled={solicitando !== null}>
                          {solicitando === inicio && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {autenticado ? "Solicitar" : "Entrar para solicitar"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}