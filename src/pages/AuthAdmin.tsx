import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png.asset.json";

export default function AuthAdmin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await checkAdminAndRedirect(data.session.user.id);
    });
  }, []);

  async function checkAdminAndRedirect(userId: string) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    
    if (isAdmin) {
      navigate("/admin");
    } else {
      // Se não for admin mas estiver logado, desloga e avisa
      await supabase.auth.signOut();
      toast({ 
        title: "Acesso negado", 
        description: "Esta área é restrita a administradores.", 
        variant: "destructive" 
      });
    }
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
      if (error) throw error;
      
      const userId = data.user!.id;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");

      if (isAdmin) {
        navigate("/admin");
      } else {
        await supabase.auth.signOut();
        toast({ 
          title: "Acesso negado", 
          description: "Usuário não possui privilégios de administrador.", 
          variant: "destructive" 
        });
      }
    } catch (e: any) {
      toast({ 
        title: "Falha no acesso", 
        description: e.message === "Invalid login credentials" ? "Credenciais inválidas." : e.message, 
        variant: "destructive" 
      });
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-8 border-orange-500/20 bg-slate-900 text-white shadow-2xl shadow-orange-500/10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-orange-500 mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Voltar ao site
        </Link>
        
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <img src={logoIcon.url} alt="Logo" className="h-12 w-auto object-contain" />
            <span className="text-2xl font-heading font-bold text-white">
              CoWorking <span className="text-orange-500">013</span>
            </span>
          </div>
          <div className="text-center">
            <h1 className="font-heading font-black text-2xl text-white">Painel Admin</h1>
            <p className="text-orange-500 text-xs font-bold uppercase tracking-widest">Acesso Restrito</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-8 border-l-2 border-orange-500 pl-4 py-1 italic">
          Área exclusiva para gestão do Coworking 013.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Email Administrativo</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="bg-slate-800 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500"
              placeholder="admin@coworking013.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-4 cursor-pointer hover:bg-slate-800 transition-colors">
            <Checkbox 
              checked={notRobot} 
              onCheckedChange={(v) => setNotRobot(!!v)}
              className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            <span className="text-sm font-medium text-slate-300">Verificação de Segurança</span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-orange-500 font-bold">Obrigatório</span>
          </label>

          <Button
            type="submit"
            disabled={loading || !notRobot}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-heading font-black text-lg shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACESSAR SISTEMA"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Powered by Coworking 013 Security</p>
        </div>
      </Card>
    </div>
  );
}
