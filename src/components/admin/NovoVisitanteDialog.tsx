import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Building2, AlertTriangle } from "lucide-react";
import NovoClienteCorpDialog from "./NovoClienteCorpDialog";
import { verificarConflitos, ConflitoReserva } from "@/lib/disponibilidade";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  onCreated?: () => void;
};

export default function NovoVisitanteDialog({ open, onOpenChange, date, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [clienteCorpId, setClienteCorpId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [salaId, setSalaId] = useState<string>("");
  const [hora, setHora] = useState("09:00");
  const [unidades, setUnidades] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [conflitos, setConflitos] = useState<ConflitoReserva[]>([]);
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    if (open) {
      setNome("");
      setClienteCorpId("");
      setUnidadeId("");
      setSalaId("");
      setHora("09:00");
      setConflitos([]);
      supabase.from("unidades").select("id, nome").then(({ data }) => setUnidades(data || []));
      supabase.from("clientes_corp").select("id, razao_social").then(({ data }) => setClientes(data || []));
    }
  }, [open]);

  useEffect(() => {
    if (unidadeId) {
      supabase.from("salas").select("id, nome").eq("unidade_id", unidadeId).then(({ data }) => {
        setSalas(data || []);
        setSalaId("");
      });
    } else {
      setSalas([]);
    }
  }, [unidadeId]);

  useEffect(() => {
    if (!salaId || !date || !hora) {
      setConflitos([]);
      return;
    }

    const timer = setTimeout(async () => {
      const dateStr = date.toISOString().slice(0, 10);
      // Para visita, vamos checar um range de 1h em volta do horário marcado
      const [h, m] = hora.split(":").map(Number);
      const hEnd = (h + 1).toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
      
      const results = await verificarConflitos(salaId, dateStr, hora, hEnd);
      setConflitos(results);
    }, 500);

    return () => clearTimeout(timer);
  }, [salaId, date, hora]);

  async function save() {
    if (!date || !nome || !clienteCorpId || !salaId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSaving(true);
    const dt = new Date(date);
    const [h, m] = hora.split(":").map(Number);
    dt.setHours(h, m, 0, 0);

    const { error } = await supabase.from("visitantes").insert({
      nome,
      cliente_corp_id: clienteCorpId,
      sala_id: salaId,
      data_hora_prevista: dt.toISOString(),
    });

    if (error) {
      toast({ title: "Erro ao agendar visita", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visita agendada com sucesso" });
      onOpenChange(false);
      onCreated?.();
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Agendar Visita</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome do Visitante</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid gap-2">
            <Label>Empresa (Cliente)</Label>
            <Select value={clienteCorpId} onValueChange={setClienteCorpId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 border-b">
                  <Input 
                    placeholder="Filtrar empresas..." 
                    value={searchFilter} 
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {clientes
                  .filter(c => c.razao_social.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)
                }
                {clientes.filter(c => c.razao_social.toLowerCase().includes(searchFilter.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">Nenhum cliente encontrado</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full text-xs bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowNovoCliente(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Criar "{searchFilter}"
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <NovoClienteCorpDialog 
            open={showNovoCliente}
            onOpenChange={setShowNovoCliente}
            initialNome={searchFilter}
            onCreated={(newClient) => {
              setClientes(prev => [...prev, newClient]);
              setClienteCorpId(newClient.id);
            }}
          />
          <div className="grid gap-2">
            <Label>Unidade</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
              <SelectContent>
                {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Sala/Ambiente</Label>
            <Select value={salaId} onValueChange={setSalaId} disabled={!unidadeId}>
              <SelectTrigger><SelectValue placeholder={unidadeId ? "Selecione a sala" : "Selecione unidade primeiro"} /></SelectTrigger>
              <SelectContent>
                {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          {conflitos.length > 0 && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-800">
                <p className="font-bold">Atenção: Já existe ocupação para este horário!</p>
                <ul className="list-disc list-inside">
                  {conflitos.map((c, i) => (
                    <li key={i}>{c.nome} ({c.tipo === 'reserva' ? 'Reserva' : 'Visita'}: {c.hora_inicio})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Horário</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Agendar Visita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
