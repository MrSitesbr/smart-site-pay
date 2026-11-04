import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { friendlyError } from "@/lib/appErrors";
import { ICONES_RECURSO, iconeRecurso, slugRecurso, type Recurso } from "@/lib/recursos";

/** Marca os recursos da sala (janela, ar, pia...) e permite ao admin criar um recurso novo no catálogo. */
export default function RecursosSalaEditor({ catalogo, selecionados, onChange, onCatalogoChange }: {
  catalogo: Recurso[];
  selecionados: string[];
  onChange: (ids: string[]) => void;
  onCatalogoChange: (lista: Recurso[]) => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoIcone, setNovoIcone] = useState("check");
  const [salvando, setSalvando] = useState(false);

  const alternar = (id: string) => onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);

  async function criar() {
    const nome = novoNome.trim();
    const id = slugRecurso(nome);
    if (nome.length < 2 || id.length < 2) return toast.error("Informe o nome do recurso.");
    if (catalogo.some((r) => r.id === id)) { onChange(Array.from(new Set([...selecionados, id]))); setNovoNome(""); return; }
    setSalvando(true);
    const ordem = Math.max(0, ...catalogo.map((r) => r.ordem)) + 10;
    const { data, error } = await (supabase.from("sala_recursos" as any) as any)
      .insert({ id, nome, icone: novoIcone, ordem }).select().single();
    setSalvando(false);
    if (error) return toast.error(friendlyError(error, "Não foi possível criar o recurso."));
    onCatalogoChange([...catalogo, data as Recurso]);
    onChange([...selecionados, id]);
    setNovoNome("");
    toast.success("Recurso criado");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalogo.filter((r) => r.ativo || selecionados.includes(r.id)).map((r) => {
          const Icone = iconeRecurso(r.icone);
          const marcado = selecionados.includes(r.id);
          return (
            <label key={r.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition ${marcado ? "border-brand-orange bg-brand-orange/5" : "hover:bg-muted"}`}>
              <input type="checkbox" checked={marcado} onChange={() => alternar(r.id)} className="h-4 w-4" />
              <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{r.nome}</span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Novo recurso (ex.: frigobar)" maxLength={60} className="h-9" />
        <Select value={novoIcone} onValueChange={setNovoIcone}>
          <SelectTrigger className="h-9 sm:w-32" aria-label="Ícone do recurso"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ICONES_RECURSO).map(([nome, Icone]) => (
              <SelectItem key={nome} value={nome}><span className="flex items-center gap-2"><Icone className="h-4 w-4" />{nome}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={criar} disabled={salvando}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
      </div>
    </div>
  );
}
