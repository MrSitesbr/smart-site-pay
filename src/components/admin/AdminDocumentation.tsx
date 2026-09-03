import { useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Building2, CalendarDays, CheckCircle2,
  ChevronDown, CircleDollarSign, ClipboardCheck, Globe2, LayoutDashboard,
  LifeBuoy, LockKeyhole, Megaphone, MousePointerClick, Settings2, ShieldCheck,
  Users, WalletCards,
} from "lucide-react";

type Guide = {
  icon: typeof LayoutDashboard;
  title: string;
  eyebrow: string;
  description: string;
  steps: string[];
  accent: string;
};

const internalGuides: Guide[] = [
  {
    icon: LayoutDashboard,
    title: "Visão geral e pendências",
    eyebrow: "Comece aqui",
    description: "Acompanhe o estado da operação antes de abrir cada módulo.",
    steps: ["Leia os indicadores do Dashboard.", "Abra Pendências para registrar ou assumir uma tarefa.", "Use Calendário como fonte diária de reservas, visitas e eventos."],
    accent: "bg-brand-blue-dark",
  },
  {
    icon: CalendarDays,
    title: "Reservas, visitas e check-in",
    eyebrow: "Operação",
    description: "Controle a agenda sem perder histórico ou capacidade da sala.",
    steps: ["Filtre por unidade, ambiente, status ou cliente.", "Abra uma reserva para conferir valor, vagas e recorrência.", "Registre o check-in da estação quando o cliente chegar."],
    accent: "bg-sky-700",
  },
  {
    icon: Building2,
    title: "Unidades, salas e capacidade",
    eyebrow: "Catálogo",
    description: "Mantenha a estrutura física que alimenta reservas e o site.",
    steps: ["Cadastre a unidade e depois suas salas.", "Informe tipo, capacidade, fotos e planos permitidos.", "Use capacidade 14 para a Estação Compartilhada."],
    accent: "bg-emerald-700",
  },
  {
    icon: WalletCards,
    title: "Financeiro, ERP e Woba",
    eyebrow: "Controle",
    description: "Compare receita contratada, reservas, ocupação e repasses.",
    steps: ["Confira valor cobrado e valor original quando houver desconto.", "Use ERP para acompanhar ocupação por período.", "Feche repasses Woba separadamente do caixa interno."],
    accent: "bg-amber-700",
  },
  {
    icon: Users,
    title: "CRM e clientes",
    eyebrow: "Relacionamento",
    description: "Centralize empresas, responsáveis, colaboradores e visitantes.",
    steps: ["Revise dados do cliente antes de criar uma reserva.", "Associe visitantes à empresa e à sala.", "Arquive clientes ou planos sem apagar o histórico."],
    accent: "bg-rose-700",
  },
  {
    icon: Megaphone,
    title: "Site, conteúdo e SEO",
    eyebrow: "Presença digital",
    description: "Tudo que o visitante vê é administrado nesta área.",
    steps: ["Atualize páginas, menus, artigos e serviços.", "Revise Informações Globais para header e footer.", "Use SEO & Scripts para metadados e integrações."],
    accent: "bg-violet-700",
  },
];

const externalSteps = [
  { icon: Globe2, title: "Visitante conhece", text: "O site apresenta unidades, salas, planos, serviços, blog e formas de contato." },
  { icon: MousePointerClick, title: "Visitante escolhe", text: "A pessoa seleciona ambiente, data, modalidade por hora ou diária e verifica disponibilidade." },
  { icon: ClipboardCheck, title: "Cliente reserva", text: "Após entrar ou criar conta, a solicitação é registrada e encaminhada para confirmação." },
  { icon: CheckCircle2, title: "Gestor confirma", text: "A equipe acompanha a agenda, ajusta o valor quando necessário e confirma pelo painel." },
  { icon: LockKeyhole, title: "Cliente acompanha", text: "A área do cliente reúne reservas, contratos, valores e informações do relacionamento." },
];

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start gap-4 p-5 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${guide.accent}`}><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">{guide.eyebrow}</span>
          <span className="mt-1 block text-lg font-black text-brand-blue-dark">{guide.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-slate-500">{guide.description}</span>
        </span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 pb-5 pt-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Roteiro rápido</p>
          <ol className="space-y-3">
            {guide.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm text-slate-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-black text-white">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AdminDocumentation() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-3xl bg-brand-blue-dark px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 flex items-center gap-3 text-brand-orange"><BookOpen className="h-7 w-7" /><span className="text-xs font-black uppercase tracking-[0.2em]">Central de operação</span></div>
          <h2 className="text-3xl font-black tracking-tight md:text-5xl">Manual do painel</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">Um mapa simples de como o negócio funciona por dentro e de como cada área do painel aparece na jornada do visitante e do cliente.</p>
        </div>
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[28px] border-brand-orange/20" />
        <div className="absolute bottom-5 right-8 hidden items-center gap-2 text-xs font-bold text-white/60 md:flex"><ShieldCheck className="h-4 w-4 text-brand-orange" /> Controle com histórico</div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          [LayoutDashboard, "Operar", "agenda e equipe"],
          [CircleDollarSign, "Controlar", "valores e repasses"],
          [BarChart3, "Analisar", "ocupação e resultado"],
          [Settings2, "Publicar", "site e conteúdo"],
        ].map(([Icon, title, text]) => { const Component = Icon as typeof LayoutDashboard; return <div key={title as string} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Component className="h-5 w-5 text-brand-orange" /><div><p className="font-black text-brand-blue-dark">{title as string}</p><p className="text-xs text-slate-500">{text as string}</p></div></div>; })}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Controle interno</p><h3 className="mt-1 text-2xl font-black text-brand-blue-dark">O que o gestor administra</h3></div><LifeBuoy className="hidden h-8 w-8 text-slate-300 md:block" /></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{internalGuides.map((guide) => <GuideCard key={guide.title} guide={guide} />)}</div>
      </section>

      <section className="rounded-3xl border border-brand-orange/20 bg-orange-50/60 p-6 md:p-8">
        <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Visão externa</p><h3 className="mt-1 text-2xl font-black text-brand-blue-dark">A jornada que o público percebe</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">Use este fluxo para conferir se uma alteração no painel está refletida no site e na área do cliente.</p></div>
        <div className="mt-8 grid gap-4 md:grid-cols-5">{externalSteps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="relative"><div className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue-dark text-white"><Icon className="h-4 w-4" /></span><span className="text-xs font-black text-brand-orange">0{index + 1}</span></div><h4 className="font-black text-brand-blue-dark">{step.title}</h4><p className="mt-2 text-xs leading-relaxed text-slate-500">{step.text}</p></div>{index < externalSteps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-brand-orange md:block" />}</div>; })}</div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-slate-900 p-6 text-white md:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Rotina recomendada</p><h3 className="mt-2 text-2xl font-black">Checklist de abertura</h3><div className="mt-5 space-y-3">{["Verificar Pendências e reservas do dia", "Conferir salas, capacidade e visitantes", "Atualizar status de pagamentos e contratos", "Revisar mensagens, conteúdo ou campanhas do site"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-orange" />{item}</div>)}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Regra de ouro</p><h3 className="mt-2 text-2xl font-black text-brand-blue-dark">Preserve o histórico</h3><p className="mt-4 text-sm leading-relaxed text-slate-600">Cancele reservas e arquive cadastros quando o objetivo for retirar algo da operação. Evite apagar registros financeiros ou de relacionamento.</p><div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" /> Decisões ficam rastreáveis</div></div>
      </section>
    </div>
  );
}