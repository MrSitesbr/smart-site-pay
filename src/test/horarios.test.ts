import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { algumaUnidadeAberta, diaSemanaIso, horarioDoDia, type MapaHorarios } from "@/lib/horarios";
import { filtrarSalas } from "@/components/agenda/FiltroSalas";

const mapa: MapaHorarios = new Map([
  ["u1", [
    { unidade_id: "u1", dia_semana: 3, abre: "09:00", fecha: "18:00", fechado: false }, // quarta
    { unidade_id: "u1", dia_semana: 7, abre: "10:00", fecha: "14:00", fechado: false }, // domingo aberto
  ]],
  ["u2", [{ unidade_id: "u2", dia_semana: 3, abre: "08:00", fecha: "21:00", fechado: true }]],
]);

const quarta = new Date(2026, 10, 11, 12); // 11/11/2026
const domingo = new Date(2026, 10, 8, 12);
const feriado = new Date(2026, 10, 15, 12); // 15/11 (domingo, Proclamação da República)
const quinta = new Date(2026, 10, 12, 12);

describe("horarioDoDia", () => {
  it("usa o horário cadastrado para o dia da semana", () => {
    expect(diaSemanaIso(quarta)).toBe(3);
    expect(horarioDoDia(mapa, "u1", quarta)).toMatchObject({ abre: "09:00", fecha: "18:00", fechado: false });
  });
  it("respeita dia fechado pelo admin", () => {
    expect(horarioDoDia(mapa, "u2", quarta).fechado).toBe(true);
  });
  it("permite abrir no domingo quando o admin cadastra", () => {
    expect(horarioDoDia(mapa, "u1", domingo)).toMatchObject({ abre: "10:00", fecha: "14:00", fechado: false });
  });
  it("feriado nacional sempre fechado", () => {
    expect(horarioDoDia(mapa, "u1", feriado).fechado).toBe(true);
  });
  it("sem cadastro usa o horário geral e fecha no domingo", () => {
    expect(horarioDoDia(mapa, "u1", quinta, { abre: "08:00", fecha: "20:00" })).toMatchObject({ abre: "08:00", fecha: "20:00", fechado: false });
    expect(horarioDoDia(new Map(), "x", domingo).fechado).toBe(true);
  });
  it("algumaUnidadeAberta", () => {
    expect(algumaUnidadeAberta(mapa, ["u1", "u2"], quarta)).toBe(true);
    expect(algumaUnidadeAberta(mapa, ["u2"], quarta)).toBe(false);
  });
});

describe("filtrarSalas", () => {
  const salas = [
    { id: "a", nome: "A", recursos: ["janela", "pia"] },
    { id: "b", nome: "B", recursos: ["janela"] },
    { id: "c", nome: "C", recursos: [] },
  ];
  it("exige todos os recursos marcados", () => {
    expect(filtrarSalas(salas, { ocultas: [], recursos: ["janela", "pia"] }).map((s) => s.id)).toEqual(["a"]);
  });
  it("esconde salas desmarcadas", () => {
    expect(filtrarSalas(salas, { ocultas: ["b"], recursos: [] }).map((s) => s.id)).toEqual(["a", "c"]);
  });
});
