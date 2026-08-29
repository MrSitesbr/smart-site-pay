import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./ImageUpload";
import { MediaPickerModal } from "./MediaPickerModal";
import { ArrowLeft, ImageIcon, Save, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const defaultForm = {
  nome: "",
  endereco: "",
  descricao: "",
  foto_url: "",
  galeria: [] as string[],
  servicos_infra: [] as any[],
};

export default function AdminUnidadeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = location.pathname.endsWith("/novo");
  const isEditing = Boolean(id && !isNew);
  const [form, setForm] = useState<any>(defaultForm);
  const [loading, setLoading] = useState(isEditing);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setForm(defaultForm);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .eq("id", id)
        .single();

      if (!mounted) return;

      if (error) {
        toast.error("Erro ao carregar unidade para edição");
        navigate("/admin");
        return;
      }

      setForm({
        nome: data.nome || "",
        endereco: data.endereco || "",
        descricao: data.descricao || "",
        foto_url: data.foto_url || "",
        galeria: data.galeria || [],
        servicos_infra: data.servicos_infra || [],
      });
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id, isEditing, navigate]);

  async function saveUnidade() {
    if (!form.nome?.trim()) {
      toast.error("Nome da unidade é obrigatório");
      return;
    }

    const payload: any = {
      nome: form.nome,
      endereco: form.endereco,
      descricao: form.descricao,
      foto_url: form.galeria?.[0] || form.foto_url || "",
      galeria: form.galeria || [],
      servicos_infra: form.servicos_infra || [],
    };

    const { data, error } = isEditing
      ? await supabase.from("unidades").update(payload).eq("id", id).select().single()
      : await supabase.from("unidades").insert([payload]).select().single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditing ? "Unidade atualizada com sucesso!" : "Unidade criada com sucesso!");
    navigate(`/admin/unidades/${data.id}`);
  }

  const handleInfraToggle = (servico: { id: string; nome: string }) => {
    const current = form.servicos_infra || [];
    const exists = current.some((item: any) => item.id === servico.id);

    setForm({
      ...form,
      servicos_infra: exists
        ? current.filter((item: any) => item.id !== servico.id)
        : [...current, { ...servico, descricao: `Disponível na unidade ${form.nome || "nova unidade"}` }],
    });
  };

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
            <span className="font-bold">
              {isEditing ? "Editar unidade" : "Nova unidade"}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-brand-blue-dark/5 shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-orange">Configuração</p>
              <h1 className="text-3xl font-heading font-black text-brand-blue-dark mt-2">
                {isEditing ? "Detalhes da unidade" : "Cadastro de nova unidade"}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button onClick={saveUnidade} className="bg-brand-blue-dark text-white hover:bg-brand-blue-dark/90">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome da Unidade</label>
                <Input
                  value={form.nome || ""}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Unidade Boqueirão"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Endereço completo</label>
                <Input
                  value={form.endereco || ""}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Rua, número, bairro..."
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Descrição da unidade</label>
              <Textarea
                value={form.descricao || ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={5}
                placeholder="Descreva os diferenciais, ambiente e infraestrutura desta unidade."
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700">Serviços de infraestrutura</label>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { id: "wifi", nome: "Internet Fibra" },
                  { id: "cafe", nome: "Café e Água" },
                  { id: "print", nome: "Impressões" },
                ].map((servico) => {
                  const checked = (form.servicos_infra || []).some((item: any) => item.id === servico.id);

                  return (
                    <label
                      key={servico.id}
                      className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                        checked={checked}
                        onChange={() => handleInfraToggle(servico)}
                      />
                      <span className="text-sm font-bold text-slate-700">{servico.nome}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button onClick={saveUnidade} className="bg-brand-orange hover:bg-brand-orange/90 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar unidade
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
