import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function DocumentosCliente({ clienteId }: { clienteId?: string }) {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!clienteId) { setLoading(false); return; }
      const { data } = await supabase
        .from("cliente_documentos")
        .select("*")
        .eq("cliente_corp_id", clienteId)
        .eq("visivel_cliente", true)
        .order("created_at", { ascending: false });
      setLista(data || []);
      setLoading(false);
    })();
  }, [clienteId]);

  async function baixar(doc: any) {
    const { data, error } = await supabase.storage.from("client-docs").createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o documento.");
    window.open(data.signedUrl, "_blank");
  }

  if (!clienteId) return <Card className="p-6 text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</Card>;
  if (loading) return <Card className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></Card>;

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-black text-lg">Documentos ({lista.length})</h3>
      {lista.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum documento disponível ainda.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((d) => (
            <Card key={d.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-secondary shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{d.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.descricao || new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => baixar(d)}><Download className="w-4 h-4 mr-2" /> Baixar</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
