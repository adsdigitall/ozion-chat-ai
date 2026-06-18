"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings, Building2, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";

type WorkspaceOption = {
  id: string;
  name: string;
  plan: string;
  status: string;
  is_current?: boolean;
};

export function TopBar() {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [switching, setSwitching] = useState("");
  const [search, setSearch] = useState("");
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const getCurrentUser = useAuthStore((state) => state.getCurrentUser);

  useEffect(() => {
    if (!user?.permissions?.includes("workspaces.view")) return;
    const controller = new AbortController();
    fetch("/api/workspaces", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        setWorkspaces(payload.workspaces ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [user?.workspace_id, user?.current_workspace?.id, user?.permissions]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push(`/crm?search=${encodeURIComponent(query)}`);
  };

  const currentWorkspace = user?.current_workspace ?? workspaces.find((workspace) => workspace.is_current) ?? null;

  async function switchWorkspace(workspaceId: string) {
    setSwitching(workspaceId);
    const response = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
    setSwitching("");
    if (!response.ok) return;
    setShowWorkspaces(false);
    await getCurrentUser();
    router.refresh();
  }

  return (
    <header className="oz-topbar safe-top sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b px-4 md:px-6">
      <form onSubmit={handleSearch} className="hidden items-center gap-3 flex-1 max-w-md sm:flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar contatos, conversas, fluxos..."
            className="oz-input h-9 w-full rounded-lg pl-10 pr-4 text-sm focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <div className="relative hidden min-w-[210px] md:block">
          <button
            type="button"
            onClick={() => setShowWorkspaces((value) => !value)}
            className="pulse-button flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left transition hover:border-emerald-500/35"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-black text-white">{currentWorkspace?.name ?? "Workspace"}</span>
              <span className="block truncate text-[11px] font-semibold text-zinc-500">
                {currentWorkspace?.plan ?? "start"} · {currentWorkspace?.status ?? "active"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {showWorkspaces ? (
            <div className="oz-modal absolute right-0 top-full mt-2 max-h-80 w-72 overflow-y-auto rounded-xl p-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => void switchWorkspace(workspace.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                    workspace.id === currentWorkspace?.id ? "bg-emerald-500/10 text-emerald-200" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{workspace.name}</span>
                    <span className="block text-xs text-zinc-500">{workspace.plan} · {workspace.status}</span>
                  </span>
                  {switching === workspace.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                </button>
              ))}
              {!workspaces.length ? <p className="px-3 py-4 text-sm text-zinc-500">Nenhum Workspace disponível.</p> : null}
            </div>
          ) : null}
        </div>

        <button onClick={() => router.push("/logs")} aria-label="Ver notificações" className="pulse-button relative rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-zinc-400 transition hover:border-emerald-500/40 hover:text-white">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="pulse-button flex items-center gap-3 rounded-lg border border-transparent py-1.5 pl-3 pr-2 transition hover:border-emerald-500/20 hover:bg-emerald-500/5"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_22px_rgba(16,185,129,0.25)]">
              <span className="text-zinc-950 text-sm font-black">
                {user?.name?.[0] ?? "N"}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name ?? "Natan"}</p>
              <p className="text-[11px] text-zinc-500">{user?.role_label ?? "Admin"}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>

          {showProfile && (
            <div className="oz-modal absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl">
              <div className="p-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-white">{user?.name ?? "Natan Macedo"}</p>
                <p className="text-xs text-zinc-500">{user?.email ?? "adsdigital47@gmail.com"}</p>
              </div>
              <div className="p-1">
                <button onClick={() => { setShowProfile(false); router.push("/settings"); }} className="pulse-button w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white">
                  <User className="w-4 h-4" />
                  Meu Perfil
                </button>
                <button onClick={() => { setShowProfile(false); router.push("/settings"); }} className="pulse-button w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white">
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                <button
                  onClick={handleSignOut}
                  className="pulse-button w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
