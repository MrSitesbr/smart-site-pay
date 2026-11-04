import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { iconeRecurso, type Recurso } from "@/lib/recursos";

export type FiltroSalasValor = { ocultas: string[]; recursos: string[] };
type SalaFiltro = { id: string; nome: string; unidadeNome?: string; recursos?: string[] | null };

const CHAVE = "agenda_filtro_salas";

/** Filtro salvo no navegador (só conveniência: falha ao ler/gravar não atrapalha a agenda). */
export function useFiltroSalas() {
  const [valor, setValor] = useState<FiltroSalasValor>(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (salvo && Array.isArray(salvo.ocultas) && Array.isArray(salvo.recursos)) return salvo;
    } catch { /* sem armazenamento: usa o padrão */ }
    return { ocultas: [], recursos: [] };
  });
  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify(valor)); } catch { /* ignora */ }
  }, [valor]);
  return [valor, setValor] as const;
}

/** Aplica o filtro: esconde salas desmarcadas e exige todos os recursos escolhidos. */
export function filtrarSalas<T extends SalaFiltro>(salas: T[], filtro: FiltroSalasValor) {
  return salas.filter((s) => !filtro.ocultas.includes(s.id) && filtro.recursos.every((r) => (s.recursos || []).includes(r)));
}

/** Botão compacto "Filtrar" para a linha do título do dia na agenda. */
export default function FiltroSalas({ salas, catalogo, valor, onChange }: {
  salas: SalaFiltro[];
  catalogo: Recurso[];
  valor: FiltroSalasValor;
  onChange: (v: FiltroSalasValor) => void;
}) {
  const ativos = valor.ocultas.filter((id) => salas.some((s) => s.id === id)).length + valor.recursos.length;
  const usados = catalogo.filter((r) => salas.some((s) => (s.recursos || []).includes(r.id)));
  const alternarSala = (id: string) =>
    onChange({ ...valor, ocultas: valor.ocultas.includes(id) ? valor.ocultas.filter((x) => x !== id) : [...valor.ocultas, id] });
  const alternarRecurso = (id: string) =>
    onChange({ ...valor, recursos: valor.recursos.includes(id) ? valor.recursos.filter((x) => x !== id) : [...valor.recursos, id] });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={ativos ? "default" : "outline"} size="sm" className="h-8 gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />Filtrar{ativos ? ` (${ativos})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        {usados.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">A sala precisa ter</p>
            <div className="flex flex-wrap gap-1.5">
              {usados.map((r) => {
                const Icone = iconeRecurso(r.icone);
                const marcado = valor.recursos.includes(r.id);
                return (
                  <button key={r.id} type="button" onClick={() => alternarRecurso(r.id)} aria-pressed={marcado}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${marcado ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    <Icone className="h-3.5 w-3.5" />{r.nome}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Salas exibidas</p>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {salas.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                <input type="checkbox" checked={!valor.ocultas.includes(s.id)} onChange={() => alternarSala(s.id)} className="h-4 w-4" />
                <span className="truncate">{s.nome}</span>
                {s.unidadeNome && <span className="ml-auto truncate text-[11px] text-muted-foreground">{s.unidadeNome}</span>}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ocultas: [], recursos: [] })} disabled={!ativos}>Limpar filtro</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
