import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialNome?: string;
  onCreated?: (cliente: any) => void;
};

export default function NovoClienteCorpDialog({ open, onOpenChange, initialNome = "", onCreated }: Props) {
  const [razaoSocial, setRazaoSocial] = useState(initialNome);
  const [nomeResp, setNomeResp] = useState("");
  const [emailResp, setEmailResp] = useState("");
  const [telResp, setTelResp] = useState("");
  const [cpfResp, setCpfResp] = useState("");
  const [planoId, setPlanoId] = useState<string | null>(null);
  const [accessPassword, setAccessPassword] = useState("");
  const [planos, setPlanos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRazaoSocial(initialNome);
      setNomeResp("");
      setEmailResp("");
      setTelResp("");
      setCpfResp("");
      setPlanoId(null);
      setAccessPassword("");
      fetchPlanos();
    }
  }, [open, initialNome]);

  async function fetchPlanos() {
    const { data } = await supabase.from("planos").select("id, nome");
    setPlanos(data || []);
  }

  async function save() {
    if (!razaoSocial) {
      toast({ title: "Razão Social é obrigatória", variant: "destructive" });
      return;
    }
    if (accessPassword && accessPassword.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: clientesExistentes, error: buscaErr } = await supabase
      .from("clientes_corp")
      .select("id, razao_social, responsavel_email, responsavel_telefone");

    if (buscaErr) {
      toast({ title: "Erro ao verificar cliente corporativo", description: buscaErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const match = (clientesExistentes || []).find((cliente: any) => {
      const sameName = cliente.razao_social?.trim().toLowerCase() === razaoSocial.trim().toLowerCase();
      const sameEmail = Boolean(emailResp) && cliente.responsavel_email?.trim().toLowerCase() === emailResp.trim().toLowerCase();
      const samePhone = Boolean(telResp) && cliente.responsavel_telefone?.trim().replace(/\D/g, "") === telResp.replace(/\D/g, "");
      return sameName || sameEmail || samePhone;
    });

    const payload = {
      razao_social: razaoSocial,
      responsavel_nome: nomeResp,
      responsavel_email: emailResp,
      responsavel_telefone: telResp,
      // @ts-ignore
      responsavel_cpf: cpfResp,
      // @ts-ignore
      plano_id: planoId
    };

    let result: any = null;
    if (match) {
      const { data, error } = await supabase.from("clientes_corp").update(payload).eq("id", match.id).select().single();
      result = data;
      if (error) {
        toast({ title: "Erro ao atualizar cliente corporativo", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("clientes_corp").insert(payload).select().single();
      result = data;
      if (error) {
        toast({ title: "Erro ao criar cliente corporativo", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: match ? "Cliente corporativo atualizado" : "Cliente corporativo criado" });
    if (accessPassword) {
      const { data: pwData, error: passwordError } = await supabase.functions.invoke("admin-set-client-password", {
        body: { cliente_id: result.id, password: accessPassword },
        headers: adminFnHeaders(),
      });
      const pwErr = (pwData as any)?.error || passwordError?.message;
      if (pwErr) toast({ title: "Cliente salvo, mas a senha não foi definida", description: pwErr, variant: "destructive" });
    }
    onCreated?.(result);
    onOpenChange(false);
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Novo Cliente Corporativo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Razão Social</Label>
            <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="grid gap-2">
            <Label>Nome do Responsável</Label>
            <Input value={nomeResp} onChange={(e) => setNomeResp(e.target.value)} placeholder="Responsável" />
          </div>
          <div className="grid gap-2">
            <Label>Email do Responsável</Label>
            <Input type="email" value={emailResp} onChange={(e) => setEmailResp(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="grid gap-2">
            <Label>CPF do Responsável</Label>
            <Input value={cpfResp} onChange={(e) => setCpfResp(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="grid gap-2">
            <Label>Whatsapp do Responsável</Label>
            <Input value={telResp} onChange={(e) => setTelResp(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="grid gap-2">
            <Label>Plano (Opcional)</Label>
            <Select 
              value={planoId || ""} 
              onValueChange={val => setPlanoId(val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem plano</SelectItem>
                {planos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Senha de acesso (Opcional)</Label>
            <Input type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Cliente
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  );
}
