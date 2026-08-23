import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await routeAfterLogin(data.session.user.id);
    });
    // eslint-disable-next-line
  }, []);

  async function routeAfterLogin(userId: string) {
    if (redirect) { navigate(redirect); return; }
    
    // Agora o Auth comum é apenas para usuários/clientes.
    // Se um admin logar por aqui, ele vai para o painel de usuário também, 
    // ou podemos forçar o redirecionamento se preferir, mas o pedido foi separar os painéis.
    navigate("/painel");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!notRobot) {
      toast({ title: "Confirme que você não é um robô", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Auth error:", error);
        throw error;
      }
      await routeAfterLogin(data.user!.id);
    } catch (e: any) {
      console.error("Submit catch:", e);
      toast({ title: "Falha no acesso", description: e.message === "Invalid login credentials" ? "Credenciais inválidas. Verifique seu e-mail e senha." : e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue-dark p-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Voltar ao site
        </Link>
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
            <div className="flex flex-col leading-none text-left">
              <span className="font-heading font-bold text-[16px] tracking-tighter text-foreground">
                CoWorking
              </span>
              <span className="font-heading font-bold text-[36px] tracking-tighter leading-[0.8] text-primary">
                013
              </span>
            </div>
          </div>
          <h1 className="font-heading font-bold text-xl text-center mt-2">Área do Cliente</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Acesse suas reservas e contratações.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <Label>Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 cursor-pointer">
            <Checkbox checked={notRobot} onCheckedChange={(v) => setNotRobot(!!v)} />
            <span className="text-sm font-medium">Não sou um robô</span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Verificação</span>
          </label>

          <Button
            type="submit"
            disabled={loading || !notRobot}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full font-heading font-bold"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Entrar
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Ainda não tem conta? Faça sua primeira reserva no site para criar seu acesso.
          </p>
        </form>
      </Card>
    </div>
  );
}
