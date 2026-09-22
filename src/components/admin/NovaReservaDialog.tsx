import { useMemo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, User, DollarSign, Plus, AlertTriangle, Building, Layout } from "lucide-react";
import { linkCobrancaWhatsApp, fmtBRL } from "@/lib/cobranca";
import { verificarConflitos, ConflitoReserva } from "@/lib/disponibilidade";
import { invokeGoogleSync } from "@/lib/googleSync";
import { calcularUsoPlano, horasDaReserva } from "@/lib/planoUso";
import { calculateReservationPrice } from "@/lib/reservationPricing";
import { friendlyError } from "@/lib/appErrors";

type Cliente = { id?: string; nome: string; email: string; telefone: string; plano_id?: string | null };
type CalculoPlano = { plano: any; horas: number; cobertas: number; excedentes: number; saldoDepois: number; valor: number | null; justificativa: string };

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
  const [crmClientes, setCrmClientes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.from("clientes_corp").select("id, razao_social, responsavel_nome, responsavel_email, responsavel_telefone, plano_id").then(({ data }) => {
      if (mounted) setCrmClientes(data || []);
    });
    return () => { mounted = false; };
  }, []);

  const clientes = useMemo<Cliente[]>(() => {
    const map = new Map<string, Cliente>();
    const add = (c: any) => {
      const key = (c.email || c.telefone || c.nome || "").toLowerCase().trim();
      if (!key || map.has(key)) return;
      map.set(key, { id: c.id, nome: c.nome || "", email: c.email || "", telefone: c.telefone || "", plano_id: c.plano_id });
    };
    crmClientes.forEach((c) => {
      const nomeCliente = c.razao_social || c.responsavel_nome || "";
      const emailCliente = c.responsavel_email || "";
      const telefoneCliente = c.responsavel_telefone || "";
      add({ id: c.id, nome: nomeCliente, email: emailCliente, telefone: telefoneCliente, plano_id: c.plano_id });
    });
    reservas.forEach(add); contratos.forEach(add);
    return Array.from(map.values()).filter((c) => c.nome).sort((a,b) => a.nome.localeCompare(b.nome));
  }, [reservas, contratos, crmClientes]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [showList, setShowList] = useState(false);
  const [highlight, setHighlight] = useState(0);
  
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("");
  const [salas, setSalas] = useState<any[]>([]);
  const [selectedSala, setSelectedSala] = useState<string>("");
  const [conflitos, setConflitos] = useState<ConflitoReserva[]>([]);
  const [checkingConflitos, setCheckingConflitos] = useState(false);

  const [ambiente, setAmbiente] = useState<string>("estacao");
  const [tipo, setTipo] = useState<string>("hora");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [status, setStatus] = useState<string>("confirmada");
  const [origem, setOrigem] = useState<string>("direto");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [valorManual, setValorManual] = useState<string>("");
  const [descontoMotivo, setDescontoMotivo] = useState("");
  const [calculoPlano, setCalculoPlano] = useState<CalculoPlano | null>(null);
  const [calculandoPlano, setCalculandoPlano] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Data digitável (integrada ao calendário: inicia na data clicada)
  const [dataStr, setDataStr] = useState("");
  // Recorrência
  const [recorrente, setRecorrente] = useState(false);
  const [recFreq, setRecFreq] = useState<"semanal" | "quinzenal" | "mensal">("semanal");
  const [recAte, setRecAte] = useState("");

  useEffect(() => {
    if (open) {
      setNome(""); setEmail(""); setTelefone(""); setSelected(null); setShowList(false);
      setAmbiente("estacao"); setTipo("hora");
      setHoraInicio("09:00"); setHoraFim("10:00");
      setStatus("confirmada"); setOrigem("direto"); setObservacoes("");
      setSelectedUnidade(""); setSelectedSala(""); setConflitos([]);
      setDataStr(date ? dateISO(date) : dateISO(new Date()));
      setRecorrente(false); setRecFreq("semanal"); setRecAte("");
      setValorManual(""); setDescontoMotivo("");

      supabase.from("unidades").select("id, nome, horario_abertura, horario_fechamento").then(({ data }) => setUnidades(data || []));
    }
  }, [open, date]);

  useEffect(() => {
    if (selectedUnidade) {
      supabase.from("salas").select("id, nome, tipo, modalidades_locacao, preco_hora_avulsa, preco_diaria").eq("unidade_id", selectedUnidade).then(({ data }) => {
        setSalas(data || []);
        setSelectedSala("");
      });
    } else {
      setSalas([]);
    }
  }, [selectedUnidade]);

  // Checar conflitos sempre que mudar sala, data ou horário
  useEffect(() => {
    if (!selectedSala || !dataStr || !horaInicio || !horaFim) {
      setConflitos([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflitos(true);
      const results = await verificarConflitos(selectedSala, dataStr, horaInicio, horaFim);
      setConflitos(results);
      setCheckingConflitos(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedSala, dataStr, horaInicio, horaFim]);

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

  // Gera todas as datas (ISO) da recorrência
  function gerarDatas(): string[] {
    if (!dataStr) return [];
    if (!recorrente || !recAte || recAte < dataStr) return [dataStr];
    const out: string[] = [];
    const [y, m, d] = dataStr.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    const limite = new Date(Number(recAte.slice(0, 4)), Number(recAte.slice(5, 7)) - 1, Number(recAte.slice(8, 10)));
    let guard = 0;
    while (cur <= limite && guard < 120) {
      out.push(dateISO(cur));
      if (recFreq === "semanal") cur.setDate(cur.getDate() + 7);
      else if (recFreq === "quinzenal") cur.setDate(cur.getDate() + 14);
      else cur.setMonth(cur.getMonth() + 1);
      guard++;
    }
    return out;
  }

  const datasPrevistas = useMemo(() => gerarDatas(), [dataStr, recorrente, recFreq, recAte]);

  const precoTabela = useMemo(() => {
    const sala = salas.find((item) => item.id === selectedSala);
    if (tipo === "diaria") return sala?.preco_diaria == null ? null : Number(sala.preco_diaria);
    if (!horaInicio || !horaFim || horaFim <= horaInicio) return null;
    const [h1, m1] = horaInicio.split(":").map(Number);
    const [h2, m2] = horaFim.split(":").map(Number);
    const horas = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
    return sala?.preco_hora_avulsa == null ? null : horas * Number(sala.preco_hora_avulsa);
  }, [salas, selectedSala, tipo, horaInicio, horaFim]);

  useEffect(() => {
    let active = true;
    async function calcular() {
      if (!selected?.id || !selected.plano_id || !selectedSala || horaFim <= horaInicio) { setCalculoPlano(null); return; }
      setCalculandoPlano(true);
      const [{ data: plano }, { data: vinculo }] = await Promise.all([
        supabase.from("planos").select("*").eq("id", selected.plano_id).is("deleted_at", null).maybeSingle(),
        supabase.from("sala_planos").select("plano_id").eq("sala_id", selectedSala).eq("plano_id", selected.plano_id).maybeSingle(),
      ]);
      if (!active) return;
      if (!plano || !vinculo) { setCalculoPlano(null); setCalculandoPlano(false); return; }
      const uso = await calcularUsoPlano([selected.email], plano);
      const horas = horasDaReserva({ hora_inicio: horaInicio, hora_fim: horaFim });
      const sala = salas.find((item) => item.id === selectedSala);
      const resultado = calculateReservationPrice({ tipo: tipo as "hora" | "diaria", horas, saldo: uso.saldo, precoHora: sala?.preco_hora_avulsa == null ? null : Number(sala.preco_hora_avulsa), precoDiaria: sala?.preco_diaria == null ? null : Number(sala.preco_diaria) });
      setCalculoPlano({ plano, ...resultado, justificativa: `${resultado.cobertas}h cobertas pelo plano ${plano.nome}${resultado.excedentes ? `; ${resultado.excedentes}h excedentes` : ""}.` });
      setCalculandoPlano(false);
    }
    void calcular();
    return () => { active = false; };
  }, [selected, selectedSala, horaInicio, horaFim, salas, tipo]);

  const valorBase = calculoPlano?.valor ?? precoTabela;
  const valorFinal = valorManual.trim() !== "" ? Number(valorManual.replace(",", ".")) || 0 : valorBase;
  const temDesconto = valorFinal != null && valorBase != null && valorFinal < valorBase;

  const temBloqueio = conflitos.some(c => c.tipo === 'bloqueio');
  const temConflitoSala = conflitos.some(c => c.tipo !== 'bloqueio');
  const bloqueiaSalvar = !recorrente && (temBloqueio || temConflitoSala);

  async function syncClienteComCRM() {
    const nomeCliente = nome.trim();
    const emailCliente = email.trim();
    const telefoneCliente = telefone.trim();
    if (!nomeCliente) return;

    const { data: clientesCorp, error: loadErr } = await supabase.from("clientes_corp").select("id, razao_social, responsavel_email, responsavel_telefone");
    if (loadErr) {
      console.error("Erro ao buscar clientes do CRM:", loadErr);
      return;
    }

    const match = (clientesCorp || []).find((cliente: any) => {
      const sameName = cliente.razao_social?.trim().toLowerCase() === nomeCliente.toLowerCase();
      const sameEmail = Boolean(emailCliente) && cliente.responsavel_email?.trim().toLowerCase() === emailCliente.toLowerCase();
      const samePhone = Boolean(telefoneCliente) && cliente.responsavel_telefone?.trim().replace(/\D/g, "") === telefoneCliente.replace(/\D/g, "");
      return sameName || sameEmail || samePhone;
    });

    if (match) {
      const payload: Record<string, any> = {
        razao_social: nomeCliente,
        responsavel_nome: nomeCliente,
        responsavel_email: emailCliente || match.responsavel_email || null,
        responsavel_telefone: telefoneCliente || match.responsavel_telefone || null,
      };

      const { error } = await (supabase.from("clientes_corp") as any).update(payload).eq("id", match.id);
      if (error) console.error("Erro ao atualizar cliente do CRM:", error);
      return;
    }

    const payload: Record<string, any> = {
      razao_social: nomeCliente,
      responsavel_nome: nomeCliente,
      responsavel_email: emailCliente || null,
      responsavel_telefone: telefoneCliente || null,
    };

    const { error } = await supabase.from("clientes_corp").insert(payload);
    if (error) {
      console.error("Erro ao criar cliente do CRM:", error);
    }
  }

  async function save() {
    if (!dataStr) {
      toast({ title: "Informe a data da reserva", variant: "destructive" });
      return;
    }
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      toast({ title: "Preencha nome, email e telefone", variant: "destructive" });
      return;
    }
    if (horaFim <= horaInicio) {
      toast({ title: "Horário de fim deve ser após o início", variant: "destructive" });
      return;
    }
    setSaving(true);

    const serieId = recorrente && datasPrevistas.length > 1
      ? (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
      : null;
    await syncClienteComCRM();

    const datas = datasPrevistas;
    const criadas: string[] = [];
    const puladas: string[] = [];

    let saldoRestante = calculoPlano ? calculoPlano.saldoDepois + calculoPlano.cobertas : 0;
    for (const dt of datas) {
      // Revalida cada data no servidor antes de inserir
      if (selectedSala) {
        const cfs = await verificarConflitos(selectedSala, dt, horaInicio, horaFim);
        if (cfs.length > 0) {
          puladas.push(dt.split("-").reverse().join("/"));
          continue;
        }
      }
      const sala = salas.find((item) => item.id === selectedSala);
      const horas = horasDaReserva({ hora_inicio: horaInicio, hora_fim: horaFim });
      const ocorrencia = calculoPlano ? calculateReservationPrice({ tipo: tipo as "hora" | "diaria", horas, saldo: saldoRestante, precoHora: sala?.preco_hora_avulsa == null ? null : Number(sala.preco_hora_avulsa), precoDiaria: sala?.preco_diaria == null ? null : Number(sala.preco_diaria) }) : null;
      const valorOcorrenciaBase = ocorrencia?.valor ?? precoTabela;
      const valorOcorrencia = valorManual.trim() !== "" ? Number(valorManual.replace(",", ".")) || 0 : valorOcorrenciaBase;
      const descontoOcorrencia = valorOcorrencia != null && valorOcorrenciaBase != null && valorOcorrencia < valorOcorrenciaBase;
      const payload: any = {
        nome: nome.trim(), email: email.trim(), telefone: telefone.trim(),
        ambiente, tipo, data: dt,
        hora_inicio: horaInicio + ":00", hora_fim: horaFim + ":00",
        status, origem, observacoes: observacoes.trim() || null,
        unidade_id: selectedUnidade || null,
        sala_id: selectedSala || null,
        valor: valorOcorrencia,
        valor_original: valorOcorrenciaBase,
        plano_id: calculoPlano?.plano?.id || null,
        horas_reservadas: horas,
        horas_cobertas_plano: ocorrencia?.cobertas || 0,
        horas_excedentes: ocorrencia?.excedentes || 0,
        calculo_justificativa: ocorrencia ? `${ocorrencia.cobertas}h cobertas pelo plano ${calculoPlano?.plano?.nome}${ocorrencia.excedentes ? `; ${ocorrencia.excedentes}h excedentes` : ""}.` : "Reserva avulsa conforme o preço configurado para a sala.",
        desconto_motivo: descontoOcorrencia ? (descontoMotivo.trim() || "Desconto concedido pelo gestor") : null,
        desconto_por: descontoOcorrencia ? "admin" : null,
        serie_id: serieId,
      };
      const { data: ins, error } = await (supabase.from("reservations") as any).insert(payload).select("id").single();
      if (error) {
        toast({ title: "Erro ao criar reserva", description: friendlyError(error, "Não foi possível criar a reserva."), variant: "destructive" });
        setSaving(false);
        onCreated?.();
        return;
      }
      if (ocorrencia) saldoRestante = ocorrencia.saldoDepois;
      criadas.push(ins.id);
      try {
        await invokeGoogleSync({ action: "upsert", type: "reserva", id: ins.id });
      } catch {}
    }

    setSaving(false);

    if (criadas.length === 0) {
      toast({
        title: "Nenhuma reserva criada",
        description: `Sala indisponível nas datas: ${puladas.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: criadas.length > 1 ? `${criadas.length} reservas criadas` : "Reserva criada",
      description: puladas.length ? `Ignoradas por indisponibilidade: ${puladas.join(", ")}` : undefined,
    });
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-lg">
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
              <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-3 flex flex-col gap-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" /> Nenhum cliente encontrado.
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs h-8 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                  onClick={(e) => {
                    e.preventDefault();
                    // Just filling the fields is enough for "Quick Create" as it uses 'nome', 'email', 'telefone' directly in save()
                    setShowList(false);
                    toast({ title: "Modo Cadastro Rápido", description: "Preencha email e telefone abaixo para cadastrar." });
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Usar "{nome}" como novo cliente
                </Button>
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
            <Label className="text-xs">Unidade</Label>
            <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
              <SelectTrigger><SelectValue placeholder="Escolha a unidade" /></SelectTrigger>
              <SelectContent>
                {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sala</Label>
            <Select 
              value={selectedSala} 
              onValueChange={setSelectedSala}
              disabled={!selectedUnidade}
            >
              <SelectTrigger><SelectValue placeholder={selectedUnidade ? "Escolha a sala" : "Selecione unidade primeiro"} /></SelectTrigger>
              <SelectContent>
                {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({s.tipo})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden">
            <Label className="text-xs">Ambiente (Legacy)</Label>
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
            <Label className="text-xs">Data</Label>
            <Input type="date" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-0.5">Digite ou escolha a data — a reserva aparece no calendário nesse dia.</p>
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

          {/* Aviso compacto de disponibilidade abaixo dos campos de horário */}
          <div className="col-span-2 -mt-1">
            {checkingConflitos ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidade da sala…
              </p>
            ) : temBloqueio ? (
              <p className="text-[11px] text-red-700 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-[2px] shrink-0" />
                Data bloqueada ({conflitos.filter(c => c.tipo === 'bloqueio').map(c => c.nome).join(", ")}) — escolha outro dia.
              </p>
            ) : temConflitoSala ? (
              <p className="text-[11px] text-red-700 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-[2px] shrink-0" />
                Sala já ocupada neste horário ({conflitos.filter(c => c.tipo !== 'bloqueio').map(c => `${c.nome} ${c.hora_inicio}-${c.hora_fim}`).join(", ")}). Outros horários do mesmo dia estão livres.
              </p>
            ) : selectedSala ? (
              <p className="text-[11px] text-green-700">Sala disponível neste horário.</p>
            ) : null}
          </div>

          {/* Recorrência */}
          <div className="col-span-2 rounded-lg border p-2 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
              Repetir reserva (recorrência)
            </label>
            {recorrente && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Frequência</Label>
                  <Select value={recFreq} onValueChange={(v: any) => setRecFreq(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Toda semana (mesmo dia)</SelectItem>
                      <SelectItem value="quinzenal">A cada 15 dias</SelectItem>
                      <SelectItem value="mensal">Todo mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Repetir até</Label>
                  <Input type="date" value={recAte} min={dataStr} onChange={(e) => setRecAte(e.target.value)} />
                </div>
                <p className="col-span-2 text-[10px] text-muted-foreground">
                  {recAte
                    ? `Serão criadas ${datasPrevistas.length} reservas. Datas com a sala ocupada, domingos e feriados são automaticamente ignoradas.`
                    : "Informe a data final da recorrência."}
                </p>
              </div>
            )}
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
          let horas = 0;
          if (horaInicio && horaFim && horaFim > horaInicio) {
            const [h1, m1] = horaInicio.split(":").map(Number);
            const [h2, m2] = horaFim.split(":").map(Number);
            horas = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
          }
           const preco = valorFinal;
          const detalhe = calculandoPlano ? "Calculando uso do plano…" : calculoPlano
            ? `${calculoPlano.plano.nome} · ${calculoPlano.cobertas.toFixed(1)}h cobertas · saldo após: ${calculoPlano.saldoDepois.toFixed(1)}h`
             : precoTabela != null ? `Avulso · ${fmtBRL(precoTabela)}` : "Valor sob consulta";
          const AMB_LBL: Record<string,string> = { estacao:"Estação de Trabalho", sala_privativa:"Sala Privativa", sala_reuniao:"Sala de Reunião" };
          const dataTxt = dataStr ? dataStr.split("-").reverse().join("/") : "";
          const hiTxt = tipo === "diaria" ? "09:00" : horaInicio;
          const hfTxt = tipo === "diaria" ? "17:00" : horaFim;
          const desc = `Reserva ${AMB_LBL[ambiente]} (${tipo==="diaria"?"Diaria":"Por Hora"}) - ${dataTxt} ${hiTxt}-${hfTxt}`;
           const cobrarHref = linkCobrancaWhatsApp({ nome, telefone, valor: preco || 0, descricao: desc });
           const cobrarDisabled = !nome.trim() || !telefone.trim() || preco == null || preco <= 0;
          return (
            <div className="mt-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Valor estimado</div>
                  <div className="text-[11px] text-muted-foreground">{detalhe}</div>
                </div>
                <div className="text-right">
                  {temDesconto && (
                    <div className="text-[11px] line-through text-muted-foreground">R$ {precoTabela.toFixed(2).replace(".", ",")}</div>
                  )}
                  <div className="font-heading font-black text-2xl text-primary">
                     {calculoPlano?.valor === null ? "Sob consulta" : `R$ ${preco.toFixed(2).replace(".", ",")}`}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor final (desconto manual)</Label>
                  <Input
                    inputMode="decimal"
                    value={valorManual}
                    onChange={(e) => setValorManual(e.target.value)}
                     placeholder={valorBase.toFixed(2).replace(".", ",")}
                  />
                </div>
                <div>
                  <Label className="text-xs">Motivo do desconto</Label>
                  <Input value={descontoMotivo} onChange={(e) => setDescontoMotivo(e.target.value)} placeholder="Ex: cliente parceiro" />
                </div>
              </div>
                {preco > 0 && <Button
                type="button"
                size="sm"
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
                disabled={cobrarDisabled}
                onClick={() => { if (!cobrarDisabled) window.open(cobrarHref, "_blank"); }}
                title={cobrarDisabled ? "Preencha nome, telefone e horário" : "Enviar cobrança PIX via WhatsApp"}
              >
                <DollarSign className="w-4 h-4 mr-1" /> Enviar cobrança PIX ({fmtBRL(preco)}) via WhatsApp
                </Button>}
            </div>
          );
        })()}

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || bloqueiaSalvar}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Criar reserva
          </Button>
        </DialogFooter>
      </DialogScrollContent>
    </Dialog>
  );
}
