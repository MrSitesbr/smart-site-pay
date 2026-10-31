import { supabase } from "@/integrations/supabase/client";

/** Resultado de public.plano_cobertura: quanto do plano cobre um horário e o uso da janela atual. */
export type Cobertura = {
  status: "ativo" | "a_revisar" | "vencido" | "nao_iniciado" | "sem_plano";
  regra: "semanal" | "pacote" | "mensal_reuniao" | "sem_horas" | "avulso" | "legado";
  contrato_id: string | null;
  contrato_status: string | null;
  plano_id: string | null;
  plano_nome: string | null;
  plano_slug: string | null;
  categoria: string | null;
  bloco_unico: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  data_sugerida: boolean;
  dias_restantes: number | null;
  janela_inicio: string | null;
  janela_fim: string | null;
  cota: number;
  usado: number;
  saldo: number;
  horas: number;
  cobertas: number;
  excedentes: number;
  estacao: boolean;
  sala_fora_do_plano: boolean;
  permite_adicional: boolean;
  preco_adicional: number | null;
  preco_avulso: number;
  motivo: string | null;
  data?: string;
  hora_inicio?: string;
  hora_fim?: string;
};

export type AvisoPlano = { tipo: string; nivel: "info" | "alerta" | "erro"; mensagem: string };
export type ResumoPlano = Cobertura & { avisos: AvisoPlano[] };
export type ResumoClienteAdmin = ResumoPlano & {
  cliente_corp_id: string;
  numero_cadastro: number;
  nome: string;
  email: string | null;
  unidade_id: string | null;
  unidade_nome: string | null;
};
export type Modalidade = "adicional" | "avulso";
export type Periodo = { data: string; hora_inicio: string; hora_fim: string; sala_id?: string | null };

// As funções novas ainda não estão nos tipos gerados do Supabase.
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const getResumoPlano = (clienteId: string) =>
  call<ResumoPlano>("cliente_plano_resumo", { p_cliente_corp_id: clienteId });

export const simularPlano = (clienteId: string, periodos: Periodo[], salaId?: string | null) =>
  call<Cobertura[]>("plano_simular", { p_cliente_corp_id: clienteId, p_periodos: periodos, p_sala_id: salaId || null });

export const getCobertura = (clienteId: string, data: string, horas: number, salaId?: string | null, horaInicio?: string | null, ignorarReservaId?: string | null) =>
  call<Cobertura>("plano_cobertura", {
    p_cliente_corp_id: clienteId, p_data: data, p_horas: horas, p_sala_id: salaId || null, p_hora_inicio: horaInicio || null,
    p_ignorar_reserva: ignorarReservaId || null,
  });

export const getPlanosOverview = () => call<ResumoClienteAdmin[]>("admin_planos_overview");

export const salvarContrato = (args: {
  clienteId: string; planoId: string; inicio: string; fim?: string | null; valor?: number | null; horas?: number | null; observacoes?: string | null;
}) => call<string>("admin_salvar_contrato", {
  p_cliente_corp_id: args.clienteId, p_plano_id: args.planoId, p_data_inicio: args.inicio, p_data_fim: args.fim || null,
  p_valor: args.valor ?? null, p_horas: args.horas ?? null, p_observacoes: args.observacoes || null,
});

export const renovarContrato = (contratoId: string) => call<string>("admin_renovar_contrato", { p_contrato_id: contratoId });

export const encerrarContrato = (contratoId: string, motivo?: string) =>
  call<void>("admin_encerrar_contrato", { p_contrato_id: contratoId, p_motivo: motivo || null });

/** Totais de uma simulação: horas cobertas e excedentes, e se o cliente precisa escolher como pagar. */
export function resumirSimulacao(itens: Cobertura[]) {
  const cobertas = itens.reduce((acc, item) => acc + Number(item.cobertas || 0), 0);
  const excedentes = itens.reduce((acc, item) => acc + Number(item.excedentes || 0), 0);
  const permiteAdicional = itens.some((item) => item.excedentes > 0 && item.permite_adicional);
  const precoAdicional = Number(itens.find((item) => item.preco_adicional)?.preco_adicional || 30);
  const precoAvulso = Number(itens[0]?.preco_avulso || 60);
  return {
    cobertas, excedentes, permiteAdicional, precoAdicional, precoAvulso,
    temPlano: itens.some((item) => item.status === "ativo" || item.status === "a_revisar"),
    valorAdicional: excedentes * precoAdicional,
    valorAvulso: excedentes * precoAvulso,
  };
}

export const STATUS_PLANO_LABEL: Record<string, string> = {
  ativo: "Ativo",
  a_revisar: "Em revisão",
  vencido: "Vencido",
  nao_iniciado: "Ainda não iniciado",
  sem_plano: "Sem plano",
  encerrado: "Encerrado",
};

export const REGRA_LABEL: Record<string, string> = {
  semanal: "Horas da semana",
  pacote: "Horas do pacote",
  mensal_reuniao: "Horas de reunião do mês",
  sem_horas: "Sem horas incluídas",
  avulso: "Avulso",
  legado: "Horas do mês (regra anterior)",
};

export const fmtBRL = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtData = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00`).toLocaleDateString("pt-BR") : "—");

export const fmtNumeroCadastro = (n?: number | null) => (n ? `Nº ${String(n).padStart(4, "0")}` : "");

/** Percentual de prazo decorrido do contrato (0–100) ou null quando não há vencimento. */
export function prazoDecorrido(inicio?: string | null, fim?: string | null) {
  if (!inicio || !fim) return null;
  const ini = new Date(`${inicio}T00:00`).getTime();
  const end = new Date(`${fim}T23:59`).getTime();
  const pct = ((Date.now() - ini) / (end - ini)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/** Cor do semáforo: verde com folga, amarelo perto do fim, vermelho esgotado/vencido. */
export function nivelUso(resumo: Pick<Cobertura, "status" | "cota" | "saldo" | "dias_restantes">) {
  if (resumo.status === "vencido") return "vermelho";
  if (resumo.cota > 0 && resumo.saldo <= 0) return "vermelho";
  if ((resumo.cota > 0 && resumo.saldo <= resumo.cota * 0.25) || (resumo.dias_restantes != null && resumo.dias_restantes <= 15)) return "amarelo";
  return "verde";
}

export type ExtratoItem = {
  id: string; data: string; hora_inicio: string; hora_fim: string; sala: string | null; status: string;
  tipo_cobranca: string | null; horas_plano: number; horas_extras: number; valor: string | null;
};

/** Contrato do cliente em formato de card (vigente ou histórico), com extrato de uso. */
export type PlanoCard = {
  id: string;
  status: "ativo" | "a_revisar" | "vencido" | "encerrado";
  vigente: boolean;
  plano_id: string;
  plano_nome: string;
  categoria: string | null;
  regra: string | null;
  cobranca: string | null;
  valor: number | null;
  preco_hora_adicional: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  encerrado_em: string | null;
  motivo_encerramento: string | null;
  horas_periodo: number | null;
  horas_usadas: number;
  horas_extras: number;
  extrato: ExtratoItem[];
};

export const getPlanoCards = (clienteId: string) =>
  call<PlanoCard[]>("cliente_plano_cards", { p_cliente_corp_id: clienteId });
