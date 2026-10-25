import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Building2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { friendlyError } from "@/lib/appErrors";
import { fmtBRL } from "@/lib/planosApi";
import { adminAba, useVoltar } from "@/hooks/useVoltar";

const REGRAS = [
  { id: "semanal", label: "Cota semanal (Harmonia)" },
  { id: "pacote", label: "Pacote de horas com validade (Tranquilidade)" },
  { id: "mensal_reuniao", label: "Horas de reunião por mês (Plus / Compartilhado)" },
  { id: "sem_horas", label: "Sem horas de sala (Endereço)" },
  { id: "avulso", label: "Avulso (por hora)" },
];
const CATEGORIAS = [
  { id: "harmonia", label: "Harmonia" },
  { id: "pacote", label: "Pacote" },
  { id: "endereco", label: "Endereço Fiscal / Comercial" },
  { id: "compartilhado", label: "Compartilhado" },
  { id: "avulso", label: "Avulso" },
];
const COBRANCAS = [
  { id: "mensal", label: "Mensal" },
  { id: "unico", label: "Pagamento único" },
  { id: "hora", label: "Por hora" },
];

const VAZIO = {
  nome: "", subtitulo: "", descricao: "", categoria: "harmonia", regra_uso: "semanal", cobranca: "mensal",
  preco: 0, horas_semana: "", bloco_unico: false, horas_reuniao_mes: "", estacao_livre: false, quantidade_horas: 0,
  duracao_meses: "", preco_hora_adicional: "", beneficios: [] as string[], exibir_site: true, ordem: 100, validade_dias: 30,
};

const numOrNull = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", ".")));

export default function AdminPlanoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const voltar = useVoltar(adminAba("planos_horas"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [plano, setPlano] = useState<any>(VAZIO);
  const [beneficiosTexto, setBeneficiosTexto] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: unidadesData } = await supabase.from("unidades").select("id, nome").order("nome");
    setUnidades(unidadesData || []);

    if (id !== "novo") {
      const { data: planoData } = await supabase.from("planos").select("*").eq("id", id).single();
      if (planoData) {
        const p: any = planoData;
        setPlano({ ...VAZIO, ...p, horas_semana: p.horas_semana ?? "", horas_reuniao_mes: p.horas_reuniao_mes ?? "",
          duracao_meses: p.duracao_meses ?? "", preco_hora_adicional: p.preco_hora_adicional ?? "" });
        setBeneficiosTexto((p.beneficios || []).join("\n"));
        const { data: puData } = await supabase.from("plano_unidades").select("unidade_id").eq("plano_id", id);
        setSelectedUnidades(puData?.map((u: any) => u.unidade_id) || []);
      }
    }
    setLoading(false);
  }

  const set = (campo: string, valor: unknown) => setPlano((p: any) => ({ ...p, [campo]: valor }));

  async function handleSave() {
    if (!plano.nome?.trim()) return toast.error("Nome é obrigatório");
    const preco = Number(String(plano.preco).replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0) return toast.error("Informe um valor válido.");
    const regra = plano.regra_uso;
    if (regra === "semanal" && !(numOrNull(plano.horas_semana)! > 0)) return toast.error("Informe as horas por semana.");
    if (regra === "pacote" && !(Number(plano.quantidade_horas) > 0)) return toast.error("Informe as horas do pacote.");
    if (regra === "mensal_reuniao" && !(numOrNull(plano.horas_reuniao_mes)! > 0)) return toast.error("Informe as horas de reunião por mês.");

    const payload: Record<string, unknown> = {
      nome: plano.nome.trim(),
      subtitulo: plano.subtitulo?.trim() || null,
      descricao: plano.descricao || null,
      categoria: plano.categoria,
      regra_uso: regra,
      cobranca: plano.cobranca,
      preco,
      horas_semana: regra === "semanal" ? numOrNull(plano.horas_semana) : null,
      bloco_unico: regra === "semanal" ? !!plano.bloco_unico : false,
      horas_reuniao_mes: regra === "mensal_reuniao" ? numOrNull(plano.horas_reuniao_mes) : null,
      estacao_livre: regra === "mensal_reuniao" ? !!plano.estacao_livre : false,
      duracao_meses: numOrNull(plano.duracao_meses),
      preco_hora_adicional: regra === "semanal" ? numOrNull(plano.preco_hora_adicional) : null,
      beneficios: beneficiosTexto.split("\n").map((b) => b.trim()).filter(Boolean),
      exibir_site: !!plano.exibir_site,
      ordem: Number(plano.ordem) || 100,
    };
    // Campos antigos só são definidos em planos novos ou de pacote (mantêm a regra anterior dos contratos em revisão).
    if (regra === "pacote" || id === "novo") {
      payload.quantidade_horas = Math.round(Number(plano.quantidade_horas) || 0);
      if (id === "novo") { payload.horas_incluidas = payload.quantidade_horas; payload.periodo_apuracao = "mensal"; payload.validade_dias = 30; }
    }

    setSaving(true);
    let planoId = id;
    if (id === "novo") {
      const { data, error } = await (supabase.from("planos") as any).insert([payload]).select().single();
      if (error) { setSaving(false); return toast.error(friendlyError(error, "Não foi possível criar o plano.")); }
      planoId = data.id;
    } else {
      const { error } = await (supabase.from("planos") as any).update(payload).eq("id", id);
      if (error) { setSaving(false); return toast.error(friendlyError(error, "Não foi possível salvar o plano.")); }
    }

    const { error: delError } = await supabase.from("plano_unidades").delete().eq("plano_id", planoId!);
    if (!delError && selectedUnidades.length > 0) {
      await supabase.from("plano_unidades").insert(selectedUnidades.map((uid) => ({ plano_id: planoId!, unidade_id: uid })) as any);
    }
    setSaving(false);
    toast.success("Plano salvo com sucesso!");
    voltar();
  }

  const toggleUnidade = (uid: string) => setSelectedUnidades((prev) => (prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]));

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const regra = plano.regra_uso;

  return (
    <div className="min-h-screen bg-[#f0f0f1] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={voltar} className="hover:bg-brand-blue-dark/5">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-orange text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar plano
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 sm:p-6 space-y-5">
            <h2 className="text-2xl font-black text-brand-blue-dark">Informações do plano</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="plano-nome">Nome</Label>
                <Input id="plano-nome" value={plano.nome} onChange={(e) => set("nome", e.target.value)} className="text-lg font-bold" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="plano-subtitulo">Resumo curto (aparece no site)</Label>
                <Input id="plano-subtitulo" value={plano.subtitulo || ""} onChange={(e) => set("subtitulo", e.target.value)} placeholder="Ex.: 1 hora por semana" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={plano.categoria || undefined} onValueChange={(v) => set("categoria", v)}>
                  <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regra de uso das horas</Label>
                <Select value={regra || undefined} onValueChange={(v) => set("regra_uso", v)}>
                  <SelectTrigger><SelectValue placeholder="Regra" /></SelectTrigger>
                  <SelectContent>{REGRAS.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plano-preco">Valor (R$)</Label>
                <Input id="plano-preco" inputMode="decimal" value={plano.preco} onChange={(e) => set("preco", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cobrança</Label>
                <Select value={plano.cobranca || undefined} onValueChange={(v) => set("cobranca", v)}>
                  <SelectTrigger><SelectValue placeholder="Cobrança" /></SelectTrigger>
                  <SelectContent>{COBRANCAS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {regra === "semanal" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="plano-hsem">Horas por semana</Label>
                    <Input id="plano-hsem" inputMode="decimal" value={plano.horas_semana} onChange={(e) => set("horas_semana", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plano-adic">Hora adicional (R$/h)</Label>
                    <Input id="plano-adic" inputMode="decimal" value={plano.preco_hora_adicional} onChange={(e) => set("preco_hora_adicional", e.target.value)} />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
                    <span className="text-sm">Um único bloco seguido por semana (Período / Diária)</span>
                    <Switch checked={!!plano.bloco_unico} onCheckedChange={(v) => set("bloco_unico", v)} />
                  </label>
                </>
              )}
              {regra === "pacote" && (
                <div className="space-y-2">
                  <Label htmlFor="plano-qh">Horas do pacote</Label>
                  <Input id="plano-qh" type="number" min={0} value={plano.quantidade_horas} onChange={(e) => set("quantidade_horas", e.target.value)} />
                </div>
              )}
              {regra === "mensal_reuniao" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="plano-hreu">Horas de reunião por mês</Label>
                    <Input id="plano-hreu" inputMode="decimal" value={plano.horas_reuniao_mes} onChange={(e) => set("horas_reuniao_mes", e.target.value)} />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-sm">Estação compartilhada livre (seg–sáb, 8h–20h)</span>
                    <Switch checked={!!plano.estacao_livre} onCheckedChange={(v) => set("estacao_livre", v)} />
                  </label>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="plano-dur">Duração do contrato (meses)</Label>
                <Input id="plano-dur" type="number" min={0} value={plano.duracao_meses} onChange={(e) => set("duracao_meses", e.target.value)} placeholder="Sem prazo" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="plano-benef">Benefícios (um por linha)</Label>
                <Textarea id="plano-benef" rows={5} value={beneficiosTexto} onChange={(e) => setBeneficiosTexto(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="plano-desc">Descrição detalhada</Label>
                <Textarea id="plano-desc" rows={4} value={plano.descricao || ""} onChange={(e) => set("descricao", e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-5 sm:p-6 space-y-4">
              <h3 className="font-bold text-brand-blue-dark">Site público</h3>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Exibir na grade de planos</span>
                <Switch checked={!!plano.exibir_site} onCheckedChange={(v) => set("exibir_site", v)} />
              </label>
              <div className="space-y-2">
                <Label htmlFor="plano-ordem">Ordem de exibição</Label>
                <Input id="plano-ordem" type="number" value={plano.ordem} onChange={(e) => set("ordem", e.target.value)} />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="font-bold text-brand-blue-dark flex items-center gap-2 mb-4"><Building2 className="w-4 h-4" /> Unidades</h3>
              <div className="space-y-3">
                {unidades.map((u) => (
                  <div key={u.id} role="button" tabIndex={0}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedUnidades.includes(u.id) ? "border-brand-orange bg-brand-orange/5" : "hover:border-brand-blue-dark/20"}`}
                    onClick={() => toggleUnidade(u.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleUnidade(u.id)}>
                    <span className="text-sm font-medium">{u.nome}</span>
                    <Checkbox checked={selectedUnidades.includes(u.id)} onCheckedChange={() => toggleUnidade(u.id)} onClick={(e) => e.stopPropagation()} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6 bg-brand-blue-dark text-white border-none">
              <h3 className="font-bold mb-2">Resumo</h3>
              <div className="space-y-1 text-sm opacity-90">
                <p>• {fmtBRL(Number(String(plano.preco).replace(",", ".")) || 0)} {plano.cobranca === "unico" ? "pagamento único" : plano.cobranca === "hora" ? "por hora" : "por mês"}</p>
                {regra === "semanal" && <p>• {plano.horas_semana || 0}h por semana{plano.bloco_unico ? " em um bloco" : ""}</p>}
                {regra === "pacote" && <p>• {plano.quantidade_horas || 0}h no pacote</p>}
                {regra === "mensal_reuniao" && <p>• {plano.horas_reuniao_mes || 0}h de reunião por mês</p>}
                {plano.duracao_meses && <p>• Contrato de {plano.duracao_meses} meses</p>}
                <p>• Disponível em {selectedUnidades.length} unidade(s)</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
