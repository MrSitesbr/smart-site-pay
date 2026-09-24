import { render } from "@testing-library/react";
import { it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => { const q:any = new Proxy(function(){}, { get:(_t,p)=> p==="then" ? (r:any)=>r({data:[],error:null}) : ()=>q, apply:()=>q }); return { supabase: { from:()=>q, rpc:()=>q, auth:{ getSession:async()=>({data:{session:null}}) }, functions:{invoke:async()=>({data:null})}, channel:()=>({on:()=>({subscribe:()=>({})}),subscribe:()=>({})}), removeChannel:()=>{} } }; });
import AdminCalendar from "@/components/admin/AdminCalendar";
it("renders", async () => {
  const r = { id:"1", nome:"A", email:"a", telefone:"1", ambiente:"sala_reuniao", tipo:"hora", data:"2026-09-24", hora_inicio:"10:00:00", hora_fim:"11:00:00", status:"confirmada", observacoes:null, created_at:"" };
  for (const f of [undefined,"reservas","visitas"] as any[]) render(<AdminCalendar reservas={[r] as any} contratos={[]} onDeleteReserva={()=>{}} onDeleteContrato={()=>{}} onCreated={()=>{}} initialFilter={f} />);
  await new Promise(r=>setTimeout(r,500));
});
