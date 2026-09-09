import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

type Mode = "login" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState<null | "pendente" | "aprovado">(null);

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
    unidade_id: "",
    plano_id: "",
    sala_id: "",
  });
  const [unidades, setUnidades] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      await routeAfterLogin(data.session.user.id);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (mode !== "signup") return;
    supabase.from("unidades").select("id, nome").then(({ data }) => setUnidades(data || []));
    supabase.from("planos").select("id, nome, tipo").then(({ data }) => setPlanos(data || []));
  }, [mode]);

  useEffect(() => {
    if (!form.unidade_id) { setSalas([]); return; }
    supabase.from("salas").select("id, nome, tipo").eq("unidade_id", form.unidade_id)
      .then(({ data }) => setSalas(data || []));
  }, [form.unidade_id]);

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
      await routeAfterLogin(data.user!.id);
    } catch (e: any) {
      toast({
        title: "Falha no acesso",
        description: e.message === "Invalid login credentials" ? "Credenciais inválidas. Verifique seu e-mail e senha." : e.message,
        variant: "destructive",
      });
    } finally { setLoading(false); }
  }

  function validarEtapa1() {
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
    if (!form.unidade_id || !form.plano_id) {
      toast({ title: "Escolha a unidade e o plano", variant: "destructive" });
      return;
    }
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
          unidade_id: form.unidade_id,
          plano_id: form.plano_id,
          sala_id: form.sala_id || null,
        },
      });
      const err = (data as any)?.error || error?.message;
      if (err) throw new Error(err);
      setEnviado((data as any).status === "aprovado" ? "aprovado" : "pendente");
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

        {enviado ? (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto" />
            <h2 className="font-heading font-bold text-lg">Cadastro enviado!</h2>
            <p className="text-sm text-slate-400">
              {enviado === "aprovado"
                ? "Seu acesso já está liberado. Entre com seu e-mail e senha."
                : "Recebemos seus dados. Assim que a equipe do Coworking 013 liberar seu cadastro, você poderá entrar com seu e-mail e senha."}
            </p>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-heading font-black"
              onClick={() => { setEnviado(null); setMode("login"); setStep(1); setEmail(form.email); }}
            >
              IR PARA O ACESSO
            </Button>
          </div>
        ) : mode === "login" ? (
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
                onClick={() => { setMode("signup"); setStep(1); }}
                className="w-full h-12 rounded-xl border-orange-500/40 bg-transparent text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 font-heading font-bold"
              >
                CRIAR CONTA
              </Button>

              <p className="text-xs text-center text-slate-500 pt-2">
                Novos cadastros passam por liberação da equipe do Coworking 013.
              </p>
            </form>
          </>
        ) : (
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (validarEtapa1()) setStep(2); } : cadastrar} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              {[1, 2].map((n) => (
                <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-orange-500" : "bg-slate-700"}`} />
              ))}
            </div>
            <p className="text-sm text-slate-400 border-l-2 border-orange-500 pl-4 py-1 italic">
              {step === 1 ? "Etapa 1 de 2 — seus dados cadastrais" : "Etapa 2 de 2 — plano, unidade e sala"}
            </p>

            {step === 1 ? (
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
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Unidade *</Label>
                  <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v, sala_id: "" })}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Escolha a unidade" /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Plano *</Label>
                  <Select value={form.plano_id} onValueChange={(v) => setForm({ ...form, plano_id: v })}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Escolha o plano" /></SelectTrigger>
                    <SelectContent>
                      {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Sala que pretende usar</Label>
                  <Select value={form.sala_id} onValueChange={(v) => setForm({ ...form, sala_id: v })} disabled={!form.unidade_id}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder={form.unidade_id ? "Escolha a sala" : "Escolha a unidade primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {salas.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => (step === 1 ? setMode("login") : setStep(1))}
                className="h-12 rounded-xl border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-heading font-black"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 1 ? "CONTINUAR" : "ENVIAR CADASTRO"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
