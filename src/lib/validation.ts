import { z } from "zod";

const optionalPrice = z.union([z.number().min(0), z.null()]);

export const roomSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da sala.").max(120, "O nome deve ter no máximo 120 caracteres."),
  unidadeId: z.string().uuid("Selecione uma unidade válida."),
  categorias: z.array(z.enum(["privativa", "compartilhado", "consultorio_poltrona", "consultorio_maca"])).min(1, "Selecione ao menos uma categoria."),
  modalidades: z.array(z.enum(["avulso", "mensal"])).min(1, "Selecione ao menos uma modalidade."),
  capacidade: z.number().int().positive("A capacidade deve ser maior que zero."),
  descricao: z.string().max(2000, "A descrição deve ter no máximo 2000 caracteres."),
  precoMensal: optionalPrice,
  precoHora: optionalPrice,
  precoDiaria: optionalPrice,
  planos: z.array(z.string().uuid()),
});

export const passwordSchema = z.string()
  .min(6, "A senha deve ter pelo menos 6 caracteres.")
  .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
  .regex(/\d/, "A senha deve conter pelo menos um número.")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial.");

export const leadSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().max(30),
  status: z.enum(["pendente", "contato", "aprovada", "negociacao", "paga", "concluida", "cancelada"]),
  preco: z.number().finite().min(0),
});

export function numberOrNull(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}