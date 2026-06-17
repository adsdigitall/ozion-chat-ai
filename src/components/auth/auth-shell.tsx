import type { ReactNode } from "react";
import { Bot, KanbanSquare, MessageCircle, Sparkles, Workflow, Zap } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
}

function OzionLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
        <Zap className="h-6 w-6 text-white" />
      </div>
      <div>
        <div className="text-3xl font-black tracking-tight text-zinc-950">Ozion</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.45em] text-zinc-400">Business IA</div>
      </div>
    </div>
  );
}

function FloatingCard({
  className,
  icon,
  title,
  subtitle,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={`absolute rounded-3xl border border-white/80 bg-white/90 p-5 shadow-2xl shadow-slate-200/80 backdrop-blur ${className}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
        {icon}
      </div>
      <div className="text-sm font-black uppercase tracking-wide text-zinc-950">{title}</div>
      <div className="mt-1 text-xs font-medium text-zinc-500">{subtitle}</div>
    </div>
  );
}

export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-white text-zinc-950 lg:grid lg:grid-cols-[minmax(430px,0.95fr)_minmax(540px,1.05fr)]">
      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[530px]">
          <div className="mb-14 flex justify-center lg:justify-start">
            <OzionLogo />
          </div>

          <div className="mb-9">
            {eyebrow ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
            ) : null}
            <h1 className="text-4xl font-black leading-tight tracking-tight text-zinc-950 sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-zinc-500">{description}</p>
          </div>

          {children}
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100 lg:block">
        <div className="absolute left-12 top-12 h-20 w-20 rounded-2xl border-2 border-emerald-200/80" />
        <div className="absolute right-24 top-24 grid gap-3">
          <div className="h-7 w-2 rounded-full bg-emerald-200" />
          <div className="h-7 w-2 rounded-full bg-emerald-200" />
          <div className="h-7 w-2 rounded-full bg-emerald-200" />
        </div>
        <div className="absolute inset-x-0 top-[11%] mx-auto h-[420px] w-[520px] rounded-full bg-white/55 blur-3xl" />

        <FloatingCard
          className="left-[15%] top-[28%] rotate-[-7deg]"
          icon={<KanbanSquare className="h-6 w-6" />}
          title="Kanban de contatos"
          subtitle="Leads, clientes e vendas"
        />
        <FloatingCard
          className="left-[39%] top-[18%] rotate-[-8deg]"
          icon={<MessageCircle className="h-6 w-6" />}
          title="Chat ao vivo"
          subtitle="Conectado ao WhatsApp"
        />
        <FloatingCard
          className="right-[11%] top-[28%] rotate-[-5deg]"
          icon={<Workflow className="h-6 w-6" />}
          title="Fluxos automáticos"
          subtitle="Atendimento e follow-up"
        />
        <FloatingCard
          className="left-[31%] top-[48%] rotate-[5deg]"
          icon={<Bot className="h-6 w-6" />}
          title="Agente IA"
          subtitle="Responde, qualifica e vende"
        />

        <div className="absolute bottom-24 left-1/2 w-full max-w-xl -translate-x-1/2 px-8 text-center">
          <h2 className="text-5xl font-black leading-tight tracking-tight text-zinc-950">
            Automações rápidas e poderosas
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg font-semibold leading-relaxed text-zinc-700">
            O Ozion une WhatsApp, CRM, voz, IA e funis para acelerar seu atendimento em um unico painel.
          </p>
        </div>

        <div className="absolute bottom-10 right-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-300">
          <MessageCircle className="h-8 w-8" />
        </div>
      </section>
    </main>
  );
}
