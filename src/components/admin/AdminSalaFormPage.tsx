import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { MediaPickerModal } from "./MediaPickerModal";
import { ArrowLeft, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { mensagemBancoSala, SALA_CATEGORIAS, SALA_MODALIDADES, tipoAmbienteDasCategorias } from "@/lib/salaOptions";
import { numberOrNull, roomSchema } from "@/lib/validation";

const statusOptions = [
  { value: "disponivel", label: "Disponível" },
  { value: "indisponivel", label: "Indisponível" },
  { value: "oculto", label: "Oculto" },
] as const;

const defaultForm = {
  nome: "",
  categorias: [SALA_CATEGORIAS[0].value] as string[],
  modalidades_locacao: ["mensal"] as string[],
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
  preco_periodo_locacao_avulsa: "",
  preco_diaria: "",
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
      const { data, error } = await supabase.from("planos").select("*").is("deleted_at", null).order("nome");
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
          (supabase.from("salas") as any).select("*").eq("id", id).single(),
          supabase.from("sala_planos").select("plano_id").eq("sala_id", id),
        ]);

        if (!mounted) return;

        if (salaRes.error) {
          toast.error("Erro ao carregar sala para edição");
          navigate("/admin");
          return;
        }

        const sala = salaRes.data || {};
        setForm({
          nome: sala.nome || "",
          categorias: sala.categorias?.length ? sala.categorias : [sala.categoria || SALA_CATEGORIAS[0].value],
          modalidades_locacao: sala.modalidades_locacao?.length ? sala.modalidades_locacao : [sala.tipo_locacao === "locacao_periodo" ? "avulso" : "mensal"],
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
          preco_periodo_locacao_avulsa: sala.preco_periodo_locacao_avulsa?.toString() || "",
          preco_diaria: sala.preco_diaria?.toString() || "",
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
    const parsed = roomSchema.safeParse({
      nome: form.nome,
      unidadeId: form.unidade_id || unidadeId,
      categorias: form.categorias,
      modalidades: form.modalidades_locacao,
      capacidade: Number(form.capacidade),
      descricao: form.descricao || "",
      precoMensal: numberOrNull(form.preco_locacao_mensal),
      precoHora: numberOrNull(form.preco_periodo_locacao_avulsa),
      precoDiaria: numberOrNull(form.preco_diaria),
      planos: form.planos_permitidos || [],
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message || "Revise os campos da sala.");
    const values = parsed.data;
    const { data, error } = await supabase.rpc("save_admin_room", {
      p_id: id || undefined,
      p_unidade_id: form.unidade_id || unidadeId,
      p_nome: form.nome.trim(),
      p_tipo: tipoAmbienteDasCategorias(form.categorias),
      p_categorias: form.categorias,
      p_modalidades: form.modalidades_locacao,
      p_capacidade: values.capacidade,
      p_descricao: form.descricao || "",
      p_foto_url: form.galeria?.[0] || form.foto_url || "",
      p_galeria: form.galeria || [],
      p_status: form.status || "disponivel",
      p_metadata: form.metadata || {},
      p_preco_mensal: values.precoMensal || 0,
      p_preco_hora: values.precoHora || 0,
      p_preco_diaria: values.precoDiaria || 0,
      p_planos: form.planos_permitidos || [],
    });
    if (error) {
      toast.error(mensagemBancoSala(error.message));
      return;
    }
    toast.success(isEditing ? "Sala atualizada com sucesso!" : "Sala criada com sucesso!");
    navigate(`/admin/unidades/sala/${data}`);
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
                <Label>Categorias</Label>
                <div className="grid gap-2 rounded-md border p-3">
                  {SALA_CATEGORIAS.map((cat) => <label key={cat.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.categorias.includes(cat.value)} onChange={(e) => setForm({ ...form, categorias: e.target.checked ? [...form.categorias, cat.value] : form.categorias.filter((value: string) => value !== cat.value) })} />{cat.label}</label>)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modalidades de locação</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {SALA_MODALIDADES.map((item) => <label key={item.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.modalidades_locacao.includes(item.value)} onChange={(e) => setForm({ ...form, modalidades_locacao: e.target.checked ? [...form.modalidades_locacao, item.value] : form.modalidades_locacao.filter((value: string) => value !== item.value) })} />{item.label}</label>)}
                </div>
              </div>

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

              {form.modalidades_locacao.includes("mensal") && <div className="space-y-2">
                <Label>Preço Locação Mensal</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.preco_locacao_mensal}
                  onChange={(e) => setForm({ ...form, preco_locacao_mensal: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>}

              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input type="number" min={1} step={1} value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="Ex.: 4" />
              </div>

              {form.modalidades_locacao.includes("avulso") && (
                  <div className="space-y-2">
                    <Label>Preço avulso por hora</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.preco_periodo_locacao_avulsa}
                      onChange={(e) => setForm({ ...form, preco_periodo_locacao_avulsa: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço da diária</Label>
                    <Input type="number" min={0} value={form.preco_diaria} onChange={(e) => setForm({ ...form, preco_diaria: e.target.value })} placeholder="Sob consulta" />
                  </div>
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
                        <span className="truncate">{p.nome} · {p.horas_incluidas || p.quantidade_horas || 0}h</span>
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
