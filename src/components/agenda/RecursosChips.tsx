import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { carregarRecursos, iconeRecurso, type Recurso } from "@/lib/recursos";

let cache: Promise<Recurso[]> | null = null;

/** Catálogo de recursos das salas, carregado uma vez por página. */
export function useRecursos() {
  const [lista, setLista] = useState<Recurso[]>([]);
  useEffect(() => {
    if (!cache) cache = carregarRecursos().catch(() => { cache = null; return []; });
    let ativo = true;
    cache.then((r) => { if (ativo) setLista(r); });
    return () => { ativo = false; };
  }, []);
  return lista;
}

const ordenar = (catalogo: Recurso[], ids: string[] | null | undefined) =>
  catalogo.filter((r) => (ids || []).includes(r.id));

/** Recursos da sala com ícone e nome (diálogo da sala, detalhe no admin). */
export function RecursosChips({ ids, catalogo }: { ids: string[] | null | undefined; catalogo: Recurso[] }) {
  const itens = ordenar(catalogo, ids);
  if (!itens.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {itens.map((r) => {
        const Icone = iconeRecurso(r.icone);
        return (
          <span key={r.id} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
            <Icone className="h-3.5 w-3.5 text-muted-foreground" />{r.nome}
          </span>
        );
      })}
    </div>
  );
}

/** Até `max` ícones pequenos com dica (cabeçalho das colunas da grade). */
export function RecursosIcones({ ids, catalogo, max = 4 }: { ids: string[] | null | undefined; catalogo: Recurso[]; max?: number }) {
  const itens = ordenar(catalogo, ids);
  if (!itens.length) return null;
  const extras = itens.length - max;
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {itens.slice(0, max).map((r) => {
        const Icone = iconeRecurso(r.icone);
        return (
          <Tooltip key={r.id}>
            <TooltipTrigger asChild><span aria-label={r.nome}><Icone className="h-3 w-3" /></span></TooltipTrigger>
            <TooltipContent>{r.nome}</TooltipContent>
          </Tooltip>
        );
      })}
      {extras > 0 && <span className="text-[10px]">+{extras}</span>}
    </span>
  );
}
