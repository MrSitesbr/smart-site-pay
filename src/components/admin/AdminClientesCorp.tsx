import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NovoClienteCorpDialog from "./NovoClienteCorpDialog";
import { toast } from "sonner";

export default function AdminClientesCorp() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [showNovo, setShowNovo] = useState(false);

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    const { data, error } = await (supabase.from('clientes_corp') as any).select('*');
    if (error) {
      toast.error("Erro ao carregar empresas clientes: " + error.message);
      return;
    }
    setClientes((data || []).filter((cliente: any) => !cliente.deleted_at));
  }

  async function arquivarCliente(id: string) {
    if (!confirm("Arquivar este cliente? O histórico será preservado.")) return;
    const { error } = await (supabase.from('clientes_corp') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return;
    fetchClientes();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Empresas clientes</h2>
          <p className="text-muted-foreground">Cada empresa possui seus próprios dados, colaboradores e visitantes.</p>
        </div>
        <Button onClick={() => setShowNovo(true)} className="bg-brand-orange text-white"><Plus className="w-4 h-4 mr-2" /> Novo Cliente Corp</Button>
      </div>

      <NovoClienteCorpDialog 
        open={showNovo} 
        onOpenChange={setShowNovo} 
        onCreated={(c) => {
          fetchClientes();
          navigate(`/admin/clientes-corp/${c.id}`);
        }}
      />

      <div className="grid gap-4">
        {clientes.map(c => (
          <Card key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{c.razao_social}</h3>
              <p className="text-sm text-muted-foreground">{c.responsavel_nome} · {c.responsavel_email}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clientes-corp/${c.id}`)}>Ver Detalhes</Button>
              <Button variant="ghost" size="sm" title="Arquivar cliente" onClick={() => arquivarCliente(c.id)}><Archive className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><MessageCircle className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
