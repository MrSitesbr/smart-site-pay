import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogScrollContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeGoogleSync } from "@/lib/googleSync";
import { verificarConflitos } from "@/lib/disponibilidade";
import { calcularUsoPlano, horasDaReserva } from "@/lib/planoUso";
import { calculateReservationPrice } from "@/lib/reservationPricing";
import { friendlyError } from "@/lib/appErrors";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type EditableReservation = Omit<ReservationRow, "ambiente" | "status" | "tipo" | "hora_inicio" | "hora_fim"> & {
  ambiente: string;
  status: string;
  tipo: string;
  hora_inicio: string;
  hora_fim: string;
};
type UnitOption = Pick<Database["public"]["Tables"]["unidades"]["Row"], "id" | "nome" | "horario_abertura" | "horario_fechamento">;
type RoomOption = Pick<Database["public"]["Tables"]["salas"]["Row"], "id" | "nome" | "unidade_id" | "preco_hora_avulsa" | "preco_diaria">;
type PlanOption = Database["public"]["Tables"]["planos"]["Row"];

type Props = {
  open: boolean;
  reserva: EditableReservation | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (reserva: EditableReservation) => void;
};

export default function AdminReservaEditDialog({ open, reserva, onOpenChange, onSaved }: Props) {
  const [editing, setEditing] = useState<EditableReservation | null>(null);
  const [unidades, setUnidades] = useState<UnitOption[]>([]);
  const [salas, setSalas] = useState<RoomOption[]>([]);
  const [planos, setPlanos] = useState<PlanOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !reserva) return;
    setEditing({
      ...reserva,
      hora_inicio: String(reserva.hora_inicio || "").slice(0, 5),
      hora_fim: String(reserva.hora_fim || "").slice(0, 5),
    });
    Promise.all([
      supabase.from("unidades").select("id, nome, horario_abertura, horario_fechamento").order("nome"),
      supabase.from("planos").select("*").is("deleted_at", null).order("nome"),
    ]).then(([unidadesResult, planosResult]) => {
      setUnidades(unidadesResult.data || []);
      setPlanos(planosResult.data || []);
    });
  }, [open, reserva]);

  useEffect(() => {
    if (!editing?.unidade_id) {
      setSalas([]);
      return;
    }
    supabase.from("salas").select("id, nome, unidade_id, preco_hora_avulsa, preco_diaria")
      .eq("unidade_id", editing.unidade_id).order("nome")
      .then(({ data }) => setSalas(data || []));
  }, [editing?.unidade_id]);

  async function save() {
    if (!editing || !reserva) return;
    const editableFields: (keyof EditableReservation)[] = [
      "nome", "email", "telefone", "ambiente", "tipo", "data",
      "hora_inicio", "hora_fim", "observacoes", "admin_notes",
      "unidade_id", "sala_id", "plano_id",
    ];
    const sameValue = (field: keyof EditableReservation, a: unknown, b: unknown) => {
      const normalize = (value: unknown) => {
        if (value === "" || value == null) return null;
        const normalized = String(value);
        return field === "hora_inicio" || field === "hora_fim" ? normalized.slice(0, 5) : normalized;
      };
      return normalize(a) === normalize(b);
    };
    const statusOnly = editableFields.every((field) => sameValue(field, editing[field], reserva[field]));

    if (!statusOnly && editing.sala_id) {
      const conflicts = await verificarConflitos(
        editing.sala_id,
        editing.data,
        editing.hora_inicio,
        editing.hora_fim,
        editing.id,
      );
      if (conflicts.length) {
        toast({ title: "Horário indisponível", description: conflicts.map((conflict) => conflict.nome).join(", "), variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const hours = horasDaReserva(editing);
      const room = salas.find((item) => item.id === editing.sala_id);
      let pricing = calculateReservationPrice({
        tipo: editing.tipo === "diaria" ? "diaria" : "hora",
        horas: hours,
        saldo: 0,
        precoHora: room?.preco_hora_avulsa == null ? null : Number(room.preco_hora_avulsa),
        precoDiaria: room?.preco_diaria == null ? null : Number(room.preco_diaria),
      });
      let justification = "Reserva avulsa conforme o preço configurado para a sala.";

      if (editing.plano_id) {
        const plan = planos.find((item) => item.id === editing.plano_id);
        const { data: link } = await supabase.from("sala_planos").select("plano_id")
          .eq("sala_id", editing.sala_id).eq("plano_id", editing.plano_id).maybeSingle();
        if (!plan || !link) {
          toast({ title: "Plano indisponível", description: "O plano selecionado não está vinculado a esta sala.", variant: "destructive" });
          return;
        }
        const usage = await calcularUsoPlano([editing.email], plan, editing.id);
        pricing = calculateReservationPrice({
          tipo: editing.tipo === "diaria" ? "diaria" : "hora",
          horas: hours,
          saldo: usage.saldo,
          precoHora: room?.preco_hora_avulsa == null ? null : Number(room.preco_hora_avulsa),
          precoDiaria: room?.preco_diaria == null ? null : Number(room.preco_diaria),
        });
        justification = `${pricing.cobertas}h cobertas pelo plano ${plan.nome}${pricing.excedentes ? `; ${pricing.excedentes}h excedentes` : ""}.`;
      }

      const payload = {
        nome: editing.nome,
        email: editing.email,
        telefone: editing.telefone,
        ambiente: editing.ambiente,
        tipo: editing.tipo,
        data: editing.data,
        hora_inicio: `${editing.hora_inicio}:00`,
        hora_fim: `${editing.hora_fim}:00`,
        status: editing.status,
        observacoes: editing.observacoes || null,
        admin_notes: editing.admin_notes || null,
        unidade_id: editing.unidade_id || null,
        sala_id: editing.sala_id || null,
        plano_id: editing.plano_id || null,
        valor: pricing.valor,
        valor_original: pricing.valor,
        horas_reservadas: pricing.horas,
        horas_cobertas_plano: pricing.cobertas,
        horas_excedentes: pricing.excedentes,
        calculo_justificativa: justification,
      };

      const updateResult = statusOnly
        ? await supabase.rpc("admin_update_reservation_status", {
            p_reservation_id: editing.id,
            p_status: editing.status,
          })
        : await supabase.from("reservations").update(payload).eq("id", editing.id);
      if (updateResult.error) throw updateResult.error;

      const updated = { ...reserva, ...(statusOnly ? { status: editing.status } : payload) };
      const syncResult = await invokeGoogleSync({ action: "upsert", type: "reserva", id: editing.id });
      if (syncResult.error || syncResult.data?.error) {
        toast({ title: "Reserva salva", description: "A alteração foi salva, mas não foi possível atualizar o Google Agenda.", variant: "destructive" });
      } else {
        toast({ title: "Reserva atualizada" });
      }
      onSaved(updated);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Não foi possível atualizar a reserva", description: friendlyError(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar reserva</DialogTitle></DialogHeader>
        {editing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome"><Input value={editing.nome || ""} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></Field>
              <Field label="Status">
                <Select value={editing.status || "pendente"} onValueChange={(value) => setEditing({ ...editing, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Email"><Input type="email" value={editing.email || ""} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></Field>
              <Field label="Telefone"><Input value={editing.telefone || ""} onChange={(event) => setEditing({ ...editing, telefone: event.target.value })} /></Field>
              <Field label="Ambiente">
                <Select value={editing.ambiente || "estacao"} onValueChange={(value) => setEditing({ ...editing, ambiente: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estacao">Estação</SelectItem>
                    <SelectItem value="sala_privativa">Sala Privativa</SelectItem>
                    <SelectItem value="sala_reuniao">Sala Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={editing.tipo || "hora"} onValueChange={(value) => setEditing({ ...editing, tipo: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hora">Hora</SelectItem>
                    <SelectItem value="diaria">Diária</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unidade">
                <Select value={editing.unidade_id || ""} onValueChange={(value) => setEditing({ ...editing, unidade_id: value, sala_id: null })}>
                  <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
                  <SelectContent>{unidades.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.nome}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Sala">
                <Select value={editing.sala_id || ""} onValueChange={(value) => setEditing({ ...editing, sala_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Sala" /></SelectTrigger>
                  <SelectContent>{salas.map((room) => <SelectItem key={room.id} value={room.id}>{room.nome}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Plano">
                <Select value={editing.plano_id || "avulso"} onValueChange={(value) => setEditing({ ...editing, plano_id: value === "avulso" ? null : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Avulso / sem plano</SelectItem>
                    {planos.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data"><Input type="date" value={editing.data || ""} onChange={(event) => setEditing({ ...editing, data: event.target.value })} /></Field>
              <Field label="Horário">
                <div className="flex gap-2">
                  <Input type="time" value={editing.hora_inicio || ""} onChange={(event) => setEditing({ ...editing, hora_inicio: event.target.value })} />
                  <Input type="time" value={editing.hora_fim || ""} onChange={(event) => setEditing({ ...editing, hora_fim: event.target.value })} />
                </div>
              </Field>
            </div>
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">O valor e o consumo do plano serão recalculados ao salvar.</p>
            <Field label="Observações"><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2" value={editing.observacoes || ""} onChange={(event) => setEditing({ ...editing, observacoes: event.target.value })} /></Field>
            <Field label="Notas do admin"><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2" value={editing.admin_notes || ""} onChange={(event) => setEditing({ ...editing, admin_notes: event.target.value })} /></Field>
            <DialogFooter className="border-t pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
              <Button size="sm" className="bg-brand-blue-dark text-white hover:bg-brand-blue-dark/90" disabled={saving} onClick={() => void save()}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogScrollContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>{children}</div>;
}
