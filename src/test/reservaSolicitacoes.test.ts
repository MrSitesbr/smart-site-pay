import { describe, expect, it } from "vitest";
import { indexarPorReserva, podeSolicitarMudanca, type SolicitacaoReserva } from "@/lib/reservaSolicitacoes";

const agora = new Date("2026-10-23T10:00:00");

describe("podeSolicitarMudanca", () => {
  it("permite com 2h ou mais de antecedência", () => {
    expect(podeSolicitarMudanca({ data: "2026-10-23", hora_inicio: "12:00", status: "confirmada" }, agora)).toBe(true);
    expect(podeSolicitarMudanca({ data: "2026-10-24", hora_inicio: "08:00", status: "pendente" }, agora)).toBe(true);
  });

  it("bloqueia com menos de 2h ou depois do início", () => {
    expect(podeSolicitarMudanca({ data: "2026-10-23", hora_inicio: "11:30", status: "confirmada" }, agora)).toBe(false);
    expect(podeSolicitarMudanca({ data: "2026-10-23", hora_inicio: "09:00", status: "confirmada" }, agora)).toBe(false);
  });

  it("bloqueia reservas canceladas ou realizadas", () => {
    expect(podeSolicitarMudanca({ data: "2026-10-30", hora_inicio: "12:00", status: "cancelada" }, agora)).toBe(false);
    expect(podeSolicitarMudanca({ data: "2026-10-30", hora_inicio: "12:00", status: "realizada" }, agora)).toBe(false);
  });
});

describe("indexarPorReserva", () => {
  it("mantém o pedido mais recente de cada reserva", () => {
    const base = { cliente_corp_id: "c", tipo: "alteracao", mensagem: null, nova_data: null, novo_inicio: null, novo_fim: null, admin_resposta: null, resolved_at: null } as const;
    const lista: SolicitacaoReserva[] = [
      { ...base, id: "1", reservation_id: "r1", status: "recusada", created_at: "2026-10-20T10:00:00Z" },
      { ...base, id: "2", reservation_id: "r1", status: "pendente", created_at: "2026-10-22T10:00:00Z" },
    ];
    expect(indexarPorReserva(lista).r1.id).toBe("2");
  });
});
