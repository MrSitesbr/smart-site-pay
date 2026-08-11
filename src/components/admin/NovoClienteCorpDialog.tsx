import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRazaoSocial(initialNome);
      setNomeResp("");
      setEmailResp("");
    }
  }, [open, initialNome]);

  async function save() {
    if (!razaoSocial) {
      toast({ title: "Razão Social é obrigatória", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("clientes_corp").insert({
      razao_social: razaoSocial,
      responsavel_nome: nomeResp,
      responsavel_email: emailResp
    }).select().single();

    if (error) {
      toast({ title: "Erro ao criar cliente corporativo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente corporativo criado" });
      onCreated?.(data);
      onOpenChange(false);
    }
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
