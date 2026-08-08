// Helpers para gerar link de cobrança via WhatsApp (PIX)
export const PIX_KEY = "coworkingkennedy@gmail.com";
export const PIX_TITULAR = "Coworking Kennedy";

const RATES: Record<string, { hora: number; diaria: number }> = {
  estacao: { hora: 20, diaria: 65 },
  sala_privativa: { hora: 40, diaria: 150 },
  sala_reuniao: { hora: 90, diaria: 450 },
};

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação de Trabalho",
  sala_privativa: "Sala Privativa",
  sala_reuniao: "Sala de Reunião",
};

export function calcularValorReserva(r: {
  ambiente: string; tipo: string; hora_inicio?: string; hora_fim?: string; preco?: number | null;
}): number {
  if (r.preco != null && !isNaN(Number(r.preco))) return Number(r.preco);
  const rate = RATES[r.ambiente] || RATES.estacao;
  if (r.tipo === "diaria") return rate.diaria;
  if (!r.hora_inicio || !r.hora_fim) return 0;
  const [h1, m1] = r.hora_inicio.slice(0,5).split(":").map(Number);
  const [h2, m2] = r.hora_fim.slice(0,5).split(":").map(Number);
  const horas = (h2*60 + m2 - h1*60 - m1) / 60;
  return Math.ceil(Math.max(0, horas)) * rate.hora;
}

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// Normaliza telefone p/ wa.me (apenas dígitos; adiciona 55 se BR sem código)
export function normalizarTelefone(tel: string): string {
  const d = (tel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length >= 10 && d.length <= 11) return "55" + d;
  return d;
}

type CobrancaParams = {
  nome: string;
  telefone: string;
  valor: number;
  descricao: string;
  vencimento?: string; // texto
};

export function montarMensagemCobranca({ nome, valor, descricao, vencimento }: CobrancaParams): string {
  const primeiro = (nome || "").trim().split(" ")[0] || "";
  return [
    `Ola${primeiro ? ", " + primeiro : ""}!`,
    ``,
    `Segue a cobranca referente a:`,
    `- ${descricao}`,
    `- Valor: ${fmtBRL(valor)}`,
    vencimento ? `- Vencimento: ${vencimento}` : ``,
    ``,
    `Pagamento via PIX`,
    `Chave (e-mail): ${PIX_KEY}`,
    `Titular: ${PIX_TITULAR}`,
    ``,
    `Apos o pagamento, envie o comprovante por aqui, por favor.`,
    `Qualquer duvida, estamos a disposicao!`,
    ``,
    `-- Coworking Kennedy`,
  ].filter(Boolean).join("\n");
}

export function linkCobrancaWhatsApp(params: CobrancaParams): string {
  const tel = normalizarTelefone(params.telefone);
  const msg = encodeURIComponent(montarMensagemCobranca(params));
  return tel
    ? `https://wa.me/${tel}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
}

export function linkWhatsAppWeb(telefone: string, texto: string): string {
  const tel = normalizarTelefone(telefone);
  const msg = encodeURIComponent(texto);
  return tel
    ? `https://wa.me/${tel}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
}

export function descricaoReserva(r: any): string {
  const amb = AMBIENTE_LABEL[r.ambiente] || r.ambiente;
  const isDiaria = r.tipo === "diaria";
  const tipo = isDiaria ? "Diaria" : "Por Hora";
  const data = r.data ? new Date(r.data + "T00:00").toLocaleDateString("pt-BR") : "";
  const hi = isDiaria ? "09:00" : (r.hora_inicio || "").slice(0,5);
  const hf = isDiaria ? "17:00" : (r.hora_fim || "").slice(0,5);
  return `Reserva ${amb} (${tipo}) - ${data}${hi && hf ? ` ${hi}-${hf}` : ""}`;
}

export function descricaoContrato(c: any): string {
  const amb = AMBIENTE_LABEL[c.ambiente] || c.ambiente;
  const plano = c.plano_tipo ? ` · ${c.plano_tipo}` : "";
  return `Contrato ${amb}${plano}`;
}
