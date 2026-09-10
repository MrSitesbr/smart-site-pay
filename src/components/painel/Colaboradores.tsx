import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

type Func = { id?: string; nome: string; cargo?: string | null; email?: string | null; telefone?: string | null; cpf?: string | null };

const vazio: Func = { nome: "", cargo: "", email: "", telefone: "", cpf: "" };

export default function Colaboradores({ clienteId }: { clienteId?: string }) {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Func | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [clienteId]);

  async function carregar() {
    if (!clienteId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("funcionarios_cliente").select("*").eq("cliente_corp_id", clienteId).order("created_at", { ascending: false });
    setLista(data || []);
    setLoading(false);
  }

  async function salvar() {
    if (!form?.nome?.trim()) return toast.error("Informe o nome do colaborador");
    setSaving(true);
    const payload: any = {
      cliente_corp_id: clienteId,
      nome: form.nome.trim(),
      cargo: form.cargo || null,
      email: form.email || null,
      telefone: form.telefone || null,
      cpf: form.cpf || null,
    };
    const { error } = form.id
      ? await (supabase.from("funcionarios_cliente") as any).update(payload).eq("id", form.id)
      : await (supabase.from("funcionarios_cliente") as any).insert([payload]);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Colaborador salvo");
    setForm(null);
    carregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("funcionarios_cliente").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover: " + error.message);
    toast.success("Colaborador removido");
    carregar();
  }

  if (!clienteId) return <Card className="p-6 text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-black text-lg">Colaboradores ({lista.length})</h3>
        <Button size="sm" onClick={() => setForm({ ...vazio })}><Plus className="w-4 h-4 mr-2" /> Novo colaborador</Button>
      </div>

      {form && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">{form.id ? "Editar colaborador" : "Novo colaborador"}</h4>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar</Button>
        </Card>
      )}

      {loading ? <Card className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card> : lista.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum colaborador cadastrado.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((f) => (
            <Card key={f.id} className="p-4 flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-bold">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{[f.cargo, f.telefone, f.email].filter(Boolean).join(" · ") || "Colaborador autorizado"}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setForm(f)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remover(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
