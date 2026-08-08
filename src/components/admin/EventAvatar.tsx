import wobaLogo from "@/assets/woba-logo.png";
import { pastelFor, readableTextOn, WOBA_COLOR } from "@/lib/clientColors";

type Props = {
  name?: string;
  photoUrl?: string | null;
  isWoba?: boolean;
  size?: number;
  className?: string;
  color?: string; // cor de fundo customizada (hex). Sobrescreve o pastel automático.
};

export default function EventAvatar({ name = "?", photoUrl, isWoba, size = 28, className = "", color }: Props) {
  const dim = { width: size, height: size };
  const base = `inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${className}`;

  if (isWoba) {
    return (
      <span className={`${base} bg-white ring-1 ring-pink-200`} style={{ ...dim, background: "#fff" }} title="Woba">
        <img src={wobaLogo} alt="Woba" loading="lazy" style={{ width: size, height: size, objectFit: "contain" }} />
      </span>
    );
  }

  if (photoUrl) {
    return (
      <span className={base} style={dim}>
        <img src={photoUrl} alt={name} loading="lazy" style={{ width: size, height: size, objectFit: "cover" }} />
      </span>
    );
  }

  const initial = (name.trim()[0] || "?").toUpperCase();
  const bg = color || pastelFor(name);
  const fg = readableTextOn(bg);
  return (
    <span
      className={`${base} font-heading font-bold`}
      style={{ ...dim, background: bg, color: fg, fontSize: size * 0.45 }}
      title={name}
    >
      {initial}
    </span>
  );
}

export { WOBA_COLOR, pastelFor };
