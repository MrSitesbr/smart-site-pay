import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";

type Pendencia = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  status: string;
  prioridade: number;
  responsavel: string | null;
  created_at: string;
};

const STATUS = [
  { v: "pendente", label: "Pendente" },
  { v: "em_andamento", label: "Em andamento" },
  { v: "entregue", label: "Entregue" },
];

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  em_andamento: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
};

export default function AdminPendencias() {
  const [itens, setItens] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("erp");
  const [responsavel, setResponsavel] = useState("dev");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase.from("pendencias" as any) as any)
      .select("*")
      .order("status", { ascending: true })
      .order("prioridade", { ascending: true })
      .order("created_at", { ascending: false });
    setItens((data as Pendencia[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!titulo.trim()) return toast({ title: "Informe o título", variant: "destructive" });
    setSaving(true);
    const { error } = await (supabase.from("pendencias" as any) as any).insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      categoria,
      responsavel,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    setTitulo(""); setDescricao("");
    toast({ title: "Pendência adicionada" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await (supabase.from("pendencias" as any) as any).update({ status }).eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover este item da lista?")) return;
    await (supabase.from("pendencias" as any) as any).delete().eq("id", id);
    load();
  }

  const abertas = itens.filter(i => i.status !== "entregue");
  const entregues = itens.filter(i => i.status === "entregue");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-black">Pendências do ERP</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento conjunto entre gestor e desenvolvedor.</p>
      </div>

      <Card className="p-4 grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label className="text-xs">Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Check-in de estação compartilhada" />
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="erp">ERP</SelectItem>
              <SelectItem value="crm">CRM</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Responsável</Label>
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dev">Desenvolvedor</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Descrição</Label>
          <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do que precisa ser feito…" />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={add} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Adicionar
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-heading font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Em aberto ({abertas.length})</h2>
            {abertas.length === 0 && <Card className="p-6 text-center text-muted-foreground text-sm">Nada pendente.</Card>}
            {abertas.map(i => (
              <Card key={i.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{i.titulo}</div>
                    {i.descricao && <div className="text-sm text-muted-foreground">{i.descricao}</div>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{i.categoria}</Badge>
                  <Badge variant="secondary">{i.responsavel === "gestor" ? "Gestor" : "Dev"}</Badge>
                  <Badge className={STATUS_STYLE[i.status]}>{STATUS.find(s => s.v === i.status)?.label || i.status}</Badge>
                  <div className="ml-auto flex gap-2">
                    {i.status === "pendente" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "em_andamento")}>Iniciar</Button>
                    )}
                    <Button size="sm" onClick={() => setStatus(i.id, "entregue")}>Concluir</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="font-heading font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Entregues ({entregues.length})</h2>
            {entregues.length === 0 && <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum item entregue ainda.</Card>}
            {entregues.map(i => (
              <Card key={i.id} className="p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium line-through text-muted-foreground">{i.titulo}</div>
                  <Badge variant="outline" className="mt-1">{i.categoria}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setStatus(i.id, "pendente")}>Reabrir</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
