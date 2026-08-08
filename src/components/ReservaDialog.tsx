import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarCheck, Loader2, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<null | { available: boolean; conflicts: number; capacity: number }>(null);
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

  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setAvailability(null); };

  const isDiaria = form.tipo === "diaria";
  const effective = isDiaria ? { ...form, hora_inicio: "09:00", hora_fim: "17:00" } : form;

  async function verificar() {
    if (!effective.data) { toast({ title: "Selecione a data" }); return; }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-availability", {
        body: {
          ambiente: effective.ambiente,
          data: effective.data,
          hora_inicio: effective.hora_inicio,
          hora_fim: effective.hora_fim,
        },
      });
      if (error) throw error;
      setAvailability(data);
    } catch (e: any) {
      toast({ title: "Erro ao verificar", description: e.message, variant: "destructive" });
    } finally { setChecking(false); }
  }

  async function reservar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Acesso restrito", description: "Somente pessoas cadastradas podem fazer reserva. Por favor, faça login ou crie uma conta.", variant: "destructive" });
      onOpenChange(false);
      navigate("/auth?redirect=/");
      return;
    }
    if (!form.nome || !form.email || !form.telefone || !effective.data) {
      toast({ title: "Preencha todos os campos" }); return;
    }
    if (!availability?.available) {
      toast({ title: "Verifique a disponibilidade antes de reservar" }); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("create-reservation", {
        body: { ...effective },
      });
      if (error) throw error;

      const ambLabel = AMBIENTES.find((a) => a.value === effective.ambiente)?.label;
      const msg = `Olá! Acabei de fazer uma reserva no Coworking 013:\n\n*${ambLabel}*\nData: ${effective.data}\nHorário: ${effective.hora_inicio} às ${effective.hora_fim}\nTipo: ${effective.tipo === "hora" ? "Por hora" : "Diária"}\n\n*Meus dados:*\nNome: ${form.nome}\nEmail: ${form.email}\nTelefone: ${form.telefone}\n${form.observacoes ? "Obs: " + form.observacoes : ""}\n\nAguardo a confirmação 🙏`;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
      toast({ title: "Reserva criada!", description: "Estamos te redirecionando ao WhatsApp para confirmação." });
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
            Escolha o ambiente, dia e horário. Verificamos a disponibilidade em tempo real no Google Calendar.
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
            <Button onClick={verificar} disabled={checking} variant="outline" className="rounded-full font-heading font-bold">
              {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-2" />}
              Verificar disponibilidade
            </Button>
            <Button onClick={reservar} disabled={loading || !availability?.available}
              className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Confirmar e enviar ao WhatsApp
            </Button>
          </div>

          {availability && (
            <div className={`rounded-xl p-4 flex items-center gap-3 ${availability.available ? "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100" : "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"}`}>
              {availability.available ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <div className="text-sm">
                {availability.available
                  ? `Disponível! ${effective.ambiente === "estacao" ? `${availability.capacity - availability.conflicts}/${availability.capacity} estações livres` : "Horário livre"}.`
                  : "Indisponível neste horário. Escolha outro horário ou data."}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
