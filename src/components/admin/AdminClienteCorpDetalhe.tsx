import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, User, Building, CreditCard, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminClienteCorpDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [cliRes, uniRes, planRes] = await Promise.all([
        supabase.from('clientes_corp').select('*').eq('id', id).single(),
        supabase.from('unidades').select('id, nome'),
        supabase.from('planos').select('id, nome')
      ]);

      if (cliRes.error) throw cliRes.error;
      setCliente(cliRes.data);
      setUnidades(uniRes.data || []);
      setPlanos(planRes.data || []);

      const [funcRes, visRes] = await Promise.all([
        supabase.from('funcionarios_cliente').select('*').eq('cliente_corp_id', id),
        supabase.from('visitantes').select('*, salas(nome)').eq('cliente_corp_id', id)
      ]);

      setFuncionarios(funcRes.data || []);
      setVisitantes(visRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('clientes_corp').update({
      razao_social: cliente.razao_social,
      responsavel_nome: cliente.responsavel_nome,
      responsavel_email: cliente.responsavel_email,
      responsavel_telefone: cliente.responsavel_telefone,
      cnpj: cliente.cnpj
    }).eq('id', id);

    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Cliente atualizado");
    setSaving(false);
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <h2 className="text-3xl font-heading font-black text-brand-blue-dark uppercase">{cliente.razao_social}</h2>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="contrato">Unidade & Plano</TabsTrigger>
          <TabsTrigger value="funcionarios">Colaboradores</TabsTrigger>
          <TabsTrigger value="visitantes">Visitantes</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <Card className="p-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={cliente.razao_social} onChange={e => setCliente({...cliente, razao_social: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={cliente.cnpj || ''} onChange={e => setCliente({...cliente, cnpj: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={cliente.responsavel_nome || ''} onChange={e => setCliente({...cliente, responsavel_nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={cliente.responsavel_email || ''} onChange={e => setCliente({...cliente, responsavel_email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={cliente.responsavel_telefone || ''} onChange={e => setCliente({...cliente, responsavel_telefone: e.target.value})} />
              </div>
            </div>
            <Button className="w-fit" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="contrato" className="mt-6">
          <Card className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground italic">Selecione a unidade e plano principal contratado por este cliente.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione a Unidade" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Selecione o Plano" /></SelectTrigger>
                  <SelectContent>
                    {planos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline">Vincular Contrato</Button>
          </Card>
        </TabsContent>

        <TabsContent value="funcionarios" className="mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Colaboradores Autorizados</h3>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Colaborador</Button>
            </div>
            <div className="grid gap-2">
              {funcionarios.map(f => (
                <div key={f.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{f.cargo} · {f.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              {funcionarios.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum colaborador cadastrado.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="visitantes" className="mt-6">
          <Card className="p-6 space-y-4">
             <div className="flex justify-between items-center">
              <h3 className="font-bold">Histórico de Visitantes</h3>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Agendar Visita</Button>
            </div>
            <div className="grid gap-2">
              {visitantes.map(v => (
                <div key={v.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{v.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{v.salas?.nome} · {new Date(v.data_hora_prevista).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {visitantes.length === 0 && <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum visitante registrado.</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
