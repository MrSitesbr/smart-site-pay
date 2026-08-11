import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, User, Building2, CreditCard, Users, Edit2, Mail, Phone, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NovoVisitanteDialog from "./NovoVisitanteDialog";

export default function AdminClienteCorpDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cliente, setCliente] = useState<any>({
    razao_social: "",
    responsavel_nome: "",
    responsavel_email: "",
    responsavel_telefone: "",
    cnpj: "",
    unidade_id: null,
    plano_id: null
  });
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [editingFunc, setEditingFunc] = useState<any>(null);
  const [showNovoVisita, setShowNovoVisita] = useState(false);

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
      cnpj: cliente.cnpj,
      unidade_id: cliente.unidade_id,
      plano_id: cliente.plano_id
    }).eq('id', id);

    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Cliente atualizado");
    setSaving(false);
  }

  async function saveFunc() {
    if (!editingFunc.nome) return toast.error("Nome é obrigatório");
    const { error } = editingFunc.id 
      ? await supabase.from('funcionarios_cliente').update(editingFunc).eq('id', editingFunc.id)
      : await supabase.from('funcionarios_cliente').insert([editingFunc]);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Colaborador salvo");
      setEditingFunc(null);
      fetchData();
    }
  }

  async function deleteFunc(fid: string) {
    if (!confirm("Excluir colaborador?")) return;
    const { error } = await supabase.from('funcionarios_cliente').delete().eq('id', fid);
    if (error) toast.error(error.message);
    else {
      toast.success("Colaborador removido");
      fetchData();
    }
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
                <Select 
                  value={cliente.unidade_id || ""} 
                  onValueChange={val => setCliente({...cliente, unidade_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a Unidade" /></SelectTrigger>
                  <SelectContent>
                    {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select 
                  value={cliente.plano_id || ""} 
                  onValueChange={val => setCliente({...cliente, plano_id: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o Plano" /></SelectTrigger>
                  <SelectContent>
                    {planos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>Salvar Vinculação</Button>
          </Card>
        </TabsContent>

        <TabsContent value="funcionarios" className="mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Colaboradores Autorizados</h3>
              <Button size="sm" onClick={() => setEditingFunc({ nome: "", cargo: "", email: "", cliente_corp_id: id })}><Plus className="w-4 h-4 mr-2" /> Novo Colaborador</Button>
            </div>
            <div className="grid gap-2">
              {funcionarios.map(f => (
                <div key={f.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{f.cargo} · {f.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingFunc(f)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFunc(f.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
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
              <Button size="sm" variant="outline" onClick={() => setShowNovoVisita(true)}><Plus className="w-4 h-4 mr-2" /> Agendar Visita</Button>
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

      <Dialog open={!!editingFunc} onOpenChange={() => setEditingFunc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFunc?.id ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={editingFunc?.nome || ""} onChange={e => setEditingFunc({...editingFunc, nome: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Cargo</Label>
              <Input value={editingFunc?.cargo || ""} onChange={e => setEditingFunc({...editingFunc, cargo: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={editingFunc?.email || ""} onChange={e => setEditingFunc({...editingFunc, email: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFunc(null)}>Cancelar</Button>
            <Button onClick={saveFunc}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoVisitanteDialog 
        open={showNovoVisita} 
        onOpenChange={setShowNovoVisita} 
        onCreated={fetchData}
        date={new Date()}
      />
    </div>
  );
}
