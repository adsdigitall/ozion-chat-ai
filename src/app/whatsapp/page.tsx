"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Loader2,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type WhatsAppConnectionRow = {
  id: string;
  workspace_id: string;
  phone_number: string;
  display_name: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  business_id: string | null;
  access_token?: string | null;
  status: "connected" | "disconnected" | "error" | string;
  type: "cloud_api" | "qrcode" | string;
  messages_today?: number | null;
  config?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
};

type ConnectionStats = {
  total: number;
  connected: number;
  cloud: number;
  messagesToday: number;
};

type TemplateRow = {
  name?: string;
  status?: string;
  language?: string;
  category?: string;
};

const STATUS_META: Record<string, { label: string; icon: LucideIcon; badge: string; dot: string }> = {
  connected: { label: "Conectado", icon: CheckCircle2, badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-400" },
  disconnected: { label: "Desconectado", icon: XCircle, badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-500" },
  error: { label: "Erro", icon: AlertCircle, badge: "bg-red-500/10 text-red-300 border-red-500/20", dot: "bg-red-400" },
};

export default function WhatsAppPage() {
  const [connections, setConnections] = useState<WhatsAppConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    phone_number: "",
    phone_number_id: "",
    waba_id: "",
    business_id: "",
    access_token: "",
  });

  async function loadConnections() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/connections", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar conexões do WhatsApp");
      setConnections(result.connections || []);
    } catch (loadError) {
      setConnections([]);
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar conexões do WhatsApp");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      if (mounted) void loadConnections();
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function saveConnection() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "cloud_api" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar conexão.");
      setShowConnectionModal(false);
      setForm({ display_name: "", phone_number: "", phone_number_id: "", waba_id: "", business_id: "", access_token: "" });
      await loadConnections();
      setSelectedConnection(result.connection.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function removeConnection(id: string) {
    if (!window.confirm("Remover este número oficial?")) return;
    const response = await fetch(`/api/whatsapp/connections?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Falha ao remover conexão.");
      return;
    }
    setSelectedConnection(null);
    await loadConnections();
  }

  async function loadTemplates(connectionId: string) {
    setTemplateLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/whatsapp/templates?connectionId=${connectionId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar templates.");
      setTemplates(result.templates || []);
    } catch (templateError) {
      setTemplates([]);
      setError(templateError instanceof Error ? templateError.message : "Falha ao carregar templates.");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function copyWebhookUrl() {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
    await navigator.clipboard.writeText(webhookUrl);
    setError(`Webhook copiado: ${webhookUrl}`);
  }

  const stats: ConnectionStats = useMemo(() => ({
    total: connections.length,
    connected: connections.filter((c) => c.status === "connected").length,
    cloud: connections.filter((c) => c.type === "cloud_api").length,
    messagesToday: connections.reduce((sum, c) => sum + Number(c.messages_today || 0), 0),
  }), [connections]);

  const selected = connections.find((c) => c.id === selectedConnection) || connections[0] || null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie suas conexões do WhatsApp Business</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadConnections()} className="h-9 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Sincronizar
          </button>
          <button onClick={() => setShowConnectionModal(true)} className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Nova Conexão
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-emerald-400" /></div><div><p className="text-2xl font-bold text-white">{stats.total}</p><p className="text-xs text-zinc-500">Total de Números</p></div></div></div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-blue-400" /></div><div><p className="text-2xl font-bold text-white">{stats.connected}</p><p className="text-xs text-zinc-500">Conectados</p></div></div></div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Cloud className="w-5 h-5 text-purple-400" /></div><div><p className="text-2xl font-bold text-white">{stats.cloud}</p><p className="text-xs text-zinc-500">Cloud API</p></div></div></div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Phone className="w-5 h-5 text-amber-400" /></div><div><p className="text-2xl font-bold text-white">{stats.messagesToday}</p><p className="text-xs text-zinc-500">Mensagens Hoje</p></div></div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Cloud className="w-5 h-5 text-blue-400" /></div><div><h3 className="text-sm font-medium text-white">Meta Cloud API</h3><p className="text-xs text-zinc-500">Recomendado para produção</p></div></div>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> WhatsApp Oficial verificado</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Templates aprovados</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Alta taxa de entrega</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Suporte a mídia</li>
          </ul>
          <button onClick={() => setShowConnectionModal(true)} className="mt-4 w-full py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors">Conectar via Meta</button>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><QrCode className="w-5 h-5 text-amber-400" /></div><div><h3 className="text-sm font-medium text-white">QR Code</h3><p className="text-xs text-zinc-500">Para testes e uso pessoal</p></div></div>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Configuração rápida</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sem necessidade de BM</li>
            <li className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-amber-400" /> Pode ser bloqueado</li>
            <li className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-400" /> Sem templates</li>
          </ul>
          <button disabled className="mt-4 w-full cursor-not-allowed py-2 bg-zinc-800 text-zinc-500 rounded-lg text-sm">QR Code não é oficial</button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="p-5 border-b border-zinc-800"><h3 className="text-sm font-medium text-white">Suas Conexões</h3></div>
        <div className="divide-y divide-zinc-800">
          {connections.map((connection) => {
            const status = STATUS_META[connection.status] || STATUS_META.disconnected;
            const StatusIcon = status.icon;
            return (
              <div key={connection.id} className="flex items-center justify-between p-5 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setSelectedConnection(connection.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Phone className="w-6 h-6 text-emerald-400" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{connection.display_name || connection.phone_number}</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${status.badge}`}><StatusIcon className="w-3 h-3" />{status.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{connection.phone_number}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600"><span>{connection.type === "cloud_api" ? "Cloud API" : "QR Code"}</span><span>{Number(connection.messages_today || 0)} msgs hoje</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2"><button onClick={(event) => { event.stopPropagation(); void navigator.clipboard.writeText(connection.phone_number_id || connection.phone_number); }} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><Copy className="w-4 h-4" /></button><button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><Settings className="w-4 h-4" /></button><button onClick={(event) => { event.stopPropagation(); void removeConnection(connection.id); }} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-blue-400" /></div>
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Canal selecionado</h3>
              <p className="text-sm text-zinc-400 mb-4">{selected.display_name || selected.phone_number} — {selected.status}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setShowConnectionModal(true)} className="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"><ExternalLink className="w-4 h-4" /> Configurar credenciais</button>
                <button onClick={() => void copyWebhookUrl()} className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"><Copy className="w-4 h-4" /> Copiar webhook</button>
                <button onClick={() => void loadTemplates(selected.id)} className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"><RefreshCw className="w-4 h-4" /> Templates</button>
              </div>
              {templateLoading && <p className="mt-3 text-xs text-zinc-500">Carregando templates aprovados...</p>}
              {templates.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {templates.slice(0, 6).map((template) => (
                    <div key={`${template.name}-${template.language}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs font-medium text-white">{template.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{template.language} · {template.status} · {template.category}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showConnectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="font-semibold text-white">Conectar número oficial</h2>
                <p className="mt-1 text-xs text-zinc-500">Credenciais da Meta Cloud API</p>
              </div>
              <button onClick={() => setShowConnectionModal(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {([
                ["display_name", "Nome do canal", "Ex: Ozion Vendas"],
                ["phone_number", "Número com DDI", "+55 11 99999-9999"],
                ["phone_number_id", "Phone Number ID", "ID fornecido pela Meta"],
                ["waba_id", "WhatsApp Business Account ID", "WABA ID"],
                ["business_id", "Business Manager ID", "Business ID"],
                ["access_token", "Token permanente", "Token do usuário do sistema"],
              ] as const).map(([key, label, placeholder]) => (
                <label key={key} className={key === "access_token" ? "sm:col-span-2" : ""}>
                  <span className="mb-2 block text-xs text-zinc-500">{label}</span>
                  <input
                    type={key === "access_token" ? "password" : "text"}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-emerald-500/50"
                  />
                </label>
              ))}
              <div className="sm:col-span-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-200">
                O token é enviado somente ao servidor e não volta nas consultas da tela.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button onClick={() => setShowConnectionModal(false)} className="h-10 rounded-lg border border-zinc-800 px-4 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button>
              <button onClick={() => void saveConnection()} disabled={saving} className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                {saving ? "Conectando..." : "Salvar conexão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
