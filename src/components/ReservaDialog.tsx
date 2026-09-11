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

const TIPOS_LOCACAO = [
  { value: "locacao_mensal", label: "Locação Mensal" },
  { value: "locacao_periodo", label: "Locação por Período" },
];

const SUBTIPOS_PERIODO = [
  { value: "pacote_mensal", label: "Pacote Mensal" },
  { value: "locacao_avulsa", label: "Locação Avulsa" },
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
  const [salas, setSalas] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    sala_id: defaultAmbiente || "",
    tipo_locacao: "locacao_mensal",
    subtipo_periodo: "pacote_mensal",
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

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("salas").select("*").neq("status", "oculto").order("nome");
      setSalas(data || []);
      if ((data || []).length && !form.sala_id) {
        setForm((f) => ({ ...f, sala_id: data[0].id }));
      }
    })();
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const sala = salas.find((s) => s.id === form.sala_id);
  const isMensal = form.tipo_locacao === "locacao_mensal";

  const precoSelecionado = (() => {
    if (!sala) return null;
    if (isMensal) return sala.preco_locacao_mensal ?? null;
    if (form.subtipo_periodo === "pacote_mensal") return sala.preco_periodo_pacote_mensal ?? null;
    return sala.preco_periodo_locacao_avulsa ?? null;
  })();

  async function reservar() {
    if (!form.nome || !form.email || !form.telefone || !form.sala_id || !form.data) {
      toast({ title: "Preencha nome, e-mail, telefone, sala e data" });
      return;
    }
    if (!isMensal && (!form.hora_inicio || !form.hora_fim)) {
      toast({ title: "Informe horário para locação por período" });
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const observacoes = [
        `Solicitação de reserva via WhatsApp.`,
        `Sala: ${sala?.nome || form.sala_id}.`,
        `Tipo: ${isMensal ? "Locação Mensal" : form.subtipo_periodo === "pacote_mensal" ? "Pacote Mensal" : "Locação Avulsa"}.`,
        `Data: ${form.data}.`,
        isMensal ? "" : `Horário: ${form.hora_inicio} às ${form.hora_fim}.`,
        form.observacoes ? `Observações: ${form.observacoes}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const { error } = await supabase.from("contract_requests").insert({
        user_id: userData.user?.id || null,
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        ambiente: form.sala_id,
        plano_tipo: form.tipo_locacao,
        preco: precoSelecionado ?? 0,
        data_inicio: form.data,
        dias_selecionados: [form.data],
        observacoes,
        origem: "Reserva via WhatsApp",
        status: "pendente",
      });
      if (error) throw error;

      const msg = `Olá! Acabei de fazer uma reserva no Coworking 013:\n\n*${sala?.nome || "Sala"}*\nData: ${form.data}\n${isMensal ? "Tipo: Locação Mensal" : `Horário: ${form.hora_inicio} às ${form.hora_fim}`}\nTipo: ${isMensal ? "Locação Mensal" : form.subtipo_periodo === "pacote_mensal" ? "Pacote Mensal" : "Locação Avulsa"}\n\n*Meus dados:*\nNome: ${form.nome}\nEmail: ${form.email}\nTelefone: ${form.telefone}\n${form.observacoes ? "Obs: " + form.observacoes : ""}\n\nAguardo a confirmação 🙏`;
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
              <Label>Sala</Label>
              <Select value={form.sala_id} onValueChange={(v) => set("sala_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {salas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} • {s.tipo_locacao === "locacao_mensal" ? "Locação Mensal" : s.subtipo_periodo === "pacote_mensal" ? "Pacote Mensal" : "Locação Avulsa"} • {s.status === "disponivel" ? "Disponível" : s.status === "indisponivel" ? "Indisponível" : "Oculto"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Locação</Label>
              <Select value={form.tipo_locacao} onValueChange={(v) => set("tipo_locacao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LOCACAO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isMensal && (
              <div>
                <Label>Subtipo de Período</Label>
                <Select value={form.subtipo_periodo} onValueChange={(v) => set("subtipo_periodo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBTIPOS_PERIODO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            {!isMensal && (
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
            <Button onClick={reservar} disabled={loading || !form.nome || !form.email || !form.telefone || !form.sala_id || !form.data}
              className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Solicitar reserva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
