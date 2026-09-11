import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AMBIENTES = [
  { value: "estacao", label: "Estação de Trabalho" },
  { value: "sala_privativa", label: "Sala Privativa" },
  { value: "sala_reuniao", label: "Sala de Reunião" },
];

const HORAS = Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);
const WHATSAPP = "5513992037957";

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmbiente?: string;
  defaultData?: string;
}

export default function ReservaDialog({ open, onOpenChange, defaultAmbiente, defaultData }: ReservaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "",
    ambiente: defaultAmbiente || "estacao",
    tipo: "hora",
    data: defaultData || "",
    hora_inicio: "09:00",
    hora_fim: "10:00",
    observacoes: "",
  });

  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      setForm((f) => ({
        ...f,
        nome: f.nome || (u.user_metadata as any)?.nome || "",
        telefone: f.telefone || (u.user_metadata as any)?.telefone || "",
        email: f.email || u.email || "",
      }));
    });
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const isDiaria = form.tipo === "diaria";
  const effective = isDiaria ? { ...form, hora_inicio: "09:00", hora_fim: "17:00" } : form;

  async function reservar() {
    if (!form.nome || !form.email || !form.telefone || !effective.data) {
      toast({ title: "Preencha nome, e-mail, telefone e data" });
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ambLabel = AMBIENTES.find((a) => a.value === effective.ambiente)?.label || effective.ambiente;
      const tipoLabel = effective.tipo === "hora" ? "Por hora" : "Diária";
      const observacoes = [
        `Solicitação de reserva via WhatsApp.`,
        `Ambiente: ${ambLabel}.`,
        `Tipo: ${tipoLabel}.`,
        `Data: ${effective.data}.`,
        `Horário: ${effective.hora_inicio} às ${effective.hora_fim}.`,
        form.observacoes ? `Observações: ${form.observacoes}` : "",
      ].filter(Boolean).join(" ");

      const { error } = await supabase.from("contract_requests").insert({
        user_id: userData.user?.id || null,
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        ambiente: effective.ambiente,
        plano_tipo: effective.tipo,
        preco: 0,
        data_inicio: effective.data,
        dias_selecionados: [effective.data],
        observacoes,
        origem: "Reserva via WhatsApp",
        status: "pendente",
      });
      if (error) throw error;

      const msg = `Olá! Acabei de fazer uma reserva no Coworking 013:\n\n*${ambLabel}*\nData: ${effective.data}\nHorário: ${effective.hora_inicio} às ${effective.hora_fim}\nTipo: ${effective.tipo === "hora" ? "Por hora" : "Diária"}\n\n*Meus dados:*\nNome: ${form.nome}\nEmail: ${form.email}\nTelefone: ${form.telefone}\n${form.observacoes ? "Obs: " + form.observacoes : ""}\n\nAguardo a confirmação 🙏`;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
      toast({ title: "Solicitação enviada!", description: "Seus dados foram registrados e o WhatsApp será aberto para confirmação." });
      setTimeout(() => onOpenChange(false), 1500);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading font-black text-2xl md:text-3xl">
            Faça sua <span className="text-secondary">reserva</span>
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da reserva e envie sua solicitação pelo WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome completo</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(13) 9..." />
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={(v) => set("ambiente", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMBIENTES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora">Por hora</SelectItem>
                  <SelectItem value="diaria">Diária (09:00 - 17:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            {!isDiaria && (
              <>
                <div>
                  <Label>Hora início</Label>
                  <Select value={form.hora_inicio} onValueChange={(v) => set("hora_inicio", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hora fim</Label>
                  <Select value={form.hora_fim} onValueChange={(v) => set("hora_fim", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={reservar} disabled={loading || !form.nome || !form.email || !form.telefone || !effective.data}
              className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Enviar solicitação ao WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
