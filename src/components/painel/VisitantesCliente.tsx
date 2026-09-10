import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const vazio = { nome: "", documento: "", observacoes: "", data: "", hora: "" };

export default function VisitantesCliente({ clienteId, salaId }: { clienteId?: string; salaId?: string | null }) {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [clienteId]);

  async function carregar() {
    if (!clienteId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("visitantes").select("*, salas(nome)").eq("cliente_corp_id", clienteId).order("created_at", { ascending: false });
    setLista(data || []);
    setLoading(false);
  }

  function editar(v: any) {
    const dt = v.data_hora_prevista ? new Date(v.data_hora_prevista) : null;
    setForm({
      id: v.id,
      nome: v.nome || "",
      documento: v.documento || "",
      observacoes: v.observacoes || "",
      data: dt ? dt.toISOString().slice(0, 10) : "",
      hora: dt ? dt.toTimeString().slice(0, 5) : "",
    });
  }

  async function salvar() {
    if (!form?.nome?.trim()) return toast.error("Informe o nome do visitante");
    setSaving(true);
    const dataHora = form.data ? new Date(`${form.data}T${form.hora || "09:00"}:00`).toISOString() : null;
    const payload: any = {
      cliente_corp_id: clienteId,
      sala_id: salaId || null,
      nome: form.nome.trim(),
      documento: form.documento || null,
      observacoes: form.observacoes || null,
      data_hora_prevista: dataHora,
    };
    const { error } = form.id
      ? await (supabase.from("visitantes") as any).update(payload).eq("id", form.id)
      : await (supabase.from("visitantes") as any).insert([payload]);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Visitante salvo");
    setForm(null);
    carregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("visitantes").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover: " + error.message);
    toast.success("Visitante removido");
    carregar();
  }

  if (!clienteId) return <Card className="p-6 text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-black text-lg">Visitantes ({lista.length})</h3>
        <Button size="sm" onClick={() => setForm({ ...vazio })}><Plus className="w-4 h-4 mr-2" /> Novo visitante</Button>
      </div>

      {form && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">{form.id ? "Editar visitante" : "Novo visitante"}</h4>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Documento</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data prevista (opcional)</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div className="space-y-2"><Label>Hora prevista</Label><Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} disabled={!form.data} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Sem data, o visitante fica apenas cadastrado para uso futuro.</p>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar</Button>
        </Card>
      )}

      {loading ? <Card className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card> : lista.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum visitante cadastrado.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((v) => (
            <Card key={v.id} className="p-4 flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-bold">{v.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {v.salas?.nome || "Sem sala"}{v.data_hora_prevista ? ` · ${new Date(v.data_hora_prevista).toLocaleString("pt-BR")}` : " · apenas cadastro"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => editar(v)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remover(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
