import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarSearch, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmbiente?: string;
  defaultData?: string;
}

export default function ReservaDialog({ open, onOpenChange }: ReservaDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    tipoNegocio: "",
  });

  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      setForm((f) => ({
        ...f,
        nome: f.nome || String(u.user_metadata?.nome || ""),
        whatsapp: f.whatsapp || String(u.user_metadata?.telefone || ""),
        email: f.email || u.email || "",
      }));
    });
  }, [open]);

  const set = (campo: keyof typeof form, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

  async function consultar() {
    if (!form.nome.trim() || !form.email.trim() || !form.whatsapp.trim() || !form.tipoNegocio.trim()) {
      toast({ title: "Preencha todos os campos" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("submit_public_consultation", {
      p_nome: form.nome.trim(),
      p_email: form.email.trim(),
      p_whatsapp: form.whatsapp.trim(),
      p_tipo_negocio: form.tipoNegocio.trim(),
    });
    setLoading(false);
    if (error) {
      toast({ title: "Não foi possível consultar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Consulta registrada", description: "Agora escolha uma sala, data e horário." });
    navigate("/reservar/calendario");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black md:text-3xl">Consulte</DialogTitle>
          <DialogDescription>
            Informe seus dados para consultar a disponibilidade das salas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome completo</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(13) 9..." />
            </div>
            <div>
              <Label>Tipo de negócio</Label>
              <Input value={form.tipoNegocio} onChange={(e) => set("tipoNegocio", e.target.value)} placeholder="Ex.: advocacia, saúde, tecnologia" />
            </div>
          </div>

          <div className="border-t pt-4">
            <Button onClick={() => void consultar()} disabled={loading || !form.nome || !form.email || !form.whatsapp || !form.tipoNegocio} className="w-full font-heading font-bold">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarSearch className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
