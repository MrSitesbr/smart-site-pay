import { supabase } from "@/integrations/supabase/client";
import { horarioDoDia, type HorarioDia } from "./horarios";

export type ConflitoReserva = {
  tipo: 'reserva' | 'visita' | 'bloqueio';
  id?: string;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
};

export async function verificarConflitos(
  salaId: string,
  data: string,
  horaInicio: string,
  horaFim: string,
  ignoreId?: string
): Promise<ConflitoReserva[]> {
  if (!salaId || !data || !horaInicio || !horaFim) return [];

  const dateObj = new Date(data + "T12:00:00Z"); // Midday to avoid TZ issues
  const conflitos: ConflitoReserva[] = [];

  // Capacidade da sala (estações compartilhadas aceitam várias reservas simultâneas)
  const { data: salaInfo } = await supabase
    .from('salas')
    .select('capacidade, tipo, categorias, unidade_id, unidades(horario_abertura, horario_fechamento)')
    .eq('id', salaId)
    .maybeSingle();
  const isCompartilhada = (salaInfo?.categorias || []).includes("compartilhado") || /comp|estac|estaç|coworking/i.test(String(salaInfo?.tipo || ''));
  const capacidade = isCompartilhada ? Math.max(1, Number(salaInfo?.capacidade) || 1) : 1;
  const unidade = Array.isArray(salaInfo?.unidades) ? salaInfo.unidades[0] : salaInfo?.unidades;
  // Horário da unidade neste dia da semana (domingo/feriado ou dia fechado pelo admin bloqueiam).
  const unidadeId = (salaInfo as any)?.unidade_id as string | undefined;
  const { data: horariosUnidade } = unidadeId
    ? await (supabase.from("unidade_horarios" as any) as any).select("unidade_id, dia_semana, abre, fecha, fechado").eq("unidade_id", unidadeId)
    : { data: [] };
  const mapa = new Map<string, HorarioDia[]>(unidadeId ? [[unidadeId, ((horariosUnidade || []) as HorarioDia[]).map((h) => ({ ...h, abre: String(h.abre).slice(0, 5), fecha: String(h.fecha).slice(0, 5) }))]] : []);
  const dia = horarioDoDia(mapa, unidadeId, new Date(data + "T12:00:00"), { abre: unidade?.horario_abertura, fecha: unidade?.horario_fechamento });
  const abertura = dia.abre;
  const fechamento = dia.fecha;

  // 0. Dia fechado: feriado nacional ou dia sem atendimento na unidade.
  if (dia.fechado) {
    conflitos.push({
      tipo: 'bloqueio',
      nome: dia.motivo || "Unidade fechada neste dia",
      hora_inicio: "00:00",
      hora_fim: "23:59"
    });
  }
  if (horaInicio < abertura || horaFim > fechamento) {
    conflitos.push({ tipo: "bloqueio", nome: "Horário fora do funcionamento desta unidade.", hora_inicio: abertura, hora_fim: fechamento });
  }

  // 1. Verificar Reservas
  // Logica: (Inicio1 < Fim2) AND (Fim1 > Inicio2)
  const { data: resConflitos } = await supabase
    .from('reservations')
    .select('id, nome, hora_inicio, hora_fim')
    .eq('sala_id', salaId)
    .eq('data', data)
    .neq('status', 'cancelada');

  if (resConflitos) {
    const sobrepostas = resConflitos.filter(r => {
      if (r.id === ignoreId) return false;
      const rStart = r.hora_inicio.slice(0, 5);
      const rEnd = r.hora_fim.slice(0, 5);
      return horaInicio < rEnd && horaFim > rStart;
    });

    if (capacidade > 1) {
      // Espaço compartilhado: só bloqueia quando todas as vagas estiverem ocupadas
      if (sobrepostas.length >= capacidade) {
        conflitos.push({
          tipo: 'reserva',
          nome: `Espaço lotado (${sobrepostas.length}/${capacidade} vagas)`,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
        });
      }
    } else {
      sobrepostas.forEach(r => conflitos.push({
        tipo: 'reserva',
        id: r.id,
        nome: r.nome,
        hora_inicio: r.hora_inicio.slice(0, 5),
        hora_fim: r.hora_fim.slice(0, 5),
      }));
    }
  }

  // 2. Verificar Visitantes
  // Visitantes usam data_hora_prevista (timestamp)
  // Vamos buscar visitantes do mesmo dia
  const startOfDay = `${data}T00:00:00Z`;
  const endOfDay = `${data}T23:59:59Z`;

  const { data: visConflitos } = await supabase
    .from('visitantes')
    .select('id, nome, data_hora_prevista')
    .eq('sala_id', salaId)
    .gte('data_hora_prevista', startOfDay)
    .lte('data_hora_prevista', endOfDay);

  if (visConflitos) {
    visConflitos.forEach(v => {
      if (v.id === ignoreId) return;
      
      const vDate = new Date(v.data_hora_prevista);
      const vTime = vDate.getUTCHours().toString().padStart(2, '0') + ':' + vDate.getUTCMinutes().toString().padStart(2, '0');
      
      // Visitas costumam durar 1h para fins de aviso, ou são pontuais. 
      // Vamos considerar conflito se a visita estiver dentro do range de reserva.
      if (vTime >= horaInicio && vTime < horaFim) {
        conflitos.push({
          tipo: 'visita',
          id: v.id,
          nome: v.nome,
          hora_inicio: vTime,
          hora_fim: vTime // visitas não tem fim explícito no banco atual
        });
      }
    });
  }

  return conflitos;
}
