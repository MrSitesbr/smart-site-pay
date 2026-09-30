import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DynamicPage from "./DynamicPage";
import ReservaDialog from "@/components/ReservaDialog";
import { supabase } from "@/integrations/supabase/client";

const REDIRECT = "/reservar";

/**
 * A consulta de reserva exige cliente logado. Sem sessao o visitante vai para
 * o login/cadastro e volta para ca depois de entrar.
 */
export default function Reservar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      const logado = Boolean(data.session);
      setAutenticado(logado);
      setVerificando(false);
      if (!logado) {
        navigate(`/auth?redirect=${encodeURIComponent(REDIRECT)}`, { replace: true });
        return;
      }
      setOpen(true);
    });
    return () => { ativo = false; };
  }, [navigate]);

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Verificando sua sessao...</p>
      </div>
    );
  }

  return (
    <>
      <DynamicPage />
      <ReservaDialog
        open={open && autenticado}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) navigate("/agendamento", { replace: true });
        }}
        defaultAmbiente={params.get("ambiente") || undefined}
        defaultData={params.get("data") || undefined}
      />
    </>
  );
}
