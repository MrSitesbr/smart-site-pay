import { supabase } from "@/integrations/supabase/client";
import { getBookingBlockReason, isBookableDay } from "./holidays";

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
    .select('capacidade, tipo, unidades(horario_abertura, horario_fechamento)')
    .eq('id', salaId)
    .maybeSingle();
  const isCompartilhada = /comp|estac|estaç|coworking/i.test(String(salaInfo?.tipo || ''));
  const capacidade = isCompartilhada ? Math.max(1, Number(salaInfo?.capacidade) || 1) : 1;
  const unidade = Array.isArray(salaInfo?.unidades) ? salaInfo.unidades[0] : salaInfo?.unidades;
  const abertura = String(unidade?.horario_abertura || "08:00").slice(0, 5);
  const fechamento = String(unidade?.horario_fechamento || "20:00").slice(0, 5);

  // 0. Verificar feriados reais e domingos. Sábados são permitidos.
  if (!isBookableDay(dateObj)) {
    conflitos.push({
      tipo: 'bloqueio',
      nome: getBookingBlockReason(dateObj) || "Data indisponível",
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
