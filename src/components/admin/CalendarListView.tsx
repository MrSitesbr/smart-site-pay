import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import EventAvatar from "./EventAvatar";
import { getClientColor, readableTextOn, WOBA_COLOR } from "@/lib/clientColors";

interface CalendarListProps {
  events: any[];
  onDeleteReserva?: (r: any) => void;
  onDeleteContrato?: (c: any) => void;
  onViewDetails: (kind: "reserva" | "contrato", obj: any) => void;
}

export function CalendarListView({ events, onDeleteReserva, onDeleteContrato, onViewDetails }: CalendarListProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = a.kind === "google" 
        ? (a.obj.start?.dateTime || a.obj.start?.date || "") 
        : (a.kind === "reserva" ? a.obj.data : (a.obj.data_inicio || ""));
      const dateB = b.kind === "google" 
        ? (b.obj.start?.dateTime || b.obj.start?.date || "") 
        : (b.kind === "reserva" ? b.obj.data : (b.obj.data_inicio || ""));
      return dateB.localeCompare(dateA);
    });
  }, [events]);

  return (
    <div className="p-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo/Ambiente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum evento encontrado com os filtros atuais.
              </TableCell>
            </TableRow>
          ) : (
            sortedEvents.map((e, idx) => {
              const isGoogle = e.kind === "google";
              const isWoba = isGoogle 
                ? `${e.obj.summary || ""} ${e.obj.description || ""}`.toLowerCase().includes("woba")
                : e.obj.origem === "woba";
              
              const dateStr = isGoogle 
                ? new Date(e.obj.start?.dateTime || e.obj.start?.date).toLocaleDateString("pt-BR")
                : new Date((e.kind === "reserva" ? e.obj.data : e.obj.data_inicio) + "T00:00").toLocaleDateString("pt-BR");

              const name = isGoogle ? (e.obj.summary || "Google Event") : e.obj.nome;
              const type = isGoogle ? "Google Agenda" : (e.kind === "reserva" ? "Reserva Avulsa" : "Locação/Contrato");
              const status = isGoogle ? "Confirmado" : e.obj.status;

              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{dateStr}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EventAvatar name={name} isWoba={isWoba} size={24} />
                      <span className="truncate max-w-[200px]">{name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{type}</span>
                      {!isGoogle && <span className="text-xs text-muted-foreground">{e.obj.ambiente}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isGoogle ? "outline" : "default"} className={!isGoogle ? "capitalize" : ""}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!isGoogle && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onViewDetails(e.kind, e.obj)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" variant="ghost" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => e.kind === "reserva" ? onDeleteReserva?.(e.obj) : onDeleteContrato?.(e.obj)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
