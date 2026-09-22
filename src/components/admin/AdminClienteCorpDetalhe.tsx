import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, User, Building2, CreditCard, Users, Edit2, Mail, Phone, Briefcase, FileText, KeyRound } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NovoVisitanteDialog from "./NovoVisitanteDialog";
import { DocumentUpload } from "./DocumentUpload";

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
    responsavel_cpf: "",
    cnpj: "",
    unidade_id: null,
    plano_id: null,
    documentos: []
  });
  const [unidades, setUnidades] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [visitantes, setVisitantes] = useState<any[]>([]);
  const [usoPlano, setUsoPlano] = useState({ horas: 0, reservas: 0, solicitacoes: 0 });
  const [editingFunc, setEditingFunc] = useState<any>(null);
  const [showNovoVisita, setShowNovoVisita] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

      const [funcRes, visRes, reservaRes, contratoRes] = await Promise.all([
        supabase.from('funcionarios_cliente').select('*').eq('cliente_corp_id', id),
        supabase.from('visitantes').select('*, salas(nome)').eq('cliente_corp_id', id),
        cliRes.data.responsavel_email ? supabase.from('reservations').select('hora_inicio, hora_fim, status').eq('email', cliRes.data.responsavel_email) : Promise.resolve({ data: [] } as any),
        cliRes.data.responsavel_email ? supabase.from('contract_requests').select('id, status').eq('email', cliRes.data.responsavel_email) : Promise.resolve({ data: [] } as any)
      ]);

      setFuncionarios(funcRes.data || []);
      setVisitantes(visRes.data || []);
      const reservasAtivas = (reservaRes.data || []).filter((r: any) => r.status !== 'cancelada');
      const horas = reservasAtivas.reduce((total: number, r: any) => {
        const [startHour, startMinute] = String(r.hora_inicio || '00:00').slice(0, 5).split(':').map(Number);
        const [endHour, endMinute] = String(r.hora_fim || '00:00').slice(0, 5).split(':').map(Number);
        return total + Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
      }, 0);
      setUsoPlano({ horas, reservas: reservasAtivas.length, solicitacoes: (contratoRes.data || []).length });
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
      // @ts-ignore
      responsavel_cpf: cliente.responsavel_cpf,
      cnpj: cliente.cnpj,
      // @ts-ignore
      unidade_id: cliente.unidade_id,
      // @ts-ignore
      plano_id: cliente.plano_id,
      // @ts-ignore
      documentos: cliente.documentos || []
    }).eq('id', id);

    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Cliente atualizado");
    setSaving(false);
  }

  async function saveFunc() {
    if (!editingFunc?.nome) return toast.error("Nome é obrigatório");
    
    // Ensure cliente_corp_id is present
    const payload = { ...editingFunc, cliente_corp_id: id };
    
    const { error } = editingFunc.id 
      ? await supabase.from('funcionarios_cliente').update(payload).eq('id', editingFunc.id)
      : await supabase.from('funcionarios_cliente').insert([payload]);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Colaborador salvo");
      setEditingFunc(null);
      fetchData();
    }
  }

  async function saveAccessPassword() {
    if (accessPassword.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (!id) return toast.error("Cliente não identificado. Reabra a ficha e tente novamente.");
    setSavingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-client-password", {
        body: { cliente_id: id, password: accessPassword },
      });
      const response = data as { ok?: boolean; error?: string } | null;
      const message = response?.error || (error ? "Sua sessão administrativa expirou. Entre novamente." : undefined);
      if (message || !response?.ok) throw new Error(message || "A senha não foi confirmada pelo sistema.");
      toast.success("Senha de acesso atualizada e confirmada");
      setAccessPassword("");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha");
    } finally {
      setSavingPassword(false);
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input value={cliente.responsavel_nome || ''} onChange={e => setCliente({...cliente, responsavel_nome: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>CPF do Responsável</Label>
                <Input value={cliente.responsavel_cpf || ''} onChange={e => setCliente({...cliente, responsavel_cpf: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={cliente.responsavel_email || ''} onChange={e => setCliente({...cliente, responsavel_email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Whatsapp</Label>
                <Input value={cliente.responsavel_telefone || ''} onChange={e => setCliente({...cliente, responsavel_telefone: e.target.value})} />
              </div>
            </div>
            
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-brand-orange" />
                <Label className="text-lg font-bold">Documentos do Responsável</Label>
              </div>
              <DocumentUpload 
                value={cliente.documentos || []} 
                onChange={docs => setCliente({...cliente, documentos: docs})} 
              />
            </div>

            <Button className="w-fit mt-4" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
            <div className="border-t pt-4 space-y-2"><Label className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> Senha de acesso do cliente</Label><div className="flex gap-2"><Input type="password" value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /><Button onClick={saveAccessPassword} disabled={savingPassword}>{savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Definir senha"}</Button></div></div>
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
            <div className="border-t pt-4">
              <h3 className="font-heading font-bold mb-3">Uso do plano</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Horas reservadas</p><p className="text-2xl font-black">{usoPlano.horas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Reservas ativas</p><p className="text-2xl font-black">{usoPlano.reservas}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Solicitações</p><p className="text-2xl font-black">{usoPlano.solicitacoes}</p></div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="funcionarios" className="mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Colaboradores Autorizados</h3>
              <Button size="sm" onClick={() => setEditingFunc({ nome: "", cargo: "", telefone: "", cliente_corp_id: id })}><Plus className="w-4 h-4 mr-2" /> Novo Colaborador</Button>
            </div>
            <div className="grid gap-2">
              {funcionarios.map(f => (
                <div key={f.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{f.cargo} · {f.telefone || f.email}</p>
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
              <h3 className="font-bold">Visitantes</h3>
              <Button size="sm" variant="outline" onClick={() => setShowNovoVisita(true)}><Plus className="w-4 h-4 mr-2" /> Novo Visitante</Button>
            </div>
            <div className="grid gap-2">
              {visitantes.map(v => (
                <div key={v.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-xs">{v.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {v.data_hora_prevista
                        ? `${v.salas?.nome ? v.salas.nome + " · " : ""}${new Date(v.data_hora_prevista).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
                        : "Cadastro sem agendamento"}
                    </p>
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
              <Label>Whatsapp</Label>
              <Input value={editingFunc?.telefone || ""} onChange={e => setEditingFunc({...editingFunc, telefone: e.target.value})} />
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
        clienteCorpId={id}
        initialClienteCorpId={id}
        date={new Date()}
      />
    </div>
  );
}
