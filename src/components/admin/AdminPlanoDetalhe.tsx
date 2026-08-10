import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Building2, Clock, DollarSign, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminPlanoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [plano, setPlano] = useState<any>({
    nome: "",
    quantidade_horas: 0,
    preco: 0,
    validade_dias: 30,
    descricao: ""
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: unidadesData } = await supabase.from("unidades").select("id, nome");
    setUnidades(unidadesData || []);

    if (id !== "novo") {
      const { data: planoData } = await supabase.from("planos").select("*").eq("id", id).single();
      if (planoData) {
        setPlano(planoData);
        const { data: puData } = await supabase.from("plano_unidades").select("unidade_id").eq("plano_id", id);
        setSelectedUnidades(puData?.map(u => u.unidade_id) || []);
      }
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!plano.nome) return toast.error("Nome é obrigatório");

    const payload = {
      nome: plano.nome,
      quantidade_horas: parseInt(plano.quantidade_horas.toString()),
      preco: parseFloat(plano.preco.toString()),
      validade_dias: plano.validade_dias ? parseInt(plano.validade_dias.toString()) : null,
      descricao: plano.descricao
    };

    let planoId = id;
    if (id === "novo") {
      const { data, error } = await supabase.from("planos").insert([payload]).select().single();
      if (error) return toast.error(error.message);
      planoId = data.id;
    } else {
      const { error } = await supabase.from("planos").update(payload).eq("id", id);
      if (error) return toast.error(error.message);
    }

    // Atualizar unidades vinculadas
    await supabase.from("plano_unidades").delete().eq("plano_id", planoId);
    if (selectedUnidades.length > 0) {
      const inserts = selectedUnidades.map(uid => ({ plano_id: planoId, unidade_id: uid }));
      await supabase.from("plano_unidades").insert(inserts);
    }

    toast.success("Plano salvo com sucesso!");
    navigate("/admin");
  }

  const toggleUnidade = (uid: string) => {
    setSelectedUnidades(prev => 
      prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]
    );
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#f0f0f1] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/admin")} className="hover:bg-brand-blue-dark/5">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-3">
            <Button onClick={handleSave} className="bg-brand-orange text-white">
              <Save className="w-4 h-4 mr-2" /> Salvar Plano
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-brand-blue-dark mb-6">Informações do Plano</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nome do Plano</label>
                  <Input 
                    value={plano.nome} 
                    onChange={e => setPlano({...plano, nome: e.target.value})}
                    placeholder="Ex: Plano 013 Plus - 10 Horas"
                    className="text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Descrição Detalhada</label>
                  <Textarea 
                    value={plano.descricao || ""} 
                    onChange={e => setPlano({...plano, descricao: e.target.value})}
                    placeholder="Descreva o que este plano inclui (ex: café cortesia, internet, etc)"
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Horas</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        value={plano.quantidade_horas} 
                        onChange={e => setPlano({...plano, quantidade_horas: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        step="0.01"
                        value={plano.preco} 
                        onChange={e => setPlano({...plano, preco: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Validade (dias)</label>
                    <Input 
                      type="number"
                      value={plano.validade_dias} 
                      onChange={e => setPlano({...plano, validade_dias: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-brand-blue-dark flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4" /> Unidades Disponíveis
              </h3>
              <div className="space-y-3">
                {unidades.map(u => (
                  <div 
                    key={u.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedUnidades.includes(u.id) 
                        ? "border-brand-orange bg-brand-orange/5" 
                        : "hover:border-brand-blue-dark/20"
                    }`}
                    onClick={() => toggleUnidade(u.id)}
                  >
                    <span className="text-sm font-medium">{u.nome}</span>
                    <Checkbox checked={selectedUnidades.includes(u.id)} onCheckedChange={() => toggleUnidade(u.id)} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-brand-blue-dark text-white border-none">
              <h3 className="font-bold mb-2">Resumo do Plano</h3>
              <div className="space-y-2 text-sm opacity-90">
                <p>• {plano.quantidade_horas} horas inclusas</p>
                <p>• R$ {plano.preco} por período</p>
                <p>• Válido por {plano.validade_dias} dias</p>
                <p>• Disponível em {selectedUnidades.length} unidades</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
