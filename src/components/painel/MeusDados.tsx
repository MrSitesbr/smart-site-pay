import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MeusDados({ cliente, onSaved }: { cliente: any; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ ...cliente });
  const [saving, setSaving] = useState(false);

  if (!cliente?.id) {
    return <Card className="p-6 text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa. Fale com a equipe do Coworking 013.</Card>;
  }

  async function salvar() {
    setSaving(true);
    const { error } = await (supabase.from("clientes_corp") as any).update({
      razao_social: form.razao_social,
      cnpj: form.cnpj,
      responsavel_nome: form.responsavel_nome,
      responsavel_cpf: form.responsavel_cpf,
      responsavel_email: form.responsavel_email,
      responsavel_telefone: form.responsavel_telefone,
    }).eq("id", cliente.id);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar: " + error.message);
    toast.success("Dados atualizados");
    onSaved();
  }

  const field = (label: string, key: string, placeholder = "") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={form[key] || ""} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-heading font-black text-lg">Meus dados</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Razão social / Nome", "razao_social")}
        {field("CNPJ / CPF da empresa", "cnpj")}
        {field("Responsável", "responsavel_nome")}
        {field("CPF do responsável", "responsavel_cpf")}
        {field("E-mail de contato", "responsavel_email")}
        {field("WhatsApp", "responsavel_telefone")}
      </div>
      <p className="text-xs text-muted-foreground">Unidade, sala e plano são definidos pela equipe do Coworking 013. Para trocar de plano, use a aba "Meu plano".</p>
      <Button onClick={salvar} disabled={saving} className="w-fit">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar alterações
      </Button>
    </Card>
  );
}
