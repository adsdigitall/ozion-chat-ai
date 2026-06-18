"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  GitBranch,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type DashboardData = {
  summary: {
    contacts: number;
    wonContacts: number;
    openConversations: number;
    waitingConversations: number;
    closedConversations: number;
    revenue: number;
    conversionRate: number;
  };
  recentConversations: {
    id: string;
    name: string;
    phone: string;
    lastMessage: string;
    updatedAt: string;
    status: string;
  }[];
  tags: { id: string; name: string; color: string; count: number }[];
  flows: {
    id: string;
    name: string;
    status: string;
    version: number;
    entries: number;
    conversions: number;
    rate: number;
  }[];
};

type StatCard = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  iconClass: string;
  iconBackground: string;
};

const emptyData: DashboardData = {
  summary: {
    contacts: 0,
    wonContacts: 0,
    openConversations: 0,
    waitingConversations: 0,
    closedConversations: 0,
    revenue: 0,
    conversionRate: 0,
  },
  recentConversations: [],
  tags: [],
  flows: [],
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o painel.");
        setData(payload);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const stats = useMemo<StatCard[]>(
    () => [
      {
        label: "Contatos no CRM",
        value: data.summary.contacts.toLocaleString("pt-BR"),
        detail: `${data.summary.wonContacts} ganhos`,
        icon: Users,
        iconClass: "text-emerald-400",
        iconBackground: "bg-emerald-500/10",
      },
      {
        label: "Conversas Abertas",
        value: data.summary.openConversations.toLocaleString("pt-BR"),
        detail: `${data.summary.waitingConversations} aguardando`,
        icon: MessageSquare,
        iconClass: "text-blue-400",
        iconBackground: "bg-blue-500/10",
      },
      {
        label: "Receita Confirmada",
        value: data.summary.revenue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        detail: "vendas concluídas",
        icon: DollarSign,
        iconClass: "text-amber-400",
        iconBackground: "bg-amber-500/10",
      },
      {
        label: "Taxa de Conversão",
        value: `${data.summary.conversionRate.toFixed(1)}%`,
        detail: "contatos ganhos",
        icon: TrendingUp,
        iconClass: "text-purple-400",
        iconBackground: "bg-purple-500/10",
      },
    ],
    [data],
  );

  const conversationStats = [
    {
      status: "Abertas",
      count: data.summary.openConversations,
      icon: MessageSquare,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      status: "Aguardando",
      count: data.summary.waitingConversations,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      status: "Finalizadas",
      count: data.summary.closedConversations,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      status: "Sem atendimento",
      count: Math.max(
        0,
        data.summary.contacts -
          data.summary.openConversations -
          data.summary.waitingConversations -
          data.summary.closedConversations,
      ),
      icon: XCircle,
      color: "text-zinc-400",
      bg: "bg-zinc-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Visão geral dos dados reais do seu negócio</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="oz-card rounded-xl p-5 hover:border-zinc-700 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${stat.iconBackground} flex items-center justify-center mb-4`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-zinc-300 mt-1">{stat.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="oz-card rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">Conversas por Status</h2>
              <div className="space-y-3">
                {conversationStats.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="text-sm text-zinc-300">{item.status}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="oz-card rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">Tags Mais Usadas</h2>
              <div className="space-y-3">
                {data.tags.slice(0, 5).map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm text-zinc-300">{tag.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{tag.count}</span>
                  </div>
                ))}
                {!data.tags.length && <p className="text-sm text-zinc-500">Nenhuma tag cadastrada.</p>}
              </div>
            </section>

            <section className="oz-card rounded-xl p-5">
              <h2 className="text-sm font-medium text-white mb-4">Fluxos</h2>
              <div className="space-y-3">
                {data.flows.slice(0, 4).map((flow) => (
                  <div key={flow.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <GitBranch className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-300 truncate">{flow.name}</p>
                        <p className="text-xs text-zinc-500">Versão {flow.version}</p>
                      </div>
                    </div>
                    <span className={flow.status === "published" ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>
                      {flow.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                ))}
                {!data.flows.length && <p className="text-sm text-zinc-500">Nenhum fluxo cadastrado.</p>}
              </div>
            </section>
          </div>

          <section className="oz-card rounded-xl">
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-sm font-medium text-white">Conversas Recentes</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {data.recentConversations.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                    <span className="text-sm font-medium text-zinc-300">{initials(conversation.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{conversation.name}</p>
                      <span className="text-xs text-zinc-500">{conversation.phone}</span>
                    </div>
                    <p className="text-sm text-zinc-500 truncate">{conversation.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-zinc-500">
                      {new Date(conversation.updatedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        conversation.status === "open"
                          ? "bg-emerald-500"
                          : conversation.status === "waiting"
                            ? "bg-amber-500"
                            : "bg-zinc-600"
                      }`}
                    />
                  </div>
                </div>
              ))}
              {!data.recentConversations.length && (
                <p className="p-5 text-sm text-zinc-500">Nenhuma conversa iniciada ainda.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
