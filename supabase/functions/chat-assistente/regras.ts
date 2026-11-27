// Como o sistema do Coworking 013 funciona (regras implementadas no banco e no painel).
// Enviado sempre ao assistente para ele responder dúvidas de funcionamento sem inventar.
// Ao mudar uma regra no sistema, atualize este texto junto.

const REGRAS_GERAIS = `
RESERVAS
- O cliente agenda pelo painel (/painel) ou pelo calendário; a reserva já nasce CONFIRMADA, sem aprovação da equipe, e aparece na hora no calendário do admin.
- O sistema só aceita a reserva se: a sala estiver livre (estações compartilhadas aceitam várias pessoas até a capacidade), o horário estiver dentro do expediente da unidade naquele dia da semana, não for feriado nacional e o cliente tiver saldo (plano ou créditos extras).
- Horários em blocos de 30 minutos. O expediente de cada unidade é configurado por dia da semana em Unidades; domingo começa fechado e feriados nacionais são sempre fechados.
- O cliente altera data/horário e cancela a própria reserva direto pelo painel, até 2 horas antes do início. A alteração mantém a sala e passa pelas mesmas validações (sala livre, expediente e saldo). Fica registrada nas observações da reserva.
- Cancelamento pelo cliente com 24h ou mais de antecedência devolve as horas ao saldo; com menos de 24h as horas ficam consumidas. Cancelamento feito pela equipe sempre devolve as horas. O motivo (2 a 180 caracteres) é obrigatório.
- Check-in é registrado pela equipe no calendário; o checkout é automático no fim do horário.

ORDEM DE CONSUMO DAS HORAS (sempre nesta ordem)
1. Primeiro as horas do PLANO do cliente (cota do período: semana, mês ou pacote).
2. Depois os CRÉDITOS EXTRAS (créditos comprados ou bônus adicionados pela equipe), começando pelo crédito que vence primeiro.
3. O que faltar é excedente: o cliente não consegue reservar sem saldo (é avisado para falar com a equipe). A equipe pode reservar mesmo assim, cobrando como hora adicional (planos Harmonia, que têm preço de hora adicional) ou avulso (preço da hora avulsa da sala).
- Estação compartilhada incluída no plano (planos com estação livre), de segunda a sábado das 8h às 20h, não consome horas.
- Sala que não faz parte do plano não usa a cota do plano: vai direto para os créditos extras.

PLANOS E CONTRATOS
- Tipos de regra: horas por semana (renova toda segunda), horas de reunião por mês, pacote de horas (ex.: Tranquilidade 6h, válido no período do contrato), sem horas (endereço fiscal/comercial) e avulso.
- Cada pacote desconta só as reservas feitas com ele; horas já pagas por um pacote anterior não descontam do novo.
- Na ficha do cliente (CRM > Empresas clientes): Renovar abre um novo período a partir do dia seguinte ao vencimento (ou hoje, se já venceu); Trocar encerra o plano atual e abre o novo; Encerrar finaliza o contrato.
- Plano vencido: novas horas não são cobertas. Plano que ainda não começou: não cobre datas anteriores ao início.
- Créditos extras são adicionados na ficha do cliente em "Adicionar créditos" (compra gera cobrança; bônus é gratuito), com validade opcional em dias.
`;

export function regrasDoSistema(agente: string) {
  if (agente === "admin") return REGRAS_GERAIS.trim();
  if (agente === "cliente") return REGRAS_GERAIS.split("PLANOS E CONTRATOS")[0].trim();
  return "";
}
