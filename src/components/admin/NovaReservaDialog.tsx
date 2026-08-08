import { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, User, DollarSign } from "lucide-react";
import { linkCobrancaWhatsApp, fmtBRL } from "@/lib/cobranca";

type Cliente = { nome: string; email: string; telefone: string };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  reservas: any[];
  contratos: any[];
  onCreated?: () => void;
};

function dateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function NovaReservaDialog({ open, onOpenChange, date, reservas, contratos, onCreated }: Props) {
  const clientes = useMemo<Cliente[]>(() => {
    const map = new Map<string, Cliente>();
    const add = (c: any) => {
      const key = (c.email || c.telefone || c.nome || "").toLowerCase().trim();
      if (!key || map.has(key)) return;
      map.set(key, { nome: c.nome || "", email: c.email || "", telefone: c.telefone || "" });
    };
    reservas.forEach(add); contratos.forEach(add);
    return Array.from(map.values()).sort((a,b) => a.nome.localeCompare(b.nome));
  }, [reservas, contratos]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [showList, setShowList] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [ambiente, setAmbiente] = useState<string>("estacao");
  const [tipo, setTipo] = useState<string>("hora");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [status, setStatus] = useState<string>("confirmada");
  const [origem, setOrigem] = useState<string>("direto");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setNome(""); setEmail(""); setTelefone(""); setSelected(null); setShowList(false);
      setAmbiente("estacao"); setTipo("hora");
      setHoraInicio("09:00"); setHoraFim("10:00");
      setStatus("confirmada"); setOrigem("direto"); setObservacoes("");
    }
  }, [open]);

  useEffect(() => {
    if (tipo === "diaria") { setHoraInicio("09:00"); setHoraFim("17:00"); }
  }, [tipo]);

  const suggestions = useMemo(() => {
    const q = nome.trim().toLowerCase();
    if (!q) return clientes.slice(0, 6);
    return clientes.filter(c => c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 8);
  }, [clientes, nome]);

  useEffect(() => { setHighlight(0); }, [nome, showList]);

  useEffect(() => {
    if (!showList) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowList(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showList]);

  function pickCliente(c: Cliente) {
    setSelected(c); setNome(c.nome); setEmail(c.email); setTelefone(c.telefone); setShowList(false);
  }

  function onNomeChange(v: string) {
    setNome(v);
    if (selected && v !== selected.nome) setSelected(null);
    setShowList(true);
  }

  function onKeyDownNome(e: React.KeyboardEvent) {
    if (!showList || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h+1, suggestions.length-1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h-1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const c = suggestions[highlight];
      if (c) pickCliente(c);
    } else if (e.key === "Escape") { setShowList(false); }
  }

  const isNovo = !selected && nome.trim().length > 0;

  async function save() {
    if (!date) return;
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      toast({ title: "Preencha nome, email e telefone", variant: "destructive" });
      return;
    }
    if (horaFim <= horaInicio) {
      toast({ title: "Horário de fim deve ser após o início", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      nome: nome.trim(), email: email.trim(), telefone: telefone.trim(),
      ambiente, tipo, data: dateISO(date),
      hora_inicio: horaInicio + ":00", hora_fim: horaFim + ":00",
      status, origem, observacoes: observacoes.trim() || null,
    };
    const { data, error } = await (supabase.from("reservations") as any).insert(payload).select("id").single();
    if (error) {
      toast({ title: "Erro ao criar reserva", description: error.message, variant: "destructive" });
      setSaving(false); return;
    }
    try {
      await supabase.functions.invoke("sync-google-calendar", { body: { action: "upsert", type: "reserva", id: data.id } });
    } catch {}
    toast({ title: "Reserva criada" });
    setSaving(false);
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Nova reserva {date && (
              <span className="text-muted-foreground font-normal text-sm">
                — {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <div ref={wrapRef} className="relative">
            <Label className="text-xs flex items-center gap-1">
              Nome do cliente
              {selected ? <span className="text-[10px] text-green-700">• existente</span>
                : isNovo ? <span className="text-[10px] text-blue-700 inline-flex items-center gap-0.5"><UserPlus className="w-3 h-3" /> cadastro rápido</span>
                : null}
            </Label>
            <Input
              value={nome}
              onChange={(e) => onNomeChange(e.target.value)}
              onFocus={() => setShowList(true)}
              onKeyDown={onKeyDownNome}
              placeholder="Digite para buscar ou cadastrar…"
              autoComplete="off"
            />
            {showList && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((c, i) => (
                  <button
                    key={c.email + c.telefone}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickCliente(c); }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${i===highlight ? "bg-primary/10" : "hover:bg-muted/50"}`}
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.nome}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.email} · {c.telefone}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showList && suggestions.length === 0 && nome.trim() && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-3 text-xs text-muted-foreground inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Nenhum cliente encontrado — preencha email e telefone para cadastrar.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
          <div>
            <Label className="text-xs">Ambiente</Label>
            <Select value={ambiente} onValueChange={setAmbiente}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estacao">Estação</SelectItem>
                <SelectItem value="sala_privativa">Sala Privativa</SelectItem>
                <SelectItem value="sala_reuniao">Sala Reunião</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hora">Por Hora</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="direto">Direto</SelectItem>
                <SelectItem value="woba">Woba</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas ou pedido do cliente…" />
          </div>
        </div>

        {(() => {
          const RATES: Record<string, { hora: number; diaria: number }> = {
            estacao: { hora: 20, diaria: 65 },
            sala_privativa: { hora: 40, diaria: 150 },
            sala_reuniao: { hora: 90, diaria: 450 },
          };
          const r = RATES[ambiente];
          let horas = 0;
          if (horaInicio && horaFim && horaFim > horaInicio) {
            const [h1, m1] = horaInicio.split(":").map(Number);
            const [h2, m2] = horaFim.split(":").map(Number);
            horas = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
          }
          const preco = tipo === "diaria" ? r.diaria : Math.ceil(horas) * r.hora;
          const detalhe = tipo === "diaria"
            ? `Diária · R$ ${r.diaria.toFixed(2)}`
            : `R$ ${r.hora.toFixed(2)}/h × ${horas > 0 ? horas.toFixed(1) : 0}h (cobra ${Math.ceil(horas)}h)`;
          const AMB_LBL: Record<string,string> = { estacao:"Estação de Trabalho", sala_privativa:"Sala Privativa", sala_reuniao:"Sala de Reunião" };
          const dataTxt = date ? date.toLocaleDateString("pt-BR") : "";
          const hiTxt = tipo === "diaria" ? "09:00" : horaInicio;
          const hfTxt = tipo === "diaria" ? "17:00" : horaFim;
          const desc = `Reserva ${AMB_LBL[ambiente]} (${tipo==="diaria"?"Diaria":"Por Hora"}) - ${dataTxt} ${hiTxt}-${hfTxt}`;
          const cobrarHref = linkCobrancaWhatsApp({ nome, telefone, valor: preco, descricao: desc });
          const cobrarDisabled = !nome.trim() || !telefone.trim() || preco <= 0;
          return (
            <div className="mt-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Valor estimado</div>
                  <div className="text-[11px] text-muted-foreground">{detalhe}</div>
                </div>
                <div className="font-heading font-black text-2xl text-primary">
                  R$ {preco.toFixed(2).replace(".", ",")}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
                disabled={cobrarDisabled}
                onClick={() => { if (!cobrarDisabled) window.open(cobrarHref, "_blank"); }}
                title={cobrarDisabled ? "Preencha nome, telefone e horário" : "Enviar cobrança PIX via WhatsApp"}
              >
                <DollarSign className="w-4 h-4 mr-1" /> Enviar cobrança PIX ({fmtBRL(preco)}) via WhatsApp
              </Button>
            </div>
          );
        })()}

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Criar reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
