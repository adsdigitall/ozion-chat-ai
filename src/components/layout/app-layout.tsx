"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, Lock, LogOut, RefreshCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { canAccessModule } from "@/lib/auth/access-control";
import { canAccess, routePermission } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/stores/auth";
import { MODULE_LABELS, type ModuleKey } from "@/lib/plans/plan-limits";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const ROUTE_MODULES: Array<{ prefix: string; module: ModuleKey }> = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/chat", module: "chat" },
  { prefix: "/crm", module: "crm" },
  { prefix: "/flows", module: "flows" },
  { prefix: "/agents", module: "agents" },
  { prefix: "/voice", module: "voice" },
  { prefix: "/ctwa", module: "ctwa" },
  { prefix: "/campaigns", module: "campaigns" },
  { prefix: "/analytics", module: "analytics" },
  { prefix: "/sales", module: "sales" },
  { prefix: "/integrations", module: "integrations" },
  { prefix: "/whatsapp", module: "whatsapp" },
  { prefix: "/workspaces", module: "workspaces" },
  { prefix: "/members", module: "members" },
];

function routeModule(pathname: string) {
  return ROUTE_MODULES.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))?.module ?? null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const user = useAuthStore((state) => state.user);
  const getCurrentUser = useAuthStore((state) => state.getCurrentUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signOut = useAuthStore((state) => state.signOut);
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (!isLoading) return;
    const timeout = window.setTimeout(() => setLoadingTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  if (isPublic) {
    return <>{children}</>;
  }

  const requiredPermission = routePermission(pathname);
  const isForbidden = Boolean(user && requiredPermission && !canAccess(user.permissions, requiredPermission));
  const requiredModule = routeModule(pathname);
  const isModuleBlocked = Boolean(user && requiredModule && !canAccessModule(user, requiredModule));
  const isSuspended = Boolean(user?.customer_status === "suspended" || user?.current_workspace?.status === "suspended");
  const isWorkspaceInactive = Boolean(user?.current_workspace?.status === "inactive");
  const hasNoWorkspace = Boolean(user && user.role !== "admin_master" && !user.current_workspace?.id);

  async function stopImpersonation() {
    await fetch("/api/customers/impersonate", { method: "DELETE" });
    await getCurrentUser();
    router.push("/customers");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] bg-[#050807]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        {user?.impersonation ? (
          <div className="z-40 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100 md:px-6">
            <span>Você está acessando como Admin Master: {user.impersonation.customer_name}</span>
            <button
              type="button"
              onClick={() => void stopImpersonation()}
              className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100 transition hover:bg-emerald-500/15"
            >
              Voltar ao painel Admin Master
            </button>
          </div>
        ) : null}
        <main className="oz-page flex-1 overflow-y-auto pb-20 md:pb-0">
          {isLoading && loadingTimedOut ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-200">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-lg font-black text-white">Erro de conexão</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Não foi possível finalizar o carregamento do acesso. Recarregue a página ou entre novamente.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button type="button" onClick={() => window.location.reload()} className="oz-button-secondary px-4 py-2 text-sm">
                    Recarregar
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="oz-button-primary px-4 py-2 text-sm"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex min-h-full items-center justify-center text-sm font-semibold text-zinc-500">Carregando acesso...</div>
          ) : isSuspended ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-lg font-black text-white">Conta suspensa</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Conta suspensa. Entre em contato com o administrador.</p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="oz-button-secondary mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da conta
                </button>
              </div>
            </div>
          ) : isWorkspaceInactive ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <h1 className="text-lg font-black text-white">Workspace inativo</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Workspace inativo. Selecione outro Workspace ou fale com o administrador.
                </p>
              </div>
            </div>
          ) : hasNoWorkspace ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-lg font-black text-white">Nenhum workspace encontrado</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Nenhum workspace encontrado. Crie ou selecione um workspace.</p>
              </div>
            </div>
          ) : isForbidden ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <h1 className="text-lg font-black text-white">Acesso restrito</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Seu perfil não tem permissão para acessar esta área.</p>
              </div>
            </div>
          ) : isModuleBlocked && requiredModule ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <div className="oz-card max-w-md rounded-xl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                  <Lock className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-lg font-black text-white">Módulo bloqueado pelo plano</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {MODULE_LABELS[requiredModule]} não está liberado no plano atual.
                </p>
              </div>
            </div>
          ) : children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
