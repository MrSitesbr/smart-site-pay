import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";
import NovoClienteCorpDialog from "./NovoClienteCorpDialog";

export default function AdminClientesCorp() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [showNovo, setShowNovo] = useState(false);

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    const { data } = await supabase.from('clientes_corp').select('*');
    setClientes(data || []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">CRM Clientes Corporativos</h2>
          <p className="text-muted-foreground">Gerencie empresas e seus responsáveis.</p>
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
              <Button variant="ghost" size="sm"><MessageCircle className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
