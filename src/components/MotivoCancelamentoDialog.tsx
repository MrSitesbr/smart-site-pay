import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const MOTIVO_MIN = 2;
export const MOTIVO_MAX = 180;

type Pedido = { descricao?: string; inicial?: string; resolver: (motivo: string | null) => void };
let abrir: ((pedido: Pedido) => void) | null = null;

/**
 * Pede o motivo do cancelamento (2 a 180 caracteres). Devolve o texto ou null se a pessoa desistir.
 * Usado em todos os pontos que cancelam reservas, no admin e no painel.
 */
export function pedirMotivoCancelamento(descricao?: string, inicial?: string): Promise<string | null> {
  return new Promise((resolver) => {
    if (!abrir) { resolver(null); return; }
    abrir({ descricao, inicial, resolver });
  });
}

/** Fica montado uma vez no App e atende todos os pedidos de motivo. */
export default function MotivoCancelamentoHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    abrir = (p) => { setMotivo(p.inicial || ""); setPedido(p); };
    return () => { abrir = null; };
  }, []);

  const texto = motivo.trim();
  const valido = texto.length >= MOTIVO_MIN && texto.length <= MOTIVO_MAX;

  function fechar(resultado: string | null) {
    pedido?.resolver(resultado);
    setPedido(null);
  }

  return (
    <Dialog open={!!pedido} onOpenChange={(o) => !o && fechar(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Motivo do cancelamento</DialogTitle>
          <DialogDescription>{pedido?.descricao || "O motivo fica registrado no histórico do cliente."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="motivo-cancelamento">Motivo *</Label>
          <Textarea id="motivo-cancelamento" rows={3} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: Cliente pediu para remarcar por viagem" autoFocus />
          <p className={`text-xs ${valido || !texto ? "text-muted-foreground" : "text-destructive"}`}>
            {texto.length}/{MOTIVO_MAX} · mínimo de {MOTIVO_MIN} caracteres
          </p>
          <p className="text-xs text-muted-foreground">
            Pedido do cliente com 24h ou mais de antecedência devolve as horas ao banco de horas; com menos de 24h as horas ficam consumidas.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(null)}>Voltar</Button>
          <Button variant="destructive" disabled={!valido} onClick={() => fechar(texto)}>Confirmar cancelamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
