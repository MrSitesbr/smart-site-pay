import { supabase } from "@/integrations/supabase/client";

export type ConflitoReserva = {
  tipo: 'reserva' | 'visita';
  id: string;
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

  const conflitos: ConflitoReserva[] = [];

  // 1. Verificar Reservas
  // Logica: (Inicio1 < Fim2) AND (Fim1 > Inicio2)
  const { data: resConflitos } = await supabase
    .from('reservations')
    .select('id, nome, hora_inicio, hora_fim')
    .eq('sala_id', salaId)
    .eq('data', data)
    .neq('status', 'cancelada');

  if (resConflitos) {
    resConflitos.forEach(r => {
      if (r.id === ignoreId) return;
      
      const rStart = r.hora_inicio.slice(0, 5);
      const rEnd = r.hora_fim.slice(0, 5);
      
      // Sobreposição de horários
      if (horaInicio < rEnd && horaFim > rStart) {
        conflitos.push({
          tipo: 'reserva',
          id: r.id,
          nome: r.nome,
          hora_inicio: rStart,
          hora_fim: rEnd
        });
      }
    });
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
