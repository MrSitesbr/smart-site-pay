import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { MediaPickerModal } from "./MediaPickerModal";
import { ArrowLeft, Building2, CheckCircle2, ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";

const categorias = [
  { value: "privativa", label: "Sala Privativa" },
  { value: "compartilhado", label: "Escritório Compartilhado" },
  { value: "consultorio_poltrona", label: "Consultório com Poltrona" },
  { value: "consultorio_maca", label: "Consultório com Maca" },
] as const;

const tiposLocacao = [
  { value: "locacao_mensal", label: "Locação Mensal" },
  { value: "locacao_periodo", label: "Locação por Período" },
] as const;

const subtiposPeriodo = [
  { value: "pacote_mensal", label: "Pacote Mensal" },
  { value: "locacao_avulsa", label: "Locação Avulsa" },
] as const;

const statusOptions = [
  { value: "disponivel", label: "Disponível" },
  { value: "indisponivel", label: "Indisponível" },
  { value: "oculto", label: "Oculto" },
] as const;

const defaultForm = {
  nome: "",
  categoria: categorias[0].value,
  tipo_locacao: tiposLocacao[0].value,
  subtipo_periodo: "",
  capacidade: "",
  descricao: "",
  foto_url: "",
  galeria: [] as string[],
  status: statusOptions[0].value,
  metadata: {
    metragem: 0,
    tem_janela: false,
    tem_lavatorio: false,
  },
  planos_permitidos: [] as string[],
  preco_locacao_mensal: "",
  preco_periodo_pacote_mensal: "",
  preco_periodo_locacao_avulsa: "",
};

export default function AdminSalaFormPage() {
  const { id, unidadeId } = useParams<{ id: string; unidadeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = location.pathname.includes("/salas/novo");
  const isEditing = Boolean(id && location.pathname.includes("/editar"));
  const [form, setForm] = useState<any>(defaultForm);
  const [allPlanos, setAllPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(isEditing || Boolean(id));
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  useEffect(() => {
    const loadPlanos = async () => {
      const { data, error } = await supabase.from("planos").select("*").order("nome");
      if (!error) setAllPlanos(data || []);
    };

    loadPlanos();

    if (!isEditing && !isNew) {
      setForm(defaultForm);
      setLoading(false);
      return;
    }

    if (isEditing && id) {
      let mounted = true;
      (async () => {
        setLoading(true);
        const [salaRes, planosRes] = await Promise.all([
          supabase.from("salas").select("*").eq("id", id).single(),
          supabase.from("sala_planos").select("plano_id").eq("sala_id", id),
        ]);

        if (!mounted) return;

        if (salaRes.error) {
          toast.error("Erro ao carregar sala para edição");
          navigate("/admin");
          return;
        }

        const sala = salaRes.data || {};
        const tipoLocacao = sala.tipo_locacao || tiposLocacao[0].value;
        const needsSubTipo = tipoLocacao === "locacao_periodo";
        const subtipo = needsSubTipo ? (sala.subtipo_periodo || subtiposPeriodo[0].value) : "";

        setForm({
          nome: sala.nome || "",
          categoria: sala.categoria || categorias[0].value,
          tipo_locacao: tipoLocacao,
          subtipo_periodo: subtipo,
          capacidade: sala.capacidade?.toString() || "",
          descricao: sala.descricao || "",
          foto_url: sala.foto_url || "",
          galeria: sala.galeria || [],
          status: sala.status || statusOptions[0].value,
          metadata: sala.metadata || {
            metragem: 0,
            tem_janela: false,
            tem_lavatorio: false,
          },
          planos_permitidos: (planosRes.data || []).map((p: any) => p.plano_id),
          preco_locacao_mensal: sala.preco_locacao_mensal?.toString() || "",
          preco_periodo_pacote_mensal: sala.preco_periodo_pacote_mensal?.toString() || "",
          preco_periodo_locacao_avulsa: sala.preco_periodo_locacao_avulsa?.toString() || "",
        });
        setLoading(false);
      })();

      return () => {
        mounted = false;
      };
    }

    if (isNew) {
      setForm({
        ...defaultForm,
        unidade_id: unidadeId || "",
      });
      setLoading(false);
    }
  }, [id, isEditing, isNew, navigate, unidadeId]);

  async function saveSala() {
    if (!form.nome?.trim()) {
      toast.error("Nome da sala é obrigatório");
      return;
    }

    const precoLocacaoMensal = form.preco_locacao_mensal === "" ? null : Number(form.preco_locacao_mensal);
    const precoPeriodoPacoteMensal = form.preco_periodo_pacote_mensal === "" ? null : Number(form.preco_periodo_pacote_mensal);
    const precoPeriodoLocacaoAvulsa = form.preco_periodo_locacao_avulsa === "" ? null : Number(form.preco_periodo_locacao_avulsa);

    const payload: any = {
      nome: form.nome,
      categoria: form.categoria,
      tipo_locacao: form.tipo_locacao,
      subtipo_periodo: form.tipo_locacao === "locacao_periodo" ? form.subtipo_periodo : null,
      capacidade: Number(form.capacidade) || null,
      descricao: form.descricao,
      foto_url: form.galeria?.[0] || form.foto_url || "",
      galeria: form.galeria || [],
      status: form.status || "disponivel",
      metadata: form.metadata || {
        metragem: 0,
        tem_janela: false,
        tem_lavatorio: false,
      },
      unidade_id: isEditing ? undefined : unidadeId,
      preco_locacao_mensal: precoLocacaoMensal,
      preco_periodo_pacote_mensal: precoPeriodoPacoteMensal,
      preco_periodo_locacao_avulsa: precoPeriodoLocacaoAvulsa,
    };

    if (isEditing && id) {
      const { error } = await supabase.from("salas").update(payload).eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }

      await supabase.from("sala_planos").delete().eq("sala_id", id);
      if (form.planos_permitidos?.length) {
        const relations = form.planos_permitidos.map((planoId: string) => ({ sala_id: id, plano_id: planoId }));
        await supabase.from("sala_planos").insert(relations);
      }

      toast.success("Sala atualizada com sucesso!");
      navigate(`/admin/unidades/sala/${id}`);
      return;
    }

    const { data, error } = await supabase.from("salas").insert([payload]).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }

    if (form.planos_permitidos?.length) {
      const relations = form.planos_permitidos.map((planoId: string) => ({ sala_id: data.id, plano_id: planoId }));
      await supabase.from("sala_planos").insert(relations);
    }

    toast.success("Sala criada com sucesso!");
    navigate(`/admin/unidades/sala/${data.id}`);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-96 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white shadow-xl rounded-2xl border border-slate-200/80 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-semibold text-slate-900">{isEditing ? "Editar Sala" : "Nova Sala"}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da sala" />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-white"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {categorias.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Locação</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-white"
                  value={form.tipo_locacao}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm({ ...form, tipo_locacao: next, subtipo_periodo: next === "locacao_periodo" ? form.subtipo_periodo || subtiposPeriodo[0].value : "" });
                  }}
                >
                  {tiposLocacao.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.tipo_locacao === "locacao_periodo" && (
                <div className="space-y-2">
                  <Label>Subtipo de Período</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 bg-white"
                    value={form.subtipo_periodo}
                    onChange={(e) => setForm({ ...form, subtipo_periodo: e.target.value })}
                  >
                    {subtiposPeriodo.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-white"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="Ex.: 4" />
              </div>

              <div className="space-y-2">
                <Label>Preço Locação Mensal</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.preco_locacao_mensal}
                  onChange={(e) => setForm({ ...form, preco_locacao_mensal: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>

              {form.tipo_locacao === "locacao_periodo" && (
                <>
                  <div className="space-y-2">
                    <Label>Preço Pacote Mensal</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.preco_periodo_pacote_mensal}
                      onChange={(e) => setForm({ ...form, preco_periodo_pacote_mensal: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço Locação Avulsa</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.preco_periodo_locacao_avulsa}
                      onChange={(e) => setForm({ ...form, preco_periodo_locacao_avulsa: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <ImageUpload
                value={form.galeria || []}
                onChange={(urls) => {
                  const primeiro = Array.isArray(urls) && urls.length ? urls[0] : "";
                  setForm({ ...form, galeria: Array.isArray(urls) ? urls : [], foto_url: primeiro });
                }}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Galeria</label>
                <div className="flex gap-2 flex-wrap">
                  {form.galeria?.map((url) => (
                    <div key={url} className="relative group">
                      <img src={url} className="w-24 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100"
                        onClick={() =>
                          setForm({
                            ...form,
                            galeria: form.galeria.filter((item: string) => item !== url),
                          })
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {!form.galeria?.length && <p className="text-slate-500 text-sm">Sem imagens na galeria</p>}
                </div>
                <Button type="button" variant="outline" onClick={() => setIsMediaPickerOpen(true)}>
                  <ImageIcon className="w-4 h-4 mr-2" /> Adicionar imagens
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Planos permitidos</label>
                <div className="border rounded-md divide-y">
                  {allPlanos.map((p) => {
                    const checked = (form.planos_permitidos || []).includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = form.planos_permitidos || [];
                            const next = e.target.checked
                              ? [...current, p.id]
                              : current.filter((id: string) => id !== p.id);
                            setForm({ ...form, planos_permitidos: next });
                          }}
                        />
                        <span className="truncate">{p.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Descrição / observações</label>
                <Textarea
                  value={form.descricao || ""}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={5}
                  placeholder="Recursos disponíveis, metragem, ambiente, etc."
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button onClick={saveSala} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar sala
            </Button>
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url) => {
          setForm({ ...form, galeria: [...(form.galeria || []), url] });
          setIsMediaPickerOpen(false);
        }}
      />
    </div>
  );
}
