"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Users,
  Crown,
  Settings,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

const workspaces = [
  {
    id: 1,
    name: "Ozion Principal",
    slug: "ozion-principal",
    owner: "Natan Macedo",
    plan: "Enterprise",
    users: 5,
    contacts: 1234,
    conversations: 4567,
    status: "active",
    created_at: "2024-01-01",
  },
  {
    id: 2,
    name: "Cliente - TechCorp",
    slug: "techcorp",
    owner: "João Silva",
    plan: "Pro",
    users: 3,
    contacts: 890,
    conversations: 2345,
    status: "active",
    created_at: "2024-01-10",
  },
  {
    id: 3,
    name: "Cliente - StartupXYZ",
    slug: "startupxyz",
    owner: "Maria Santos",
    plan: "Starter",
    users: 2,
    contacts: 456,
    conversations: 1234,
    status: "active",
    created_at: "2024-01-15",
  },
  {
    id: 4,
    name: "Cliente - AgênciaDigital",
    slug: "agenciadigital",
    owner: "Pedro Costa",
    plan: "Pro",
    users: 4,
    contacts: 678,
    conversations: 3456,
    status: "trial",
    created_at: "2024-01-20",
  },
];

const planColors: Record<string, string> = {
  Free: "text-zinc-400 bg-zinc-500/10",
  Starter: "text-blue-400 bg-blue-500/10",
  Pro: "text-purple-400 bg-purple-500/10",
  Enterprise: "text-amber-400 bg-amber-500/10",
};

export default function WorkspacesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      searchQuery === "" ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gerencie ambientes isolados para seus clientes
          </p>
        </div>
        <button className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Workspace
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{workspaces.length}</p>
              <p className="text-xs text-zinc-500">Total de Workspaces</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {workspaces.reduce((sum, w) => sum + w.users, 0)}
              </p>
              <p className="text-xs text-zinc-500">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {workspaces.filter((w) => w.plan === "Enterprise").length}
              </p>
              <p className="text-xs text-zinc-500">Planos Enterprise</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {workspaces.filter((w) => w.status === "active").length}
              </p>
              <p className="text-xs text-zinc-500">Ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{workspace.name}</h3>
                  <p className="text-xs text-zinc-500">/{workspace.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    planColors[workspace.plan]
                  }`}
                >
                  {workspace.plan}
                </span>
                <button className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-zinc-500">Usuários</p>
                <p className="text-sm font-medium text-white">{workspace.users}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Contatos</p>
                <p className="text-sm font-medium text-white">{workspace.contacts}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Conversas</p>
                <p className="text-sm font-medium text-white">{workspace.conversations}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="w-3 h-3" />
                <span>{workspace.owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
