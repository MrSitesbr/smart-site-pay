import { describe, expect, it } from "vitest";
import { allocateRecurringPrices, calculateReservationPrice } from "@/lib/reservationPricing";
import { isBookableDay } from "@/lib/holidays";

describe("reservation pricing", () => {
  it("uses the plan balance before charging excess hours", () => {
    expect(calculateReservationPrice({ tipo: "hora", horas: 4, saldo: 2, precoHora: 30, precoDiaria: 150 })).toEqual({
      horas: 4, cobertas: 2, excedentes: 2, saldoDepois: 0, valor: 60,
    });
  });

  it("consumes recurring plan balance progressively", () => {
    const result = allocateRecurringPrices([
      { tipo: "hora", horas: 4, precoHora: 25, precoDiaria: 120 },
      { tipo: "hora", horas: 4, precoHora: 25, precoDiaria: 120 },
    ], 6);
    expect(result.map((item) => [item.cobertas, item.excedentes, item.valor])).toEqual([[4, 0, 0], [2, 2, 50]]);
  });

  it("keeps a missing rate as under consultation", () => {
    expect(calculateReservationPrice({ tipo: "hora", horas: 2, saldo: 0, precoHora: null, precoDiaria: null }).valor).toBeNull();
  });
});

describe("booking days", () => {
  it("allows Saturday and blocks Sunday", () => {
    expect(isBookableDay(new Date(2026, 8, 26))).toBe(true);
    expect(isBookableDay(new Date(2026, 8, 27))).toBe(false);
  });
});