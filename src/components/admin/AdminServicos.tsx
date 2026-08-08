import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Coffee, Wifi, Car, Printer, Edit2, Trash2 } from "lucide-react";

export default function AdminServicos() {
  const [servicos] = useState([
    { id: 1, name: "Endereço Fiscal", price: "R$ 150/mês", icon: "Building2" },
    { id: 2, name: "Impressões P&B", price: "R$ 0,50/folha", icon: "Printer" },
    { id: 3, name: "Café Expresso", price: "Cortesia", icon: "Coffee" },
    { id: 4, name: "Estacionamento", price: "R$ 20/dia", icon: "Car" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-black text-brand-blue-dark">Catálogo de Serviços</h2>
          <p className="text-muted-foreground">Serviços adicionais e cortesias oferecidas no coworking.</p>
        </div>
        <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Serviço</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {servicos.map(s => (
          <Card key={s.id} className="p-6 border-none shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-4">
               {s.name.includes("Café") ? <Coffee className="w-8 h-8" /> : 
                s.name.includes("Impressões") ? <Printer className="w-8 h-8" /> :
                s.name.includes("Estacionamento") ? <Car className="w-8 h-8" /> :
                <Wifi className="w-8 h-8" />}
            </div>
            <h3 className="font-heading font-bold text-brand-blue-dark">{s.name}</h3>
            <p className="text-sm font-bold text-brand-orange mt-1">{s.price}</p>
            <div className="flex gap-2 mt-6 w-full">
              <Button variant="outline" size="sm" className="flex-1"><Edit2 className="w-3.5 h-3.5 mr-2" /> Editar</Button>
              <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
