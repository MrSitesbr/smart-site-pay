import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReservaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmbiente?: string;
  defaultData?: string;
  onSuccess?: () => void;
}

const REDIRECT = "/agendamento";

/**
 * A consulta de reservas exige cliente logado: quem ainda não tem conta entra
 * no cadastro pelo mesmo diálogo, sem criar mais pré-cadastro de lead.
 */
export default function ReservaDialog({ open, onOpenChange, onSuccess }: ReservaDialogProps) {
  const navigate = useNavigate();
  const destino = `/auth?redirect=${encodeURIComponent(REDIRECT)}`;

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo || !data.session) return;
      onOpenChange(false);
      if (onSuccess) onSuccess();
      else navigate(REDIRECT, { replace: true });
    });
    return () => { ativo = false; };
  }, [open, navigate, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black md:text-3xl">Consultar reserva</DialogTitle>
          <DialogDescription>
            Entre na sua conta para consultar a agenda e enviar solicitações de reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Button onClick={() => navigate(destino)} className="w-full font-heading font-bold">
            <LogIn className="mr-2 h-4 w-4" />
            Já sou cliente
          </Button>
          <Button variant="outline" onClick={() => navigate(destino)} className="w-full font-heading font-bold">
            <UserPlus className="mr-2 h-4 w-4" />
            Criar cadastro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
