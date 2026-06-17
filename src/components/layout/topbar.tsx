"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";

export function TopBar() {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

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

  return (
    <header className="safe-top min-h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-50">
      <form onSubmit={handleSearch} className="hidden items-center gap-3 flex-1 max-w-md sm:flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar contatos, conversas, fluxos..."
            className="w-full h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <button onClick={() => router.push("/logs")} aria-label="Ver notificações" className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.[0] ?? "N"}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name ?? "Natan"}</p>
              <p className="text-[11px] text-zinc-500">{user?.role === "master" ? "Master Admin" : user?.role ?? "Admin"}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-white">{user?.name ?? "Natan Macedo"}</p>
                <p className="text-xs text-zinc-500">{user?.email ?? "adsdigital47@gmail.com"}</p>
              </div>
              <div className="p-1">
                <button onClick={() => { setShowProfile(false); router.push("/settings"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                  <User className="w-4 h-4" />
                  Meu Perfil
                </button>
                <button onClick={() => { setShowProfile(false); router.push("/settings"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
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
