"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  DollarSign,
  Globe,
  Loader2,
  MessageSquare,
  Plug,
  Search,
  Settings,
  Trash2,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

type IntegrationStatus = "connected" | "disconnected" | "error";

type SavedIntegration = {
  id: string;
  type: string;
  name: string;
  status: IntegrationStatus;
  configured: boolean;
  config: { baseUrl?: string } | null;
  last_error: string | null;
};

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
};

const categories = [
  { name: "Inteligência Artificial", icon: Bot, color: "text-purple-400" },
  { name: "Voz", icon: MessageSquare, color: "text-blue-400" },
  { name: "Pagamentos", icon: DollarSign, color: "text-emerald-400" },
  { name: "Automação", icon: Zap, color: "text-amber-400" },
];

const catalog: CatalogItem[] = [
  { id: "openrouter", name: "OpenRouter", description: "Gateway principal para DeepSeek, Groq e outros LLMs", category: "Inteligência Artificial", icon: Bot },
  { id: "openai", name: "OpenAI", description: "Modelos GPT e geração de voz", category: "Inteligência Artificial", icon: Bot },
  { id: "gemini", name: "Gemini", description: "Modelos de IA do Google", category: "Inteligência Artificial", icon: Bot },
  { id: "claude", name: "Claude", description: "Modelos da Anthropic", category: "Inteligência Artificial", icon: Bot },
  { id: "deepseek", name: "DeepSeek", description: "Modelos DeepSeek", category: "Inteligência Artificial", icon: Bot },
  { id: "groq", name: "Groq", description: "Inferência rápida de IA", category: "Inteligência Artificial", icon: Bot },
  { id: "dify", name: "Dify", description: "Aplicações e agentes de IA", category: "Inteligência Artificial", icon: Bot },
  { id: "elevenlabs", name: "ElevenLabs", description: "Geração e clonagem de voz", category: "Voz", icon: MessageSquare },
  { id: "kiwify", name: "Kiwify", description: "Vendas de produtos digitais", category: "Pagamentos", icon: DollarSign },
  { id: "hotmart", name: "Hotmart", description: "Infoprodutos e assinaturas", category: "Pagamentos", icon: DollarSign },
  { id: "perfectpay", name: "Perfect Pay", description: "Pagamentos e webhooks", category: "Pagamentos", icon: DollarSign },
  { id: "asaas", name: "Asaas", description: "Cobranças e pagamentos", category: "Pagamentos", icon: DollarSign },
  { id: "stripe", name: "Stripe", description: "Pagamentos globais", category: "Pagamentos", icon: DollarSign },
  { id: "mercadopago", name: "Mercado Pago", description: "Pagamentos na América Latina", category: "Pagamentos", icon: DollarSign },
  { id: "utmify", name: "UTMify", description: "Rastreamento e atribuição", category: "Automação", icon: Zap },
  { id: "make", name: "Make", description: "Automação visual", category: "Automação", icon: Zap },
  { id: "zapier", name: "Zapier", description: "Conexão entre aplicativos", category: "Automação", icon: Zap },
  { id: "n8n", name: "N8N", description: "Automação de código aberto", category: "Automação", icon: Zap },
];

const statusConfig: Record<
  IntegrationStatus,
  { icon: LucideIcon; color: string; label: string }
> = {
  connected: { icon: CheckCircle2, color: "text-emerald-400", label: "Conectado" },
  disconnected: { icon: XCircle, color: "text-zinc-500", label: "Desconectado" },
  error: { icon: AlertCircle, color: "text-red-400", label: "Erro" },
};

export default function IntegrationsPage() {
  const [saved, setSaved] = useState<SavedIntegration[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/integrations", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as integrações.");
        setSaved(payload.integrations);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const savedByType = useMemo(
    () => new Map(saved.map((integration) => [integration.type, integration])),
    [saved],
  );

  const filtered = catalog.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!search || item.name.toLowerCase().includes(search.toLowerCase())),
  );

  const openConfiguration = (item: CatalogItem) => {
    const current = savedByType.get(item.id);
    setSelected(item);
    setApiKey("");
    setBaseUrl(current?.config?.baseUrl ?? "");
    setError("");
  };

  const saveIntegration = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selected.id,
          name: selected.name,
          status: "connected",
          apiKey: apiKey || undefined,
          baseUrl,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar a integração.");
      setSaved((current) => [
        ...current.filter((integration) => integration.type !== selected.id),
        payload.integration,
      ]);
      setSelected(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar integração.");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (integration: SavedIntegration) => {
    if (!window.confirm(`Desconectar ${integration.name}?`)) return;
    const response = await fetch(`/api/integrations?id=${integration.id}`, { method: "DELETE" });
    if (response.ok) setSaved((current) => current.filter((item) => item.id !== integration.id));
  };

  const connectedCount = saved.filter((item) => item.status === "connected").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrações</h1>
          <p className="text-sm text-zinc-500 mt-1">Conecte provedores de IA, voz, pagamento e automação</p>
        </div>
        <span className="text-sm text-zinc-400">{connectedCount}/{catalog.length} conectadas</span>
      </div>

      {error && !selected && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="oz-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-emerald-400" />
          </div>
          <div><p className="text-2xl font-bold text-white">{connectedCount}</p><p className="text-xs text-zinc-500">Conectadas</p></div>
        </div>
        <div className="oz-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-zinc-400" />
          </div>
          <div><p className="text-2xl font-bold text-white">{catalog.length}</p><p className="text-xs text-zinc-500">Disponíveis</p></div>
        </div>
        <div className="oz-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div><p className="text-2xl font-bold text-white">{saved.filter((item) => ["openrouter", "openai", "gemini", "claude", "deepseek", "groq", "dify"].includes(item.type)).length}</p><p className="text-xs text-zinc-500">Provedores de IA</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar integrações..." className="w-full h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300">
          <option value="all">Todas as categorias</option>
          {categories.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : (
        categories.map((group) => {
          const items = filtered.filter((item) => item.category === group.name);
          if (!items.length) return null;
          return (
            <section key={group.name} className="space-y-4">
              <div className="flex items-center gap-3">
                <group.icon className={`w-5 h-5 ${group.color}`} />
                <h2 className="text-lg font-medium text-white">{group.name}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const integration = savedByType.get(item.id);
                  const status = statusConfig[integration?.status ?? "disconnected"];
                  return (
                    <article key={item.id} className="oz-card rounded-xl p-5">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-zinc-300" />
                          </div>
                          <div><h3 className="text-sm font-medium text-white">{item.name}</h3><p className="text-xs text-zinc-500">{item.description}</p></div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs ${status.color}`}>
                          <status.icon className="w-3 h-3" />{status.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openConfiguration(item)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                          <Settings className="w-4 h-4" /><span className="text-xs">{integration ? "Configurar" : "Conectar"}</span>
                        </button>
                        {integration && (
                          <button type="button" onClick={() => void disconnect(integration)} aria-label={`Desconectar ${item.name}`} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={saveIntegration} className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div><h2 className="text-lg font-semibold text-white">{selected.name}</h2><p className="text-sm text-zinc-500">A chave fica guardada somente no servidor.</p></div>
              <button type="button" onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Chave da API</label>
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={savedByType.has(selected.id) ? "Deixe vazio para manter a chave atual" : "Cole a chave da integração"} required={!savedByType.has(selected.id)} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-2">URL personalizada (opcional)</label>
              <input type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.exemplo.com" className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button disabled={saving} className="w-full h-10 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar integração"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
