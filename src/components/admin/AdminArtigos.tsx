import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreVertical, Edit2, Eye, Trash2 } from "lucide-react";

export default function AdminArtigos() {
  const [artigos] = useState([
    { id: 1, title: "Como o coworking pode acelerar seu networking", author: "Walter Lima", date: "15/05/2026", status: "Publicado" },
    { id: 2, title: "5 vantagens de ter um endereço fiscal na Praia Grande", author: "Equipe Kennedy", date: "10/05/2026", status: "Publicado" },
    { id: 3, title: "O futuro do trabalho híbrido no litoral", author: "Walter Lima", date: "02/05/2026", status: "Rascunho" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Blog & Artigos</h2>
          <p className="text-muted-foreground">Gerencie o conteúdo do blog para atrair mais clientes.</p>
        </div>
        <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Artigo</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full bg-white border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange" placeholder="Pesquisar artigos..." />
        </div>
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filtros</Button>
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Autor</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artigos.map(a => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-brand-blue-dark">{a.title}</span>
                </td>
                <td className="px-6 py-4 text-sm">{a.author}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{a.date}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${a.status === 'Publicado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
