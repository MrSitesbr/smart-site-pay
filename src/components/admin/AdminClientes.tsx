import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Mail, RotateCcw, Trash2 } from "lucide-react";
import EventAvatar from "./EventAvatar";
import { useClientColors } from "@/hooks/useClientColors";
import { getClientColor } from "@/lib/clientColors";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Estação", sala_privativa: "Sala Privativa", sala_reuniao: "Sala Reunião",
};
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Cliente = {
  email: string;
  nome: string;
  telefone: string;
  nicho: string | null;
  total_solicitacoes: number;
  total_pago: number;
  total_pendente: number;
  ambientes: Set<string>;
  ultima_atividade: string;
};

export default function AdminClientes({ contratos, reservas }: { contratos: any[]; reservas: any[] }) {
  const [search, setSearch] = useState("");
  const { overrides, setColor, clearColor } = useClientColors();

  const clientes = useMemo(() => {
    const map = new Map<string, Cliente>();
    const add = (email: string, patch: Partial<Cliente>) => {
      const key = email.toLowerCase();
      const cur = map.get(key) || {
        email, nome: "", telefone: "", nicho: null,
        total_solicitacoes: 0, total_pago: 0, total_pendente: 0,
        ambientes: new Set<string>(), ultima_atividade: "",
      };
      map.set(key, { ...cur, ...patch, ambientes: new Set([...cur.ambientes, ...(patch.ambientes || [])]) } as Cliente);
    };
    contratos.forEach((c) => {
      const cur = map.get(c.email.toLowerCase());
      const paga = c.status === "paga" || c.status === "concluida";
      const pend = c.status === "pendente" || c.status === "aprovada";
      add(c.email, {
        nome: c.nome, telefone: c.telefone, nicho: c.nicho,
        total_solicitacoes: (cur?.total_solicitacoes || 0) + 1,
        total_pago: (cur?.total_pago || 0) + (paga ? Number(c.preco) : 0),
        total_pendente: (cur?.total_pendente || 0) + (pend ? Number(c.preco) : 0),
        ambientes: new Set([c.ambiente]) as any,
        ultima_atividade: !cur?.ultima_atividade || c.created_at > cur.ultima_atividade ? c.created_at : cur.ultima_atividade,
      });
    });
    reservas.forEach((r) => {
      const cur = map.get(r.email.toLowerCase());
      add(r.email, {
        nome: cur?.nome || r.nome,
        telefone: cur?.telefone || r.telefone,
        total_solicitacoes: (cur?.total_solicitacoes || 0) + 1,
        ambientes: new Set([r.ambiente]) as any,
        ultima_atividade: !cur?.ultima_atividade || r.created_at > cur.ultima_atividade ? r.created_at : cur.ultima_atividade,
      });
    });
    return Array.from(map.values()).sort((a, b) => (b.ultima_atividade > a.ultima_atividade ? 1 : -1));
  }, [contratos, reservas]);

  const q = search.trim().toLowerCase();
  const filtered = clientes.filter((c) =>
    !q || c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.nicho || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email ou nicho…" className="pl-9" />
        </div>
        <Badge variant="outline" className="font-heading font-bold">{filtered.length} clientes</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum cliente encontrado.</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const isWoba = c.email.toLowerCase().includes("woba") || c.nome.toLowerCase().includes("woba");
            const color = getClientColor({ name: c.nome, email: c.email, isWoba, overrides });
            const hasOverride = !!overrides[c.email.toLowerCase()];
            return (
              <Card key={c.email} className="p-4 border-l-4" style={{ borderLeftColor: color }}>
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <EventAvatar name={c.nome || c.email} isWoba={isWoba} color={color} size={44} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-heading font-black">{c.nome || c.email}</p>
                        {isWoba && <Badge className="bg-pink-600 text-white">Woba</Badge>}
                        {c.nicho && <Badge variant="secondary">{c.nicho}</Badge>}
                        {Array.from(c.ambientes).map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px]">{AMBIENTE_LABEL[a] || a}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.email} · {c.telefone}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Última atividade: {c.ultima_atividade ? new Date(c.ultima_atividade).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-heading font-bold">Solicitações</p>
                      <p className="font-heading font-black text-2xl">{c.total_solicitacoes}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-heading font-bold">Pago</p>
                      <p className="font-heading font-black text-lg text-green-600">{fmtBRL(c.total_pago)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-heading font-bold">Pendente</p>
                      <p className="font-heading font-black text-lg text-yellow-600">{fmtBRL(c.total_pendente)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <label
                        className={`relative inline-flex items-center justify-center w-9 h-9 rounded-md border cursor-pointer ${isWoba ? "opacity-50 pointer-events-none" : "hover:ring-2 hover:ring-primary/40"}`}
                        style={{ background: color }}
                        title={isWoba ? "Woba usa sempre rosa" : "Alterar cor do cliente"}
                      >
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(c.email, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={isWoba}
                        />
                      </label>
                      {hasOverride && !isWoba && (
                        <Button size="sm" variant="ghost" onClick={() => clearColor(c.email)} title="Restaurar cor padrão">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <a href={`https://wa.me/55${c.telefone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4" /></a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${c.email}`}><Mail className="w-4 h-4" /></a>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive h-8 w-8 p-0"
                        onClick={async () => {
                          if (!confirm("Excluir histórico de leads deste e-mail?")) return;
                          // @ts-ignore
                          const { error } = await supabase.from('contract_requests').delete().eq('email', c.email);
                          if (!error) window.location.reload();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
