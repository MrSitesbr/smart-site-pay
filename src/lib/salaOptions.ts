export const SALA_CATEGORIAS = [
  { value: "privativa", label: "Sala Privativa" },
  { value: "compartilhado", label: "Escritório Compartilhado" },
  { value: "consultorio_poltrona", label: "Consultório com Poltrona" },
  { value: "consultorio_maca", label: "Consultório com Maca" },
] as const;

export const SALA_MODALIDADES = [
  { value: "avulso", label: "Avulso" },
  { value: "mensal", label: "Mensal" },
] as const;

export function tipoAmbienteDasCategorias(categorias: string[]) {
  if (categorias.includes("compartilhado")) return "estacao";
  if (categorias.some((item) => item.startsWith("consultorio"))) return "sala_reuniao";
  return "sala_privativa";
}

export function mensagemBancoSala(message?: string) {
  if (!message) return "Não foi possível salvar a sala.";
  if (message.includes("salas_categorias_check")) return "Selecione ao menos uma categoria válida.";
  if (message.includes("salas_modalidades_locacao_check")) return "Selecione ao menos uma modalidade válida.";
  if (message.includes("permission denied") || message.includes("42501")) return "Sua sessão administrativa expirou. Entre novamente.";
  return "Não foi possível salvar a sala. Revise os campos e tente novamente.";
}