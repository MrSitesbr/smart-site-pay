import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Archive, Check, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import NovoClienteCorpDialog from "./NovoClienteCorpDialog";
import { toast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/appErrors";

export default function AdminClientesCorp() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Database["public"]["Tables"]["clientes_corp"]["Row"][]>([]);
  const [showNovo, setShowNovo] = useState(false);
  const [filter, setFilter] = useState<"todos" | "pendentes">("todos");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_desc" | "created_asc">("name");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => { fetchClientes(); }, []);

  const normalize = (value: string | null | undefined) => (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  const query = normalize(search.trim());
  const filteredClientes = clientes
    .filter((cliente) => {
      const matchesStatus = filter === "todos" || cliente.status_acesso === "pendente";
      const matchesSearch = !query || normalize(cliente.razao_social).includes(query) || normalize(cliente.responsavel_nome).includes(query);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const aCreatedAt = Date.parse(a.created_at || "");
      const bCreatedAt = Date.parse(b.created_at || "");
      const aHasDate = Number.isFinite(aCreatedAt);
      const bHasDate = Number.isFinite(bCreatedAt);

      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
      if (aHasDate && bHasDate) {
        const dateOrder = sortBy === "created_desc" ? bCreatedAt - aCreatedAt : aCreatedAt - bCreatedAt;
        if (dateOrder !== 0) return dateOrder;
      }
      return normalize(a.razao_social).localeCompare(normalize(b.razao_social), "pt-BR");
    });
  const pageCount = Math.max(1, Math.ceil(filteredClientes.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleClientes = filteredClientes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstItem = filteredClientes.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, filteredClientes.length);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  async function fetchClientes() {
    const { data, error } = await supabase.from('clientes_corp').select('*');
    if (error) {
      toast({ title: "Erro ao carregar empresas clientes", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setClientes((data || []).filter((cliente) => !cliente.deleted_at));
  }

  async function arquivarCliente(id: string) {
    if (!confirm("Arquivar este cliente? O histórico será preservado.")) return;
    const { error } = await supabase.from('clientes_corp').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: "Não foi possível arquivar o cliente", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Cliente arquivado" });
    fetchClientes();
  }

  async function excluirCliente(id: string, razaoSocial: string) {
    // Verificar se o cliente tem movimentos financeiros (contratos_ativos, contract_requests ou reservas)
    const { data: contratosAtivos, error: contratosAtivosError } = await supabase.from('contratos_ativos')
      .select('id')
      .eq('cliente_corp_id', id)
      .limit(1);
    
    const { data: contractRequests, error: contractRequestsError } = await supabase.from('contract_requests')
      .select('id')
      .eq('cliente_corp_id', id)
      .limit(1);
    
    if (contratosAtivosError || contractRequestsError) {
      toast({ title: "Erro", description: "Erro ao verificar movimentos financeiros", variant: "destructive" });
      return;
    }

    if ((contratosAtivos && contratosAtivos.length > 0) || 
        (contractRequests && contractRequests.length > 0)) {
      toast({ title: "Erro", description: `Não é possível excluir ${razaoSocial}. Este cliente possui movimento financeiro registrado.`, variant: "destructive" });
      return;
    }

    if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente ${razaoSocial}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const { error } = await supabase.from('clientes_corp').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir cliente", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso", description: "Cliente excluído com sucesso" });
    fetchClientes();
  }

  async function setAccess(id: string, status_acesso: string) {
    const { error } = await supabase.from("clientes_corp").update({ status_acesso }).eq("id", id);
    if (error) toast({ title: "Não foi possível alterar o acesso", description: friendlyError(error), variant: "destructive" });
    else { toast({ title: "Sucesso", description: status_acesso === "aprovado" ? "Cadastro liberado" : "Cadastro recusado" }); fetchClientes(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-black text-brand-blue-dark">Empresas clientes</h2>
          <p className="text-sm text-muted-foreground">Empresas, responsáveis e acessos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === "pendentes" ? "default" : "outline"} onClick={() => { setFilter(filter === "pendentes" ? "todos" : "pendentes"); setPage(1); }}>
            Aguardando liberação
          </Button>
          <Button onClick={() => setShowNovo(true)} className="bg-brand-orange text-white">
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente Corp
          </Button>
        </div>
      </div>

      <NovoClienteCorpDialog 
        open={showNovo} 
        onOpenChange={setShowNovo} 
        onCreated={(c) => {
          fetchClientes();
          navigate(`/admin/clientes-corp/${c.id}`);
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Buscar empresa ou responsável"
            aria-label="Buscar por nome da empresa ou do responsável"
            className="h-9 pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: typeof sortBy) => { setSortBy(value); setPage(1); }}>
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Ordenar empresas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome da empresa (A–Z)</SelectItem>
            <SelectItem value="created_desc">Criação (mais recentes primeiro)</SelectItem>
            <SelectItem value="created_asc">Criação (mais antigas primeiro)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        {visibleClientes.map((c) => (
          <div key={c.id} className="grid gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{c.razao_social}</h3>
                <p className="text-xs text-muted-foreground">Criada em {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate">{c.responsavel_nome || "Sem responsável"}</p>
                <p className="truncate text-xs text-muted-foreground">{c.responsavel_email || "Sem e-mail"}</p>
              </div>
              <span className={`text-xs ${c.status_acesso === "pendente" ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                {c.status_acesso === "pendente" ? "Aguardando liberação" : c.status_acesso === "recusado" ? "Recusado" : "Aprovado"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {c.status_acesso === "pendente" && <>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setAccess(c.id, "aprovado")}><Check className="mr-1 h-4 w-4" /> Liberar</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setAccess(c.id, "recusado")}><X className="mr-1 h-4 w-4" /> Recusar</Button>
              </>}
              <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/admin/clientes-corp/${c.id}`)}>Ver detalhes</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Arquivar cliente" aria-label={`Arquivar ${c.razao_social}`} onClick={() => arquivarCliente(c.id)}><Archive className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir cliente" aria-label={`Excluir ${c.razao_social}`} onClick={() => excluirCliente(c.id, c.razao_social)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
        {visibleClientes.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {search ? "Nenhuma empresa ou responsável encontrado." : filter === "pendentes" ? "Nenhuma empresa aguardando liberação." : "Nenhuma empresa cadastrada."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Mostrando {firstItem}–{lastItem} de {filteredClientes.length} empresas</p>
        <div className="flex items-center gap-2">
          <span>Página {currentPage} de {pageCount}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Próxima página" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
