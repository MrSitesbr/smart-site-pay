export interface WaitingListEntry {
  id: string;
  created_at: string;
  unidade_id: string;
  cliente_id: string;
  min_metragem: number;
  needs_window: boolean;
  needs_lavatory: boolean;
  outros_requisitos: string;
  status: 'aguardando' | 'atendido' | 'cancelado';
  priority: number;
  clientes_corp?: {
    razao_social: string;
    nome_fantasia: string;
  };
}

export interface SalaMetadata {
  metragem?: number;
  tem_janela?: boolean;
  tem_lavatorio?: boolean;
}

export function calculateCompatibility(sala: any, entry: WaitingListEntry): number {
  const metadata: SalaMetadata = sala.metadata || {};
  let score = 0;
  let totalCriteria = 0;

  // Criteria 1: Metragem
  if (entry.min_metragem > 0) {
    totalCriteria++;
    if ((metadata.metragem || 0) >= entry.min_metragem) {
      score++;
    }
  }

  // Criteria 2: Janela
  if (entry.needs_window) {
    totalCriteria++;
    if (metadata.tem_janela) {
      score++;
    }
  }

  // Criteria 3: Lavatório
  if (entry.needs_lavatory) {
    totalCriteria++;
    if (metadata.tem_lavatorio) {
      score++;
    }
  }

  if (totalCriteria === 0) return 100;
  return Math.round((score / totalCriteria) * 100);
}
