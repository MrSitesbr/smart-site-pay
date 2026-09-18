import { z } from "zod";

export const consultaSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(100, "O nome deve ter no máximo 100 caracteres."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255, "O e-mail deve ter no máximo 255 caracteres."),
  whatsapp: z.string().trim().min(10, "Informe um WhatsApp válido.").max(30, "O WhatsApp deve ter no máximo 30 caracteres.")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido."),
  tipoNegocio: z.string().trim().min(2, "Informe o tipo de negócio.").max(120, "O tipo de negócio deve ter no máximo 120 caracteres."),
});

export type DadosConsulta = z.infer<typeof consultaSchema>;

export function validarConsulta(valor: unknown) {
  return consultaSchema.safeParse(valor);
}