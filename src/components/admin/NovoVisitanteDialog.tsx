import { useState, useEffect } from "react";
import { Dialog, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, AlertTriangle } from "lucide-react";
import NovoClienteCorpDialog from "./NovoClienteCorpDialog";
import { verificarConflitos, ConflitoReserva } from "@/lib/disponibilidade";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date?: Date | null;
  /** Quando informado, o visitante já é vinculado a este cliente (sem seletor de empresa) */
  clienteCorpId?: string;
  onCreated?: () => void;
};

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function NovoVisitanteDialog({ open, onOpenChange, date, clienteCorpId, onCreated }: Props) {
  const [modo, setModo] = useState<"agendar" | "cadastro">("agendar");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [salaId, setSalaId] = useState<string>("");
  const [dataStr, setDataStr] = useState<string>(toDateInput(new Date()));
  const [hora, setHora] = useState("09:00");
  const [unidades, setUnidades] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [conhecidos, setConhecidos] = useState<any[]>([]);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [conflitos, setConflitos] = useState<ConflitoReserva[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo("agendar");
    setNome("");
    setDocumento("");
    setObservacoes("");
    setClienteId(clienteCorpId || "");
    setUnidadeId("");
    setSalaId("");
    setDataStr(toDateInput(date || new Date()));
    setHora("09:00");
    setConflitos([]);
    supabase.from("unidades").select("id, nome").then(({ data }) => setUnidades(data || []));
    if (!clienteCorpId) {
      supabase.from("clientes_corp").select("id, razao_social").then(({ data }) => setClientes(data || []));
    }
  }, [open, date, clienteCorpId]);

  // Visitantes já cadastrados do cliente (seleção rápida)
  useEffect(() => {
    if (!open || !clienteId) {
      setConhecidos([]);
      return;
    }
    supabase
      .from("visitantes")
      .select("id, nome, documento")
      .eq("cliente_corp_id", clienteId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const map = new Map<string, any>();
        (data || []).forEach((v: any) => {
          if (!map.has(v.nome.toLowerCase())) map.set(v.nome.toLowerCase(), v);
        });
        setConhecidos(Array.from(map.values()));
      });
  }, [open, clienteId]);

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
    if (modo !== "agendar" || !salaId || !dataStr || !hora) {
      setConflitos([]);
      return;
    }
    const timer = setTimeout(async () => {
      const [h, m] = hora.split(":").map(Number);
      const hEnd = String(h + 1).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      const results = await verificarConflitos(salaId, dataStr, hora, hEnd);
      setConflitos(results);
    }, 500);
    return () => clearTimeout(timer);
  }, [salaId, dataStr, hora, modo]);

  async function save() {
    if (!nome || !clienteId) {
      toast({ title: "Informe o nome do visitante e o cliente", variant: "destructive" });
      return;
    }
    if (modo === "agendar" && (!salaId || !dataStr || !hora)) {
      toast({ title: "Informe sala, data e hora", variant: "destructive" });
      return;
    }
    if (modo === "agendar" && conflitos.some(c => c.tipo === "bloqueio")) {
      toast({ title: "Data bloqueada", description: "Não é possível agendar visitas em domingos ou feriados.", variant: "destructive" });
      return;
    }

    setSaving(true);
    let dataHora: string | null = null;
    if (modo === "agendar") {
      const [y, mo, d] = dataStr.split("-").map(Number);
      const [h, mi] = hora.split(":").map(Number);
      dataHora = new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
    }

    const { error } = await supabase.from("visitantes").insert({
      nome,
      documento: documento || null,
      observacoes: observacoes || null,
      cliente_corp_id: clienteId,
      sala_id: modo === "agendar" ? salaId : null,
      data_hora_prevista: dataHora,
    } as any);

    if (error) {
      toast({ title: "Erro ao salvar visitante", description: error.message, variant: "destructive" });
    } else {
      toast({ title: modo === "agendar" ? "Visita agendada com sucesso" : "Visitante cadastrado" });
      onOpenChange(false);
      onCreated?.();
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{modo === "agendar" ? "Agendar Visita" : "Cadastrar Visitante"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setModo("agendar")}
              className={`text-xs font-bold py-2 rounded-md transition-colors ${modo === "agendar" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
            >
              Data e hora
            </button>
            <button
              type="button"
              onClick={() => setModo("cadastro")}
              className={`text-xs font-bold py-2 rounded-md transition-colors ${modo === "cadastro" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
            >
              Somente cadastro
            </button>
          </div>

          {conhecidos.length > 0 && (
            <div className="grid gap-2">
              <Label>Visitante já cadastrado (opcional)</Label>
              <Select
                onValueChange={(val) => {
                  const v = conhecidos.find(c => c.id === val);
                  if (v) {
                    setNome(v.nome);
                    setDocumento(v.documento || "");
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar rapidamente" /></SelectTrigger>
                <SelectContent>
                  {conhecidos.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Nome do Visitante</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>

          <div className="grid gap-2">
            <Label>Documento (opcional)</Label>
            <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="RG / CPF" />
          </div>

          {!clienteCorpId && (
            <div className="grid gap-2">
              <Label>Empresa (Cliente)</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
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
                    .map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                  {clientes.filter(c => c.razao_social.toLowerCase().includes(searchFilter.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Nenhum cliente encontrado</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                        onClick={(e) => { e.preventDefault(); setShowNovoCliente(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Criar "{searchFilter}"
                      </Button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <NovoClienteCorpDialog
            open={showNovoCliente}
            onOpenChange={setShowNovoCliente}
            initialNome={searchFilter}
            onCreated={(newClient) => {
              setClientes(prev => [...prev, newClient]);
              setClienteId(newClient.id);
            }}
          />

          {modo === "agendar" && (
            <>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input type="date" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Horário</Label>
                  <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                </div>
              </div>

              {conflitos.length > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-red-800">
                    <p className="font-bold">Atenção: Conflito detectado!</p>
                    <ul className="list-disc list-inside">
                      {conflitos.map((c, i) => (
                        <li key={i}>
                          {c.tipo === "bloqueio" ? (
                            <span className="font-bold text-red-700">BLOQUEADO: {c.nome}</span>
                          ) : (
                            <>{c.nome} ({c.tipo === "reserva" ? "Reserva" : "Visita"}: {c.hora_inicio})</>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid gap-2">
            <Label>Observações (opcional)</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: retirar documentos na recepção" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {modo === "agendar" ? "Agendar Visita" : "Salvar Cadastro"}
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  );
}
