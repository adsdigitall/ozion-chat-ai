"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Loader2,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

type TabId = "overview" | "flows" | "campaigns" | "agents" | "attendants";

type AnalyticsData = {
  summary: {
    contacts: number;
    wonContacts: number;
    openConversations: number;
    waitingConversations: number;
    closedConversations: number;
    revenue: number;
    conversionRate: number;
    campaignLeads: number;
    campaignPurchases: number;
    campaignSpend: number;
    roi: number;
    roas: number;
  };
  flows: {
    id: string;
    name: string;
    status: string;
    version: number;
    entries: number;
    conversions: number;
    rate: number;
  }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    leads: number;
    purchases: number;
    spent: number;
    roi: number;
    roas: number;
  }[];
  agents: {
    id: string;
    name: string;
    status: string;
    conversations: number;
  }[];
  attendants: {
    id: string;
    name: string;
    role: string;
    conversations: number;
  }[];
};

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  iconClass: string;
  iconBackground: string;
};

const emptyData: AnalyticsData = {
  summary: {
    contacts: 0,
    wonContacts: 0,
    openConversations: 0,
    waitingConversations: 0,
    closedConversations: 0,
    revenue: 0,
    conversionRate: 0,
    campaignLeads: 0,
    campaignPurchases: 0,
    campaignSpend: 0,
    roi: 0,
    roas: 0,
  },
  flows: [],
  campaigns: [],
  agents: [],
  attendants: [],
};

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "flows", label: "Por Fluxo" },
  { id: "campaigns", label: "Por Campanha" },
  { id: "agents", label: "Por Agente IA" },
  { id: "attendants", label: "Por Atendente" },
];

function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return (
    <tr>
      <td colSpan={columns} className="py-10 px-4 text-center text-sm text-zinc-500">
        {text}
      </td>
    </tr>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("all");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as análises.");
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

  const metrics = useMemo<Metric[]>(
    () => [
      {
        label: "Contatos",
        value: data.summary.contacts.toLocaleString("pt-BR"),
        helper: `${data.summary.campaignLeads} via campanhas`,
        icon: Users,
        iconClass: "text-blue-400",
        iconBackground: "bg-blue-500/10",
      },
      {
        label: "Conversões",
        value: data.summary.wonContacts.toLocaleString("pt-BR"),
        helper: `${data.summary.conversionRate.toFixed(1)}% dos contatos`,
        icon: TrendingUp,
        iconClass: "text-emerald-400",
        iconBackground: "bg-emerald-500/10",
      },
      {
        label: "Aguardando",
        value: data.summary.waitingConversations.toLocaleString("pt-BR"),
        helper: `${data.summary.openConversations} conversas abertas`,
        icon: MessageSquare,
        iconClass: "text-red-400",
        iconBackground: "bg-red-500/10",
      },
      {
        label: "Receita",
        value: data.summary.revenue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        helper: "vendas concluídas",
        icon: DollarSign,
        iconClass: "text-amber-400",
        iconBackground: "bg-amber-500/10",
      },
      {
        label: "ROI",
        value: `${data.summary.roi.toFixed(1)}%`,
        helper: `${data.summary.campaignSpend.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} investidos`,
        icon: BarChart3,
        iconClass: "text-purple-400",
        iconBackground: "bg-purple-500/10",
      },
      {
        label: "ROAS",
        value: `${data.summary.roas.toFixed(2)}x`,
        helper: `${data.summary.campaignPurchases} compras atribuídas`,
        icon: TrendingDown,
        iconClass: "text-cyan-400",
        iconBackground: "bg-cyan-500/10",
      },
    ],
    [data],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Análises</h1>
          <p className="text-sm text-zinc-500 mt-1">Métricas consolidadas do seu negócio</p>
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">Todo o período</option>
          <option value="month">Este mês</option>
          <option value="quarter">Este trimestre</option>
          <option value="year">Este ano</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className={`w-10 h-10 rounded-lg ${metric.iconBackground} flex items-center justify-center mb-4`}>
                <metric.icon className={`w-5 h-5 ${metric.iconClass}`} />
              </div>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className="text-sm text-zinc-300 mt-1">{metric.label}</p>
              <p className="text-xs text-zinc-500 mt-1">{metric.helper}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "flows" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Fluxo</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Estado</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Versão</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Execuções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.flows.map((flow) => (
                <tr key={flow.id}>
                  <td className="py-3 px-4 text-sm text-white">{flow.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">
                    {flow.status === "published" ? "Publicado" : "Rascunho"}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{flow.version}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{flow.entries}</td>
                </tr>
              ))}
              {!data.flows.length && <EmptyRow columns={4} text="Nenhum fluxo cadastrado." />}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === "campaigns" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Campanha</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Leads</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Compras</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Investido</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="py-3 px-4 text-sm text-white">{campaign.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{campaign.leads}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{campaign.purchases}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">
                    {campaign.spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-3 px-4 text-sm text-emerald-400">{campaign.roi.toFixed(1)}%</td>
                </tr>
              ))}
              {!data.campaigns.length && <EmptyRow columns={5} text="Nenhuma campanha cadastrada." />}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === "agents" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Agente</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Conversas</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="py-3 px-4 text-sm text-white">{agent.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{agent.conversations}</td>
                  <td className={agent.status === "active" ? "py-3 px-4 text-sm text-emerald-400" : "py-3 px-4 text-sm text-zinc-500"}>
                    {agent.status === "active" ? "Ativo" : "Inativo"}
                  </td>
                </tr>
              ))}
              {!data.agents.length && <EmptyRow columns={3} text="Nenhum agente de IA cadastrado." />}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === "attendants" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Atendente</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Conversas</th>
                <th className="text-left py-3 px-4 text-xs text-zinc-500 uppercase">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.attendants.map((attendant) => (
                <tr key={attendant.id}>
                  <td className="py-3 px-4 text-sm text-white">{attendant.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{attendant.conversations}</td>
                  <td className="py-3 px-4 text-sm text-zinc-300">{attendant.role}</td>
                </tr>
              ))}
              {!data.attendants.length && <EmptyRow columns={3} text="Nenhum atendente cadastrado." />}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
