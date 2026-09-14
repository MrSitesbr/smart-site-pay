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

const HORAS = Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);
const WHATSAPP = "5513992037957";
const CATEGORIAS: Record<string, string> = {
  privativa: "Sala Privativa",
  compartilhado: "Escritório Compartilhado",
  consultorio_poltrona: "Consultório com Poltrona",
  consultorio_maca: "Consultório com Maca",
};

function getCategoriaLabel(sala: SalaReserva) {
  const categoria = sala.categoria || sala.tipo?.toLowerCase();
  if (!categoria) return "Categoria não informada";
  if (/privativ/.test(categoria)) return "Sala Privativa";
  if (/compartilh|cowork/.test(categoria)) return "Escritório Compartilhado";
  if (/maca/.test(categoria)) return "Consultório com Maca";
  if (/consult/.test(categoria)) return "Consultório com Poltrona";
  return CATEGORIAS[categoria] || "Categoria não informada";
}

type UnidadeReserva = { id: string; nome: string };
type SalaReserva = {
  id: string;
  nome: string;
  unidade_id: string;
  categoria: string | null;
  tipo: string | null;
  status: string | null;
  tipo_locacao: string | null;
  subtipo_periodo: string | null;
  preco_locacao_mensal: number | null;
  preco_periodo_pacote_mensal: number | null;
  preco_periodo_locacao_avulsa: number | null;
};

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmbiente?: string;
  defaultData?: string;
}

export default function ReservaDialog({ open, onOpenChange, defaultAmbiente, defaultData }: ReservaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [unidades, setUnidades] = useState<UnidadeReserva[]>([]);
  const [salas, setSalas] = useState<SalaReserva[]>([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    unidade_id: "",
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
        nome: f.nome || String(u.user_metadata?.nome || ""),
        telefone: f.telefone || String(u.user_metadata?.telefone || ""),
        email: f.email || u.email || "",
      }));
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: unidadesData }, { data: salasData }] = await Promise.all([
        supabase.from("unidades").select("id, nome").order("nome"),
        supabase.from("salas").select("*").neq("status", "oculto").order("nome"),
      ]);
      const visibleSalas = salasData || [];
      const unidadesComSalas = (unidadesData || []).filter((unidade) =>
        visibleSalas.some((sala) => sala.unidade_id === unidade.id),
      );
      setUnidades(unidadesComSalas);
      setSalas(visibleSalas);

      const salaInicial = visibleSalas.find((sala) => sala.id === defaultAmbiente) || visibleSalas[0];
      if (salaInicial) {
        setForm((f) => ({
          ...f,
          unidade_id: salaInicial.unidade_id,
          sala_id: salaInicial.id,
          tipo_locacao: salaInicial.tipo_locacao || "locacao_mensal",
          subtipo_periodo: salaInicial.subtipo_periodo || "pacote_mensal",
        }));
      }
    })();
  }, [open, defaultAmbiente]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const sala = salas.find((s) => s.id === form.sala_id);
  const salasDaUnidade = salas.filter((s) => s.unidade_id === form.unidade_id);
  const isMensal = sala?.tipo_locacao === "locacao_mensal";
  const salaDisponivel = sala?.status === "disponivel" || sala?.status === "ativa";

  const precoSelecionado = (() => {
    if (!sala) return null;
    if (isMensal) return sala.preco_locacao_mensal ?? null;
    if (sala.subtipo_periodo === "pacote_mensal") return sala.preco_periodo_pacote_mensal ?? null;
    return sala.preco_periodo_locacao_avulsa ?? null;
  })();

  async function reservar() {
    if (!form.nome || !form.email || !form.telefone || !form.unidade_id || !form.sala_id || !form.data) {
      toast({ title: "Preencha nome, e-mail, telefone, unidade, sala e data" });
      return;
    }
    if (!sala || !salaDisponivel) {
      toast({ title: "Selecione uma sala disponível para solicitar a reserva" });
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
        `Unidade: ${unidades.find((u) => u.id === form.unidade_id)?.nome || form.unidade_id}.`,
        `Sala: ${sala.nome}.`,
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
        plano_tipo: sala.tipo_locacao || "locacao_mensal",
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
    } catch (e: unknown) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Não foi possível enviar a solicitação.", variant: "destructive" });
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
              <Label>Unidade</Label>
              <Select
                value={form.unidade_id}
                onValueChange={(value) => {
                  const primeiraSala = salas.find((sala) => sala.unidade_id === value);
                  setForm((f) => ({
                    ...f,
                    unidade_id: value,
                    sala_id: primeiraSala?.id || "",
                    tipo_locacao: primeiraSala?.tipo_locacao || "locacao_mensal",
                    subtipo_periodo: primeiraSala?.subtipo_periodo || "pacote_mensal",
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sala</Label>
              <Select
                value={form.sala_id}
                onValueChange={(value) => {
                  const nextSala = salas.find((item) => item.id === value);
                  setForm((f) => ({
                    ...f,
                    sala_id: value,
                    tipo_locacao: nextSala?.tipo_locacao || "locacao_mensal",
                    subtipo_periodo: nextSala?.subtipo_periodo || "pacote_mensal",
                  }));
                }}
                disabled={!form.unidade_id}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {salasDaUnidade.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.status !== "disponivel"}>
                      {s.nome} • {getCategoriaLabel(s)} • {s.status === "disponivel" || s.status === "ativa" ? "Disponível" : "Indisponível"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regime de locação</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {sala ? (isMensal ? "Locação Mensal" : sala.subtipo_periodo === "pacote_mensal" ? "Pacote Mensal" : "Locação Avulsa") : "Selecione uma sala"}
              </div>
              {sala && <p className="mt-1 text-sm font-medium text-secondary">{precoSelecionado == null ? "Preço sob consulta" : `R$ ${Number(precoSelecionado).toFixed(2).replace(".", ",")}`}</p>}
            </div>
            {!isMensal && sala && (
              <div>
                <Label>Subtipo de Período</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {sala.subtipo_periodo === "pacote_mensal" ? "Pacote Mensal" : "Locação Avulsa"}
                </div>
              </div>
            )}
            <div>
              <Label>{isMensal ? "Data de início" : "Data"}</Label>
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
            <Button onClick={reservar} disabled={loading || !form.nome || !form.email || !form.telefone || !form.unidade_id || !form.sala_id || !form.data || !salaDisponivel}
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
