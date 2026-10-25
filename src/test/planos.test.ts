import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { nivelUso, resumirSimulacao, type Cobertura } from "@/lib/planosApi";
import { reservasForaDaCota } from "@/components/admin/AdminContratoCliente";

const cov = (patch: Partial<Cobertura>): Cobertura => ({
  status: "ativo", regra: "semanal", contrato_id: "c", contrato_status: "ativo", plano_id: "p", plano_nome: "Harmonia Hora",
  plano_slug: "harmonia-hora", categoria: "harmonia", bloco_unico: false, data_inicio: null, data_fim: null, data_sugerida: false,
  dias_restantes: null, janela_inicio: null, janela_fim: null, cota: 1, usado: 0, saldo: 1, horas: 1, cobertas: 1, excedentes: 0,
  estacao: false, sala_fora_do_plano: false, permite_adicional: true, preco_adicional: 30, preco_avulso: 60, motivo: null, ...patch,
});

const reserva = (data: string, inicio: string, fim: string, id = `${data}-${inicio}`) => ({ id, data, hora_inicio: inicio, hora_fim: fim, status: "confirmada" });

describe("resumirSimulacao", () => {
  it("exige escolha quando sobra hora e o plano permite adicional", () => {
    const r = resumirSimulacao([cov({ cobertas: 1, excedentes: 1, horas: 2 })]);
    expect(r.excedentes).toBe(1);
    expect(r.permiteAdicional).toBe(true);
    expect(r.valorAdicional).toBe(30);
    expect(r.valorAvulso).toBe(60);
  });

  it("não exige escolha quando tudo está coberto", () => {
    const r = resumirSimulacao([cov({}), cov({ data: "x" })]);
    expect(r.excedentes).toBe(0);
    expect(r.cobertas).toBe(2);
  });
});

describe("nivelUso", () => {
  it("fica vermelho com saldo zerado ou plano vencido", () => {
    expect(nivelUso({ status: "ativo", cota: 1, saldo: 0, dias_restantes: 100 })).toBe("vermelho");
    expect(nivelUso({ status: "vencido", cota: 1, saldo: 1, dias_restantes: -1 })).toBe("vermelho");
  });
  it("fica amarelo perto do vencimento ou com saldo baixo", () => {
    expect(nivelUso({ status: "ativo", cota: 6, saldo: 1, dias_restantes: 60 })).toBe("amarelo");
    expect(nivelUso({ status: "ativo", cota: 6, saldo: 6, dias_restantes: 10 })).toBe("amarelo");
  });
  it("fica verde com folga", () => {
    expect(nivelUso({ status: "ativo", cota: 6, saldo: 5, dias_restantes: 60 })).toBe("verde");
  });
});

describe("reservasForaDaCota", () => {
  const futuro = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  // Segunda-feira daqui a pelo menos uma semana, para a semana inteira ficar no futuro.
  const segunda = (() => { const d = new Date(); d.setDate(d.getDate() + 7 + ((8 - d.getDay()) % 7)); return d.toISOString().slice(0, 10); })();
  const dia = (offset: number) => { const d = new Date(`${segunda}T12:00:00`); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };

  it("Harmonia Hora: só 1h por semana fica no plano", () => {
    const plano = { regra_uso: "semanal", horas_semana: 1, bloco_unico: false, duracao_meses: 6 };
    const fora = reservasForaDaCota([reserva(dia(0), "09:00", "10:00"), reserva(dia(2), "09:00", "10:30")], plano, futuro(0));
    expect(fora).toHaveLength(1);
    expect(fora[0].fora).toBe(1.5);
  });

  it("Harmonia Período: segundo bloco na mesma semana fica fora mesmo com horas sobrando", () => {
    const plano = { regra_uso: "semanal", horas_semana: 4, bloco_unico: true, duracao_meses: 6 };
    const fora = reservasForaDaCota([reserva(dia(0), "09:00", "11:00"), reserva(dia(1), "09:00", "10:00")], plano, futuro(0));
    expect(fora.map((r) => r.data)).toEqual([dia(1)]);
  });

  it("Endereço Fiscal sem horas: todas as reservas ficam fora", () => {
    const fora = reservasForaDaCota([reserva(dia(0), "09:00", "10:00")], { regra_uso: "sem_horas" }, futuro(0));
    expect(fora).toHaveLength(1);
  });

  it("ignora reservas canceladas e passadas", () => {
    const plano = { regra_uso: "semanal", horas_semana: 1 };
    const fora = reservasForaDaCota([{ ...reserva(dia(0), "09:00", "12:00"), status: "cancelada" }, reserva("2020-01-06", "09:00", "12:00")], plano, "2020-01-01");
    expect(fora).toHaveLength(0);
  });
});
