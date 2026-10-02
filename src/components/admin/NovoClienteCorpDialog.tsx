import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { friendlyError } from "@/lib/appErrors";
import { passwordSchema } from "@/lib/validation";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialNome?: string;
  onCreated?: (cliente: { id: string }) => void;
};

export default function NovoClienteCorpDialog({ open, onOpenChange, initialNome = "", onCreated }: Props) {
  const [razaoSocial, setRazaoSocial] = useState(initialNome);
  const [nomeResp, setNomeResp] = useState("");
  const [emailResp, setEmailResp] = useState("");
  const [telResp, setTelResp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cpfResp, setCpfResp] = useState("");
  const [planoId, setPlanoId] = useState<string | null>(null);
  const [accessPassword, setAccessPassword] = useState("");
  const [confirmAccessPassword, setConfirmAccessPassword] = useState("");
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [planos, setPlanos] = useState<Array<{ id: string; nome: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRazaoSocial(initialNome);
      setNomeResp("");
      setEmailResp("");
      setTelResp("");
      setEndereco("");
      setCpfResp("");
      setPlanoId(null);
      setAccessPassword("");
      setConfirmAccessPassword("");
      setShowAccessPassword(false);
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
    const passwordResult = passwordSchema.safeParse(accessPassword);
    if (!passwordResult.success) {
      toast({ title: passwordResult.error.issues[0]?.message || "Informe uma senha válida.", variant: "destructive" });
      return;
    }
    if (accessPassword !== confirmAccessPassword) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast({ title: "Sessão administrativa expirada", description: "Entre novamente no painel antes de salvar o cliente e a senha.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: clientesExistentes, error: buscaErr } = await supabase
      .from("clientes_corp")
      .select("id, razao_social, responsavel_email, deleted_at");

    if (buscaErr) {
      toast({ title: "Erro ao verificar cliente corporativo", description: friendlyError(buscaErr), variant: "destructive" });
      setSaving(false);
      return;
    }

    const match = (clientesExistentes || []).find((cliente) => {
      return Boolean(emailResp.trim()) && cliente.responsavel_email?.trim().toLowerCase() === emailResp.trim().toLowerCase();
    });

    if (match) {
      let clienteExistente = match;
      if (match.deleted_at) {
        const { data, error } = await supabase
          .from("clientes_corp")
          .update({ deleted_at: null })
          .eq("id", match.id)
          .select("id, razao_social, responsavel_email")
          .single();
        if (error) {
          toast({ title: "Não foi possível restaurar o cliente", description: friendlyError(error), variant: "destructive" });
          setSaving(false);
          return;
        }
        clienteExistente = data;
      }

      toast({ title: "Cliente já cadastrado", description: "Abrindo os dados do cliente existente." });
      onCreated?.(clienteExistente);
      onOpenChange(false);
      setSaving(false);
      return;
    }

    const payload = {
      razao_social: razaoSocial,
      responsavel_nome: nomeResp,
      responsavel_email: emailResp,
      responsavel_telefone: telResp,
      endereco,
      responsavel_cpf: cpfResp,
      plano_id: planoId
    };

    const { data: result, error } = await supabase.from("clientes_corp").insert(payload).select().single();
    if (error) {
      toast({ title: "Erro ao criar cliente corporativo", description: friendlyError(error), variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Cliente corporativo criado" });
    if (accessPassword) {
      const { data: pwData, error: passwordError } = await supabase.functions.invoke("admin-set-client-password", {
        body: { cliente_id: result.id, password: accessPassword },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const passwordResult = pwData as { ok?: boolean; error?: string } | null;
      let pwErr = passwordResult?.error;
      if (passwordError) {
        const response = (passwordError as { context?: Response }).context;
        const errorBody = response instanceof Response
          ? await response.clone().json().catch(() => null) as { error?: string; message?: string } | null
          : null;
        pwErr = errorBody?.error || errorBody?.message || passwordError.message;
      }
      if (pwErr || !passwordResult?.ok) {
        toast({
          title: "Cliente salvo, mas a senha não foi definida",
          description: pwErr || "A atualização da senha não foi confirmada pelo sistema.",
          variant: "destructive",
        });
        onCreated?.(result);
        onOpenChange(false);
        setSaving(false);
        return;
      }
      toast({ title: "Senha de acesso atualizada e confirmada" });
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
            <Label>Endereço</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade e CEP" />
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
            <Label htmlFor="cliente-access-password">Senha de acesso *</Label>
            <div className="relative">
              <Input
                id="cliente-access-password"
                type={showAccessPassword ? "text" : "password"}
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres, letra, número e símbolo"
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccessPassword((visible) => !visible)}
                aria-label={showAccessPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showAccessPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showAccessPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cliente-confirm-access-password">Confirmar senha *</Label>
            <Input
              id="cliente-confirm-access-password"
              type={showAccessPassword ? "text" : "password"}
              value={confirmAccessPassword}
              onChange={(e) => setConfirmAccessPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
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
