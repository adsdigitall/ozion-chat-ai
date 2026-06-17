"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Search, Shield, User, type LucideIcon } from "lucide-react";

type LogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user: { name: string; email: string } | { name: string; email: string }[] | null;
};

const actionConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  "user.login": { icon: User, color: "text-blue-400", label: "Login" },
  "conversation.created": { icon: FileText, color: "text-emerald-400", label: "Conversa" },
  "flow.published": { icon: FileText, color: "text-purple-400", label: "Fluxo" },
  "integration.connected": { icon: FileText, color: "text-cyan-400", label: "Integração" },
  "agent.created": { icon: FileText, color: "text-pink-400", label: "Agente" },
  "user.invited": { icon: User, color: "text-blue-400", label: "Convite" },
  "sale.completed": { icon: FileText, color: "text-emerald-400", label: "Venda" },
  "settings.updated": { icon: Shield, color: "text-zinc-400", label: "Configuração" },
};

function relationUser(value: LogRow["user"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function detailsText(details: Record<string, unknown> | null) {
  if (!details || !Object.keys(details).length) return "-";
  if (typeof details.message === "string") return details.message;
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/logs", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os registros.");
        setLogs(payload.logs);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const actions = useMemo(() => [...new Set(logs.map((log) => log.action))], [logs]);
  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const user = relationUser(log.user);
        const haystack = `${log.action} ${user?.name ?? ""} ${log.target_type ?? ""} ${detailsText(log.details)}`.toLowerCase();
        return (action === "all" || log.action === action) && (!search || haystack.includes(search.toLowerCase()));
      }),
    [logs, action, search],
  );

  const exportCsv = () => {
    const rows = [
      ["Ação", "Usuário", "Alvo", "Detalhes", "IP", "Data"],
      ...filtered.map((log) => [
        log.action,
        relationUser(log.user)?.name ?? "Sistema",
        log.target_type ?? "",
        detailsText(log.details),
        log.ip_address ?? "",
        log.created_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ozion-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Logs</h1><p className="text-sm text-zinc-500 mt-1">Histórico real de atividades da plataforma</p></div>
        <button type="button" onClick={exportCsv} disabled={!filtered.length} className="h-9 px-4 bg-zinc-800 text-zinc-300 text-sm rounded-lg disabled:opacity-40">Exportar CSV</button>
      </div>
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric icon={FileText} value={logs.length} label="Registros" color="text-emerald-400" />
        <Metric icon={User} value={new Set(logs.map((log) => relationUser(log.user)?.email).filter(Boolean)).size} label="Usuários" color="text-blue-400" />
        <Metric icon={Shield} value={logs.filter((log) => log.action.startsWith("user.")).length} label="Ações de usuário" color="text-purple-400" />
      </div>
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nos logs..." className="w-full h-9 pl-10 pr-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" /></div>
        <select value={action} onChange={(event) => setAction(event.target.value)} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300"><option value="all">Todas as ações</option>{actions.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div> : (
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800"><th className="text-left p-4 text-xs text-zinc-500 uppercase">Ação</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Usuário</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Alvo</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Detalhes</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Data</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((log) => {
                const config = actionConfig[log.action] ?? { icon: FileText, color: "text-zinc-400", label: log.action };
                const user = relationUser(log.user);
                return <tr key={log.id}><td className="p-4"><span className="flex items-center gap-2 text-sm text-zinc-300"><config.icon className={`w-4 h-4 ${config.color}`} />{config.label}</span></td><td className="p-4 text-sm text-zinc-300">{user?.name ?? "Sistema"}</td><td className="p-4 text-sm text-zinc-400">{log.target_type ?? "-"}</td><td className="p-4 text-sm text-zinc-500 max-w-md truncate">{detailsText(log.details)}</td><td className="p-4 text-sm text-zinc-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</td></tr>;
              })}
              {!filtered.length && <tr><td colSpan={5} className="p-10 text-center text-sm text-zinc-500">Nenhuma atividade registrada ainda.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label, color }: { icon: LucideIcon; value: number; label: string; color: string }) {
  return <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><Icon className={`w-5 h-5 ${color} mb-3`} /><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-zinc-500">{label}</p></div>;
}
