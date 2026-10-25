import { AlertTriangle, Bell, Info, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AvisoPlano } from "@/lib/planosApi";

const ESTILO: Record<AvisoPlano["nivel"], { box: string; Icon: typeof Info }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
  alerta: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  erro: { box: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
};

function Aviso({ aviso }: { aviso: AvisoPlano }) {
  const { box, Icon } = ESTILO[aviso.nivel] || ESTILO.info;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{aviso.mensagem}</span>
    </div>
  );
}

/** Avisos do plano no topo do painel. */
export function PlanoAvisosBanner({ avisos }: { avisos: AvisoPlano[] }) {
  if (!avisos.length) return null;
  return <div className="mb-4 grid gap-2">{avisos.map((aviso) => <Aviso key={aviso.tipo} aviso={aviso} />)}</div>;
}

/** Sininho do cabeçalho com os mesmos avisos. */
export function PlanoAvisosSino({ avisos }: { avisos: AvisoPlano[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="relative rounded-full p-2 text-white hover:bg-white/10" aria-label={`Avisos do plano (${avisos.length})`}>
          <Bell className="h-5 w-5" />
          {avisos.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
              {avisos.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2">
        <p className="text-sm font-bold">Avisos do plano</p>
        {avisos.length ? avisos.map((aviso) => <Aviso key={aviso.tipo} aviso={aviso} />) : <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>}
      </PopoverContent>
    </Popover>
  );
}
