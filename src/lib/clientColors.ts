// Paleta pastel usada como fallback determinístico para clientes sem cor customizada.
export const CLIENT_PASTELS = [
  "#FFD1DC", "#FFE4B5", "#FFFACD", "#D1F0D1", "#CDEEFD",
  "#E0D4F7", "#FBD4E4", "#D4F4E2", "#FDE2CF", "#DDECFF",
  "#F7C8E0", "#C8E6C9", "#FFE0AC", "#B5EAD7", "#E2C2FF",
];

// Cor oficial da Woba (rosa) — usada sempre para eventos identificados como Woba.
export const WOBA_COLOR = "#EC4899"; // tailwind pink-500

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function pastelFor(seed: string) {
  return CLIENT_PASTELS[hashStr(seed || "?") % CLIENT_PASTELS.length];
}

export type ColorOverrides = Record<string, string>; // email(lower) -> hex

export function getClientColor(opts: {
  name?: string;
  email?: string | null;
  isWoba?: boolean;
  overrides?: ColorOverrides;
}) {
  if (opts.isWoba) return WOBA_COLOR;
  const key = (opts.email || "").toLowerCase();
  if (key && opts.overrides && opts.overrides[key]) return opts.overrides[key];
  return pastelFor(key || opts.name || "?");
}

// Retorna texto legível (branco/preto) para uma cor de fundo hex.
export function readableTextOn(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? "#0f172a" : "#ffffff";
}
