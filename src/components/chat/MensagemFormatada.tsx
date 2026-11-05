import { Fragment, type ReactNode } from "react";

/** Só aceita links do próprio site (/caminho) ou http(s). Qualquer outra coisa vira texto. */
export function linkSeguro(url: string): string | null {
  const u = url.trim().replace(/[).,;:!?]+$/, "");
  if (/^\/(?!\/)[^\s<>"']*$/.test(u)) return u;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:" ? p.toString() : null;
  } catch {
    return null;
  }
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  const externo = /^https?:/i.test(href);
  return (
    <a href={href} target={externo ? "_blank" : undefined} rel={externo ? "noopener noreferrer" : undefined} className="font-medium underline underline-offset-2 break-words">
      {children}
    </a>
  );
}

/** Negrito **x**, links Markdown [texto](url) e endereços soltos — sem HTML, sem duplicar formatação. */
function linha(texto: string, chave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const regex = /\[([^\]]{1,200})\]\(([^)\s]{1,500})\)|\*\*([^*]{1,300})\*\*|(https?:\/\/[^\s<>"')]+)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    if (m[1] && m[2]) {
      const href = linkSeguro(m[2]);
      partes.push(href ? <Link key={`${chave}-${i++}`} href={href}>{m[1]}</Link> : m[1]);
    } else if (m[3]) {
      partes.push(<strong key={`${chave}-${i++}`}>{m[3]}</strong>);
    } else if (m[4]) {
      // Pontuação no fim ("veja https://x.com.") não faz parte do link.
      const limpo = m[4].replace(/[).,;:!?]+$/, "");
      const href = linkSeguro(limpo);
      partes.push(href ? <Link key={`${chave}-${i++}`} href={href}>{limpo}</Link> : limpo);
      if (m[4].length > limpo.length) partes.push(m[4].slice(limpo.length));
    }
    ultimo = regex.lastIndex;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export default function MensagemFormatada({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  const fecharLista = (k: number) => {
    if (!lista.length) return;
    blocos.push(<ul key={`l${k}`} className="my-1 list-disc space-y-0.5 pl-5">{lista.map((item, j) => <li key={j}>{linha(item, `l${k}-${j}`)}</li>)}</ul>);
    lista = [];
  };
  linhas.forEach((l, k) => {
    const item = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) { lista.push(item[1]); return; }
    fecharLista(k);
    if (l.trim()) blocos.push(<p key={k} className="whitespace-pre-wrap">{linha(l.replace(/^#{1,6}\s+/, ""), `p${k}`)}</p>);
  });
  fecharLista(linhas.length);
  return <div className="space-y-1.5 break-words">{blocos.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
