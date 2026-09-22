export type PriceInput = { tipo: "hora" | "diaria"; horas: number; precoHora: number | null; precoDiaria: number | null; saldo: number };

export type PriceResult = {
  horas: number;
  cobertas: number;
  excedentes: number;
  saldoDepois: number;
  valor: number | null;
};

export function calculateReservationPrice({ tipo, horas, precoHora, precoDiaria, saldo }: PriceInput): PriceResult {
  const cobertas = Math.min(Math.max(0, saldo), Math.max(0, horas));
  const excedentes = Math.max(0, horas - cobertas);
  const valor = excedentes === 0
    ? 0
    : tipo === "diaria"
      ? precoDiaria
      : precoHora == null ? null : excedentes * precoHora;
  return { horas, cobertas, excedentes, saldoDepois: Math.max(0, saldo - cobertas), valor };
}

export function allocateRecurringPrices(inputs: Omit<PriceInput, "saldo">[], initialBalance: number) {
  let saldo = initialBalance;
  return inputs.map((input) => {
    const result = calculateReservationPrice({ ...input, saldo });
    saldo = result.saldoDepois;
    return result;
  });
}