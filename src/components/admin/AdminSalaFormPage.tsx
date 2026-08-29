import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { MediaPickerModal } from "./MediaPickerModal";
import { ArrowLeft, Building2, CheckCircle2, ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";

const defaultForm = {
  nome: "",
  tipo: "Coworking",
  capacidade: "",
  descricao: "",
  foto_url: "",
  galeria: [] as string[],
  metadata: {
    metragem: 0,
    tem_janela: false,
    tem_lavatorio: false,
  },
  planos_permitidos: [] as string[],
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

        setForm({
          nome: salaRes.data.nome || "",
          tipo: salaRes.data.tipo || "Coworking",
          capacidade: salaRes.data.capacidade?.toString() || "",
          descricao: salaRes.data.descricao || "",
          foto_url: salaRes.data.foto_url || "",
          galeria: salaRes.data.galeria || [],
          metadata: salaRes.data.metadata || {
            metragem: 0,
            tem_janela: false,
            tem_lavatorio: false,
          },
          planos_permitidos: (planosRes.data || []).map((p: any) => p.plano_id),
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

    const payload: any = {
      nome: form.nome,
      tipo: form.tipo,
      capacidade: Number(form.capacidade) || null,
      descricao: form.descricao,
      foto_url: form.galeria?.[0] || form.foto_url || "",
      galeria: form.galeria || [],
      metadata: form.metadata || {
        metragem: 0,
        tem_janela: false,
        tem_lavatorio: false,
      },
      unidade_id: isEditing ? undefined : unidadeId,
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
          <div className="h-10 w-64 rounded bg-slate-200" />
          <div className="h-80 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-brand-blue-dark/5">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-brand-blue-dark">
            <Building2 className="w-5 h-5 text-brand-orange" />
            <span className="font-bold">{isEditing ? "Editar sala" : "Nova sala"}</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-brand-blue-dark/5 shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-orange">Configuração</p>
              <h1 className="text-3xl font-heading font-black text-brand-blue-dark mt-2">
                {isEditing ? "Detalhes da sala" : "Cadastro de nova sala"}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button onClick={saveSala} className="bg-brand-blue-dark text-white hover:bg-brand-blue-dark/90">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome da sala</label>
                <Input
                  value={form.nome || ""}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Sala de Reunião 01"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo</label>
                <select
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                  value={form.tipo || "Coworking"}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="Coworking">Coworking (Estação)</option>
                  <option value="Privativa">Sala Privativa</option>
                  <option value="Reunião">Sala de Reunião</option>
                  <option value="Auditório">Auditório</option>
                  <option value="Consultório">Consultório</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Capacidade (pessoas)</label>
                <Input
                  type="number"
                  value={form.capacidade || ""}
                  onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
                  placeholder="Ex: 8"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Metragem (m²)</label>
                <Input
                  type="number"
                  value={form.metadata?.metragem || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      metadata: { ...form.metadata, metragem: Number(e.target.value) || 0 },
                    })
                  }
                  placeholder="Ex: 25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Galeria de fotos</label>
                <Button variant="outline" size="sm" onClick={() => setIsMediaPickerOpen(true)} className="h-8 text-xs">
                  <ImageIcon className="w-3 h-3 mr-2" /> Biblioteca de mídia
                </Button>
              </div>
              <ImageUpload
                value={form.galeria || []}
                onChange={(urls) => setForm({ ...form, galeria: urls })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                  checked={form.metadata?.tem_janela || false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      metadata: { ...form.metadata, tem_janela: e.target.checked },
                    })
                  }
                />
                <span className="text-sm font-medium text-slate-700">Possui janela</span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                  checked={form.metadata?.tem_lavatorio || false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      metadata: { ...form.metadata, tem_lavatorio: e.target.checked },
                    })
                  }
                />
                <span className="text-sm font-medium text-slate-700">Possui lavatório</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Planos permitidos</label>
              <div className="grid md:grid-cols-3 gap-2 mt-1">
                {allPlanos.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 text-xs border p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={(form.planos_permitidos || []).includes(p.id)}
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
                ))}
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
