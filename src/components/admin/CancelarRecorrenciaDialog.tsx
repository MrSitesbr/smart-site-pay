import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invokeGoogleSync } from "@/lib/googleSync";
import { toast } from "@/hooks/use-toast";

type Escopo = "uma" | "futuras";
const hojeISO = () => format(new Date(), "yyyy-MM-dd");
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Cancela só a data escolhida ou a recorrência a partir dessa data.
 * Reservas passadas, realizadas ou com check-in nunca são canceladas (histórico financeiro preservado).
 */
export default function CancelarRecorrenciaDialog({ reserva, onOpenChange, onDone }: {
  reserva: any | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [salvando, setSalvando] = useState<Escopo | null>(null);

  async function cancelar(escopo: Escopo) {
    if (!reserva) return;
    setSalvando(escopo);
    try {
      if (escopo === "uma") {
        if (reserva.status === "realizada") {
          toast({ title: "Reserva já realizada", description: "Reservas realizadas são mantidas no histórico financeiro.", variant: "destructive" });
          return;
        }
        if (reserva.google_event_id) await invokeGoogleSync({ action: "delete_event", eventId: reserva.google_event_id, calendarId: reserva.google_calendar_id });
        const { error } = await supabase.from("reservations")
          .update({ status: "cancelada", cancelled_at: new Date().toISOString(), google_event_id: null })
          .eq("id", reserva.id);
        if (error) throw error;
        toast({ title: "Reserva cancelada", description: "O histórico financeiro foi preservado." });
      } else {
        const corte = reserva.data < hojeISO() ? hojeISO() : reserva.data;
        const { data, error } = await supabase.rpc("cancel_reservation_series", { p_serie_id: reserva.serie_id, p_from: corte });
        if (error) throw error;
        const canceladas = data || [];
        for (const item of canceladas) {
          if (item.google_event_id) await invokeGoogleSync({ action: "delete_event", eventId: item.google_event_id, calendarId: item.google_calendar_id });
        }
        toast({
          title: canceladas.length ? `${canceladas.length} reserva${canceladas.length > 1 ? "s" : ""} cancelada${canceladas.length > 1 ? "s" : ""}` : "Nenhuma reserva a cancelar",
          description: `Recorrência cancelada a partir de ${dataBR(corte)}. Reservas anteriores, realizadas ou com check-in foram preservadas.`,
        });
      }
      onOpenChange(false);
      onDone();
    } catch (error: any) {
      toast({ title: "Erro ao cancelar", description: error?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSalvando(null);
    }
  }

  return (
    <AlertDialog open={Boolean(reserva)} onOpenChange={(open) => !salvando && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Esta reserva faz parte de uma recorrência</AlertDialogTitle>
          <AlertDialogDescription>
            {reserva ? `${reserva.nome} · ${dataBR(reserva.data)} ${reserva.hora_inicio?.slice(0, 5)}` : ""}. As datas anteriores e as reservas já realizadas são preservadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" disabled={Boolean(salvando)} onClick={() => void cancelar("uma")}>
            {salvando === "uma" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancelar apenas esta data
          </Button>
          <Button variant="destructive" disabled={Boolean(salvando)} onClick={() => void cancelar("futuras")}>
            {salvando === "futuras" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancelar a recorrência a partir desta data
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={Boolean(salvando)}>Voltar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
