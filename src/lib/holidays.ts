// Feriados nacionais + datas comemorativas (Brasil)
// Formato: 'MM-DD' → nome

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "N. Sra. Aparecida / Crianças",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-25": "Natal",
};

// Datas comemorativas (não são feriados, mas aparecem no calendário)
// NÃO incluir aqui datas móveis calculadas (Dia das Mães, Dia dos Pais)
const COMMEMORATIVE: Record<string, string> = {
  "01-25": "Aniversário de SP",
  "03-08": "Dia da Mulher",
  "04-22": "Descobrimento do Brasil",
  "06-12": "Dia dos Namorados",
  "06-24": "São João",
  "08-11": "Dia do Estudante",
  "09-21": "Dia da Árvore",
  "10-12": "Dia das Crianças",
  "10-15": "Dia do Professor",
  "10-31": "Halloween",
  "11-19": "Dia da Bandeira",
  "12-24": "Véspera de Natal",
  "12-31": "Véspera de Ano Novo",
};

function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// cache por ano: mapa completo (feriado + comemorativas) com nome
const cache = new Map<number, Map<string, { name: string; holiday: boolean }>>();

function build(year: number): Map<string, { name: string; holiday: boolean }> {
  if (cache.has(year)) return cache.get(year)!;
  const map = new Map<string, { name: string; holiday: boolean }>();

  Object.entries(FIXED_HOLIDAYS).forEach(([md, name]) =>
    map.set(`${year}-${md}`, { name, holiday: true })
  );

  const easterDate = easter(year);
  const addMovable = (offset: number, name: string) => {
    const d = new Date(easterDate);
    d.setDate(d.getDate() + offset);
    map.set(toKey(d), { name, holiday: true });
  };
  addMovable(-48, "Segunda de Carnaval");
  addMovable(-47, "Terça de Carnaval");
  addMovable(-46, "Quarta de Cinzas");
  addMovable(-2, "Sexta-feira Santa");
  addMovable(0, "Páscoa");
  addMovable(60, "Corpus Christi");

  Object.entries(COMMEMORATIVE).forEach(([md, name]) => {
    const key = `${year}-${md.slice(0, 5)}`;
    if (!map.has(key)) map.set(key, { name, holiday: false });
  });

  // Dia das Mães = 2º domingo de maio
  const may = new Date(year, 4, 1);
  const firstSunday = 1 + ((7 - may.getDay()) % 7);
  const mothersDay = new Date(year, 4, firstSunday + 7);
  map.set(toKey(mothersDay), { name: "Dia das Mães", holiday: false });

  // Dia dos Pais = 2º domingo de agosto
  const aug = new Date(year, 7, 1);
  const firstSundayAug = 1 + ((7 - aug.getDay()) % 7);
  const fathersDay = new Date(year, 7, firstSundayAug + 7);
  map.set(toKey(fathersDay), { name: "Dia dos Pais", holiday: false });

  cache.set(year, map);
  return map;
}

export function getDateInfo(d: Date): { name: string; holiday: boolean } | null {
  return build(d.getFullYear()).get(toKey(d)) || null;
}

export function isHoliday(d: Date): boolean {
  return !!build(d.getFullYear()).get(toKey(d))?.holiday;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(d: Date): boolean {
  return !isWeekend(d) && !isHoliday(d);
}
