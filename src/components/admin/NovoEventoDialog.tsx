import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { invokeGoogleSync } from "@/lib/googleSync";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  onCreated?: () => void;
};

export default function NovoEventoDialog({ open, onOpenChange, date, onCreated }: Props) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSummary("");
      setDescription("");
      setLocation("");
      setStartTime("09:00");
      setEndTime("10:00");
    }
  }, [open]);

  async function save() {
    if (!date || !summary) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    
    // Preparar datas ISO
    const start = new Date(date);
    const [sh, sm] = startTime.split(":").map(Number);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(date);
    const [eh, em] = endTime.split(":").map(Number);
    end.setHours(eh, em, 0, 0);

    const { data, error } = await invokeGoogleSync({
      action: "create_event",
      event: {
        summary,
        description,
        location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      }
    });

    if (error || (data as any)?.error) {
      toast({ 
        title: "Erro ao criar evento no Google", 
        description: (error as any)?.message || (data as any)?.error || "Erro desconhecido", 
        variant: "destructive" 
      });
    } else {
      toast({ title: "Evento criado com sucesso" });
      onOpenChange(false);
      onCreated?.();
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Novo Evento (Google Agenda)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Título do Evento</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ex: Workshop Coworking" />
          </div>
          <div className="grid gap-2">
            <Label>Local</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Sala de Reunião 01" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do evento..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
