import type { ComponentType, ReactNode, SelectHTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Bot, Inbox, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{ className?: string }>;

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm font-medium text-zinc-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  className,
}: {
  icon: IconComponent;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("oz-card rounded-xl p-5 transition hover:border-emerald-500/30 hover:shadow-[0_0_42px_rgba(16,185,129,0.14)]", className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-300">{label}</p>
      {detail ? <p className="mt-1 text-xs font-medium text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export function ActionButton({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      {...props}
      className={cn(
        "pulse-button px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:animate-none",
        variant === "primary" && "oz-button-primary",
        variant === "secondary" && "oz-button-secondary",
        variant === "ghost" && "rounded-lg px-3 py-2 font-semibold text-zinc-400 transition hover:bg-zinc-800/70 hover:text-white",
        variant === "danger" && "rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-500/15",
        className,
      )}
    />
  );
}

export function StatusBadge({
  children,
  tone = "success",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "muted" | "info";
  className?: string;
}) {
  const tones = {
    success: "border-emerald-500/24 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/24 bg-amber-500/10 text-amber-300",
    danger: "border-red-500/24 bg-red-500/10 text-red-300",
    muted: "border-zinc-700 bg-zinc-800 text-zinc-300",
    info: "border-cyan-500/24 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 p-10 text-center", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm font-black text-white">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  description,
  children,
  onClose,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className={cn("oz-modal max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl", className)}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-zinc-800 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("oz-input h-10 rounded-lg px-3 text-sm outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20", className)} />;
}

export function FilterSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("oz-input h-10 rounded-lg px-3 text-sm outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20", className)} />;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; icon?: IconComponent }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
              selected ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function DeviceCard({
  title,
  subtitle,
  status,
  meta,
  selected,
  onClick,
  action,
}: {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  action?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "oz-card flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left transition hover:border-emerald-500/30",
        selected && "border-emerald-500/45 shadow-[0_0_34px_rgba(16,185,129,0.16)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <Phone className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-white">{title}</p>
            {status}
          </div>
          {subtitle ? <p className="mt-1 text-xs font-medium text-zinc-500">{subtitle}</p> : null}
          {meta ? <div className="mt-2 text-xs text-zinc-500">{meta}</div> : null}
        </div>
      </div>
      {action}
    </button>
  );
}

export function AgentCard({
  name,
  description,
  status,
  provider,
  active,
  onClick,
}: {
  name: string;
  description?: string;
  status?: ReactNode;
  provider?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "oz-card flex min-h-[220px] flex-col items-start rounded-2xl p-5 text-left transition hover:border-emerald-500/30",
        active && "border-emerald-500/45 shadow-[0_0_42px_rgba(16,185,129,0.18)]",
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
        <Bot className="h-7 w-7" />
      </div>
      <div className="flex w-full flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-base font-black text-white">{name}</p>
        {status}
      </div>
      {description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">{description}</p> : null}
      {provider ? <div className="mt-auto pt-4">{provider}</div> : null}
    </button>
  );
}
