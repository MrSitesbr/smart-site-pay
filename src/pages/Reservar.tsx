import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import Index from "./Index";
import ReservaDialog from "@/components/ReservaDialog";

export default function Reservar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(true);

  return (
    <>
      <Index />
      <ReservaDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) navigate("/", { replace: true });
        }}
        defaultAmbiente={params.get("ambiente") || undefined}
        defaultData={params.get("data") || undefined}
      />
    </>
  );
}
