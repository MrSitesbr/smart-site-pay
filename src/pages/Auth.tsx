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

type Mode = "login" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cadastro
  const [form, setForm] = useState({
    razao_social: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    cnpj: "",
    responsavel_telefone: "",
    email: "",
    senha: "",
    confirmar: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await routeAfterLogin(data.session.user.id);
    });
    // eslint-disable-next-line
  }, []);

  async function routeAfterLogin(userId: string) {
    const { data: cliente } = await (supabase.from("clientes_corp") as any)
      .select("status_acesso")
      .eq("user_id", userId)
      .maybeSingle();

    if (cliente && cliente.status_acesso === "pendente") {
      await supabase.auth.signOut();
      toast({
        title: "Cadastro em análise",
        description: "Seu acesso ainda não foi liberado pela equipe do Coworking 013.",
        variant: "destructive",
      });
      return;
    }
    if (cliente && cliente.status_acesso === "recusado") {
      await supabase.auth.signOut();
      toast({ title: "Acesso não liberado", description: "Fale com a equipe do Coworking 013.", variant: "destructive" });
      return;
    }

    navigate(redirect || "/painel");
  }

  async function recuperarSenha() {
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo) {
      toast({ title: "Informe seu e-mail", description: "Digite o e-mail cadastrado para receber o link.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "E-mail enviado",
      description: "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!notRobot) {
      toast({ title: "Confirme que você não é um robô", variant: "destructive" });
      return;
    }
    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password });
      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível identificar o usuário.");
      await routeAfterLogin(data.user.id);
    } catch (e: any) {
      if (e.message === "Invalid login credentials") {
        const { data: st } = await supabase.functions.invoke("client-access-status", {
          body: { email: emailLimpo },
        });
        const status = (st as any)?.status;
        const temLogin = (st as any)?.tem_login;

        if (status === "pendente") {
          toast({
            title: "Cadastro aguardando autorização",
            description: "Seu acesso ainda não foi liberado pela equipe. Fale conosco no WhatsApp (13) 98805-0358.",
            variant: "destructive",
          });
        } else if (status === "recusado") {
          toast({
            title: "Acesso não liberado",
            description: "Fale com a equipe do Coworking 013 pelo WhatsApp (13) 98805-0358.",
            variant: "destructive",
          });
        } else if (status === "aprovado" && !temLogin) {
          toast({
            title: "Acesso ainda não criado",
            description: "Seu cadastro está liberado, mas falta a senha ser criada pela equipe. Fale no WhatsApp (13) 98805-0358.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Credenciais inválidas",
            description: "Verifique seu e-mail e senha. Se precisar, peça uma nova senha no WhatsApp (13) 98805-0358.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Falha no acesso", description: e.message, variant: "destructive" });
      }
    } finally { setLoading(false); }
  }

  function validarCadastro() {
    const obrig: [string, string][] = [
      ["razao_social", "Nome / Razão social"],
      ["responsavel_nome", "Nome do responsável"],
      ["responsavel_cpf", "CPF do responsável"],
      ["responsavel_telefone", "WhatsApp"],
      ["email", "E-mail"],
      ["senha", "Senha"],
    ];
    for (const [key, label] of obrig) {
      if (!(form as any)[key]?.trim()) {
        toast({ title: `Preencha: ${label}`, variant: "destructive" });
        return false;
      }
    }
    if (form.senha.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return false;
    }
    if (form.senha !== form.confirmar) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return false;
    }
    return true;
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!validarCadastro()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-signup", {
        body: {
          email: form.email.trim(),
          password: form.senha,
          razao_social: form.razao_social,
          responsavel_nome: form.responsavel_nome,
          responsavel_telefone: form.responsavel_telefone,
          responsavel_cpf: form.responsavel_cpf,
          cnpj: form.cnpj,
        },
      });
      const err = (data as any)?.error || error?.message;
      if (err) throw new Error(err);
      const emailLimpo = form.email.trim().toLowerCase();
      const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: form.senha,
      });
      if (loginError) throw loginError;
      if (!login.user) throw new Error("Não foi possível iniciar o acesso.");
      toast({ title: "Cadastro concluído", description: "Seu painel já está disponível." });
      navigate(redirect || "/painel", { replace: true });
    } catch (e: any) {
      toast({ title: "Não foi possível concluir o cadastro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  const inputCls = "bg-slate-800 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-8 border-orange-500/20 bg-slate-900 text-white shadow-2xl shadow-orange-500/10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-orange-500 mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Voltar ao site
        </Link>

        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Logo" className="h-20 w-auto object-contain" />
            <div className="flex flex-col leading-[0.8] text-left">
              <span className="font-heading font-bold text-[18px] tracking-tighter text-white">CoWorking</span>
              <span className="font-heading font-bold text-[42px] tracking-tighter leading-[0.8] text-orange-500">013</span>
            </div>
          </div>
          <h1 className="font-heading font-bold text-xl text-center mt-2 text-white">Área do Cliente</h1>
        </div>

        {mode === "login" ? (
          <>
            <p className="text-sm text-slate-400 mb-8 border-l-2 border-orange-500 pl-4 py-1 italic">
              Acesse suas reservas e contratações.
            </p>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputCls} />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
                <span className="text-sm font-medium text-slate-300">Não sou um robô</span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-orange-500 font-bold">Obrigatório</span>
              </label>

              <Button
                type="submit"
                disabled={loading || !notRobot}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-heading font-black text-lg shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENTRAR"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("signup")}
                className="w-full h-12 rounded-xl border-orange-500/40 bg-transparent text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 font-heading font-bold"
              >
                CRIAR CONTA
              </Button>

              <button
                type="button"
                onClick={recuperarSenha}
                className="w-full text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4"
              >
                Esqueci minha senha
              </button>

              <p className="text-xs text-center text-slate-500 pt-2">
                Novos cadastros acessam o painel automaticamente.
              </p>
            </form>
          </>
        ) : (
          <form onSubmit={cadastrar} className="space-y-5">
            <p className="text-sm text-slate-400 border-l-2 border-orange-500 pl-4 py-1 italic">
              Preencha seus dados para criar a conta.
            </p>

            <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome / Razão social *</Label>
                  <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Responsável *</Label>
                    <Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">CPF *</Label>
                    <Input value={form.responsavel_cpf} onChange={(e) => setForm({ ...form, responsavel_cpf: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">WhatsApp *</Label>
                    <Input value={form.responsavel_telefone} onChange={(e) => setForm({ ...form, responsavel_telefone: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Senha *</Label>
                    <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Confirmar *</Label>
                    <Input type="password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug -mt-2">
                  A senha deve ter no mínimo 6 caracteres. Recomendamos incluir letras maiúsculas, números e caracteres especiais (ex.: @, #, $, !) para maior segurança.
                </p>
            </>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("login")}
                className="h-12 rounded-xl border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-heading font-black"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CRIAR CONTA"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
