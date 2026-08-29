import { useMemo } from "react";
import { getClientColor, readableTextOn, WOBA_COLOR } from "@/lib/clientColors";

interface CalendarGanttProps {
  events: any[];
  month: Date;
}

export function CalendarGanttView({ events, month }: CalendarGanttProps) {
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rows = useMemo(() => {
    // Group events by client/resource to create rows
    const groups: Record<string, any[]> = {};
    events.forEach(e => {
      const name = e.kind === "google" ? (e.obj.summary || "Google") : e.obj.nome;
      if (!groups[name]) groups[name] = [];
      groups[name].push(e);
    });
    return Object.entries(groups);
  }, [events]);

  return (
    <div className="p-4 overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[200px_1fr] border-b pb-2">
          <div className="font-bold text-sm">Cliente</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
            {days.map(d => (
              <div key={d} className="text-[10px] text-center border-l border-muted-foreground/20">{d}</div>
            ))}
          </div>
        </div>
        <div className="space-y-1 mt-2">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Sem eventos para exibir no Gantt.</div>
          ) : (
            rows.map(([name, groupEvents], idx) => (
              <div key={idx} className="grid grid-cols-[200px_1fr] group hover:bg-muted/50 py-1 items-center">
                <div className="text-xs truncate pr-2 font-medium">{name}</div>
                <div className="grid h-6 relative" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
                  {/* Grid lines */}
                  {days.map(d => (
                    <div key={d} className="border-l border-muted-foreground/10 h-full" />
                  ))}
                  
                  {/* Event bars */}
                  {groupEvents.map((e, eIdx) => {
                    const dateStr = e.kind === "google" 
                      ? (e.obj.start?.dateTime || e.obj.start?.date || "") 
                      : (e.kind === "reserva" ? e.obj.data : (e.kind === "visita" ? e.obj.data_hora_prevista : (e.obj.data_inicio || "")));
                    
                    const eventDate = new Date(dateStr + (dateStr.length === 10 ? "T00:00" : ""));
                    if (eventDate.getMonth() !== month.getMonth() || eventDate.getFullYear() !== month.getFullYear()) return null;
                    
                    const day = eventDate.getDate();
                    const isWoba = e.kind === "google" 
                      ? `${e.obj.summary || ""} ${e.obj.description || ""}`.toLowerCase().includes("woba")
                      : e.obj.origem === "woba";
                    
                    const bg = isWoba ? WOBA_COLOR : getClientColor({ name: name });
                    
                    return (
                      <div 
                        key={eIdx}
                        className="absolute h-4 top-1 rounded-sm shadow-sm"
                        style={{
                          left: `${((day - 1) / daysInMonth) * 100}%`,
                          width: `${(1 / daysInMonth) * 100}%`,
                          backgroundColor: bg,
                          zIndex: 10
                        }}
                        title={`${name} - ${dateStr}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
