import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import estacaoImg from "@/assets/coworking-area.jpg";
import salaPrivativaImg from "@/assets/sala-privativa.jpg";
import salaReuniaoImg from "@/assets/sala-reuniao-1.jpg";

const AMBIENTE_LABEL: Record<string, string> = {
  estacao: "Espaço de Trabalho",
  sala_privativa: "Sala Privativa",
  sala_reuniao: "Sala de Reunião",
};
const AMBIENTE_IMG: Record<string, string> = {
  estacao: estacaoImg,
  sala_privativa: salaPrivativaImg,
  sala_reuniao: salaReuniaoImg,
};
const PLANO_LABEL: Record<string, string> = {
  hora: "Por Hora",
  diaria: "Diária Avulsa",
  pacote: "Pacote 10 Diárias",
  mensal: "Plano Mensal",
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default function Contratar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ambiente = params.get("ambiente") || "estacao";
  const plano = params.get("plano") || "diaria";
  const preco = Number(params.get("preco") || 0);

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [nicho, setNicho] = useState("");

  const [dias, setDias] = useState<Date[]>([]);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user || null);
      if (data.session?.user) {
        setEmail(data.session.user.email || "");
        setNome((data.session.user.user_metadata as any)?.nome || "");
        setTelefone((data.session.user.user_metadata as any)?.telefone || "");
        setNicho((data.session.user.user_metadata as any)?.nicho || "");
      }
      setLoading(false);
    });
  }, []);

  const needDates = plano === "pacote";
  const needStart = plano === "mensal";
  const requiredDays = plano === "pacote" ? 10 : 0;

  const canSubmit = useMemo(() => {
    if (!nome || !telefone || !email) return false;
    if (!sessionUser) {
      // signup path
      if (!password || password.length < 6) return false;
      if (!nicho) return false;
      if (!notRobot) return false;
    }
    if (needDates && dias.length !== requiredDays) return false;
    if (needStart && !dataInicio) return false;
    return true;
  }, [nome, telefone, email, password, nicho, notRobot, sessionUser, needDates, needStart, dias, dataInicio, requiredDays]);

  async function doLogin() {
    if (!notRobot) { toast({ title: "Confirme que você não é um robô", variant: "destructive" }); return; }
    if (!email || !password) { toast({ title: "Informe email e senha", variant: "destructive" }); return; }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSessionUser(data.user);
      setNome((data.user?.user_metadata as any)?.nome || "");
      setTelefone((data.user?.user_metadata as any)?.telefone || "");
      setNicho((data.user?.user_metadata as any)?.nicho || "");
      toast({ title: "Login realizado" });
    } catch (e: any) {
      toast({ title: "Falha no login", description: e.message, variant: "destructive" });
    } finally { setLoggingIn(false); }
  }

  async function doSignupAndSubmit() {
    if (!notRobot) { toast({ title: "Confirme que você não é um robô", variant: "destructive" }); return null; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/painel`,
          data: { nome, telefone, nicho },
        },
      });
      if (error) throw error;
      if (!data.session) {
        const { data: s, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) throw e2;
        return s.user?.id || null;
      }
      return data.user?.id || null;
    } catch (e: any) {
      toast({ title: "Erro no cadastro", description: e.message, variant: "destructive" });
      return null;
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      let uid: string | null = sessionUser?.id || null;
      if (!uid) {
        uid = await doSignupAndSubmit();
        if (!uid) return;
      }

      const payload: any = {
        user_id: uid,
        nome, email, telefone,
        nicho: nicho || null,
        ambiente, plano_tipo: plano, preco,
        observacoes: observacoes || null,
        dias_selecionados: needDates ? dias.map((d) => d.toISOString().slice(0, 10)) : [],
        data_inicio: needStart && dataInicio ? dataInicio.toISOString().slice(0, 10) : null,
      };
      const { error } = await supabase.from("contract_requests").insert(payload);
      if (error) throw error;

      toast({ title: "Solicitação enviada!", description: "Acompanhe o status no seu painel." });
      navigate("/painel");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-3xl">
        <Link to="/#planos" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar aos planos
        </Link>

        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl ring-1 ring-border">
          <img
            src={AMBIENTE_IMG[ambiente]}
            alt={`Foto do ambiente ${AMBIENTE_LABEL[ambiente]} — Coworking 013`}
            className="w-full h-56 md:h-72 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark/95 via-brand-blue-dark/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
            <span className="text-xs font-heading font-bold tracking-widest text-white/70 uppercase mb-1">Contratar</span>
            <h1 className="font-heading font-black text-3xl md:text-4xl leading-tight">
              {AMBIENTE_LABEL[ambiente]}
            </h1>
            <p className="mt-1 text-white/90">
              <span className="text-secondary font-heading font-bold">{PLANO_LABEL[plano]}</span>
              <span className="mx-2 opacity-60">·</span>
              <span className="font-heading font-black text-xl">{fmtBRL(preco)}</span>
            </p>
          </div>
        </div>

        <Card className="p-6 md:p-8 space-y-6">
          {!sessionUser && (
            <div className="rounded-xl bg-muted/40 p-4 border border-border">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button" size="sm"
                  variant={mode === "signup" ? "default" : "outline"}
                  onClick={() => setMode("signup")}
                  className="rounded-full font-heading font-bold"
                >Criar conta</Button>
                <Button
                  type="button" size="sm"
                  variant={mode === "login" ? "default" : "outline"}
                  onClick={() => setMode("login")}
                  className="rounded-full font-heading font-bold"
                >Já tenho conta</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === "signup"
                  ? "Vamos criar seu acesso rápido para você acompanhar suas contratações."
                  : "Entre com sua conta e a solicitação continua na sequência."}
              </p>
            </div>
          )}

          {/* LOGIN MODE (compact) */}
          {!sessionUser && mode === "login" && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loggingIn} autoComplete="email" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loggingIn} autoComplete="current-password" />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 cursor-pointer">
                <Checkbox checked={notRobot} onCheckedChange={(v) => setNotRobot(!!v)} />
                <span className="text-sm font-medium">Não sou um robô</span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Verificação</span>
              </label>
              <Button
                onClick={doLogin}
                disabled={loggingIn || !notRobot}
                className="w-full rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {loggingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Entrar
              </Button>
            </div>
          )}

          {/* SIGNUP MODE or already logged in: full form */}
          {(sessionUser || mode === "signup") && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(13) 9..." disabled={submitting} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting || !!sessionUser} />
                </div>
                {!sessionUser && (
                  <div>
                    <Label>Senha <span className="text-xs text-muted-foreground">(mín. 6)</span></Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label>Nicho de atuação {!sessionUser && <span className="text-secondary">*</span>}</Label>
                  <Input
                    value={nicho}
                    onChange={(e) => setNicho(e.target.value)}
                    placeholder="Ex: advocacia, marketing digital, contabilidade, startup..."
                    disabled={submitting}
                  />
                </div>
              </div>

              {!sessionUser && (
                <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 cursor-pointer">
                  <Checkbox checked={notRobot} onCheckedChange={(v) => setNotRobot(!!v)} />
                  <span className="text-sm font-medium">Não sou um robô</span>
                  <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">Verificação</span>
                </label>
              )}
            </>
          )}

          {/* Reservation-specific fields only after auth chosen (signup) or logged in */}
          {(sessionUser || mode === "signup") && (
            <>
              {needDates && (
                <div>
                  <Label className="mb-2 block">
                    Selecione as <span className="text-secondary">{requiredDays} datas</span> do seu pacote
                    <span className="text-xs text-muted-foreground ml-2">({dias.length}/{requiredDays} escolhidas)</span>
                  </Label>
                  <div className="rounded-xl border border-border bg-card p-3 inline-block">
                    <Calendar
                      mode="multiple"
                      selected={dias}
                      onSelect={(d) => setDias(d || [])}
                      disabled={(d) => d < new Date(new Date().setHours(0,0,0,0)) || (dias.length >= requiredDays && !dias.some((x) => x.toDateString() === d.toDateString()))}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              )}

              {needStart && (
                <div>
                  <Label className="mb-2 block">Data de início do plano mensal</Label>
                  <div className="rounded-xl border border-border bg-card p-3 inline-block">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Observações (opcional)</Label>
                <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={submitting} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary" />
                  Após enviar, o admin analisa e envia a fatura no seu painel.
                </div>
                <Button
                  onClick={submit}
                  disabled={!canSubmit || submitting || (!sessionUser && !notRobot)}
                  className="rounded-full font-heading font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Enviar solicitação
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
