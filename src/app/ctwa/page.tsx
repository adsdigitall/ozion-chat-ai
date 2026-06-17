"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "completed";
  budget: number;
  spent: number;
  leads: number;
  purchases: number;
  cpa: number;
  roi: number;
  roas: number;
  external_id?: string | null;
};

type Connection = {
  id: string;
  status: string;
  adAccountId: string;
  pixelId: string;
  testEventCode: string;
  lastSyncAt: string | null;
  lastError: string | null;
};

const statusStyles = {
  active: "bg-emerald-500/10 text-emerald-400",
  paused: "bg-amber-500/10 text-amber-400",
  completed: "bg-zinc-500/10 text-zinc-400",
};

export default function CTWAPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    accessToken: "",
    adAccountId: "",
    pixelId: "",
    testEventCode: "",
  });
  const [testEvent, setTestEvent] = useState({ phone: "", value: "", currency: "BRL" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [campaignResponse, configResponse] = await Promise.all([
        fetch("/api/campaigns", { cache: "no-store" }),
        fetch("/api/ctwa/config", { cache: "no-store" }),
      ]);
      const campaignPayload = await campaignResponse.json();
      const configPayload = await configResponse.json();
      if (!campaignResponse.ok) throw new Error(campaignPayload.error ?? "Falha ao carregar campanhas.");
      if (!configResponse.ok) throw new Error(configPayload.error ?? "Falha ao carregar conexão Meta.");
      setCampaigns(campaignPayload.campaigns ?? []);
      setConnection(configPayload.connection);
      if (configPayload.connection) {
        setForm((current) => ({
          ...current,
          adAccountId: configPayload.connection.adAccountId ?? "",
          pixelId: configPayload.connection.pixelId ?? "",
          testEventCode: configPayload.connection.testEventCode ?? "",
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar CTWA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.platform === "meta" &&
          (!search || campaign.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [campaigns, search],
  );

  const totals = useMemo(
    () =>
      visibleCampaigns.reduce(
        (total, campaign) => ({
          leads: total.leads + Number(campaign.leads),
          purchases: total.purchases + Number(campaign.purchases),
          spent: total.spent + Number(campaign.spent),
          weightedRoas: total.weightedRoas + Number(campaign.roas) * Number(campaign.spent),
        }),
        { leads: 0, purchases: 0, spent: 0, weightedRoas: 0 },
      ),
    [visibleCampaigns],
  );

  const connectMeta = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/ctwa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível conectar a Meta.");
      setModal(false);
      setForm((current) => ({ ...current, accessToken: "" }));
      setMessage("Conta Meta validada e conectada.");
      await load();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Falha ao conectar.");
    } finally {
      setWorking(false);
    }
  };

  const synchronize = async () => {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/ctwa/sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao sincronizar.");
      setMessage(`${payload.synchronized} campanhas sincronizadas com a Meta.`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Falha ao sincronizar.");
    } finally {
      setWorking(false);
    }
  };

  const sendTestEvent = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/ctwa/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testEvent),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao enviar evento.");
      setTestModal(false);
      setMessage("Evento de compra enviado para a Meta.");
    } catch (eventError) {
      setError(eventError instanceof Error ? eventError.message : "Falha ao enviar evento.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  const averageRoas = totals.spent > 0 ? totals.weightedRoas / totals.spent : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CTWA</h1>
          <p className="text-sm text-zinc-500 mt-1">Campanhas Click-to-WhatsApp e conversões oficiais da Meta</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {connection && (
            <>
              <button type="button" onClick={() => setTestModal(true)} className="h-9 px-3 border border-zinc-700 rounded-lg text-sm text-zinc-300 flex items-center gap-2 hover:bg-zinc-800"><Send className="w-4 h-4" />Testar conversão</button>
              <button type="button" onClick={() => void synchronize()} disabled={working} className="h-9 px-3 border border-zinc-700 rounded-lg text-sm text-zinc-300 flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${working ? "animate-spin" : ""}`} />Sincronizar</button>
            </>
          )}
          <button type="button" onClick={() => setModal(true)} className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"><ExternalLink className="w-4 h-4" />{connection ? "Reconfigurar Meta" : "Conectar Meta"}</button>
        </div>
      </div>

      {connection ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="w-4 h-4" />Meta conectada: conta <strong>act_{connection.adAccountId}</strong> e Pixel <strong>{connection.pixelId}</strong></div>
          <span className="text-xs text-zinc-500">{connection.lastSyncAt ? `Última sincronização: ${new Date(connection.lastSyncAt).toLocaleString("pt-BR")}` : "Ainda não sincronizada"}</span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Conecte uma conta de anúncios Meta e um Pixel para remover dados manuais e ativar conversões.</div>
      )}
      {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Metric icon={Users} value={String(totals.leads)} label="Leads atribuídos" color="text-blue-400" />
        <Metric icon={ShoppingBag} value={String(totals.purchases)} label="Compras atribuídas" color="text-emerald-400" />
        <Metric icon={DollarSign} value={totals.spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} label="Investimento" color="text-amber-400" />
        <Metric icon={TrendingUp} value={`${averageRoas.toFixed(2)}x`} label="ROAS médio" color="text-purple-400" />
      </div>

      <label className="relative block max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar campanhas Meta..." className="w-full h-9 pl-10 pr-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" />
      </label>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800"><th className="text-left p-4 text-xs text-zinc-500 uppercase">Campanha</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Estado</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Orçamento</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Gasto</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Leads</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Compras</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">CPA</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">ROAS</th></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {visibleCampaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="p-4"><p className="text-sm font-medium text-white">{campaign.name}</p><p className="text-xs text-zinc-500">{campaign.external_id ? `Meta ${campaign.external_id}` : "Cadastro manual"}</p></td>
                <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${statusStyles[campaign.status]}`}>{campaign.status === "active" ? "Ativa" : campaign.status === "paused" ? "Pausada" : "Concluída"}</span></td>
                <td className="p-4 text-sm text-zinc-300">{Number(campaign.budget).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-4 text-sm text-zinc-300">{Number(campaign.spent).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-4 text-sm text-zinc-300">{campaign.leads}</td>
                <td className="p-4 text-sm text-zinc-300">{campaign.purchases}</td>
                <td className="p-4 text-sm text-zinc-300">{Number(campaign.cpa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-4 text-sm text-emerald-400">{Number(campaign.roas).toFixed(2)}x</td>
              </tr>
            ))}
            {!visibleCampaigns.length && <tr><td colSpan={8} className="p-12 text-center text-sm text-zinc-500">{connection ? "Clique em Sincronizar para importar suas campanhas." : "Nenhuma campanha Meta conectada."}</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Conectar Meta CTWA" description="Use um token com acesso à conta de anúncios e ao Pixel." onClose={() => setModal(false)}>
          <form onSubmit={connectMeta} className="space-y-4">
            <Field label="Token de acesso Meta" type="password" value={form.accessToken} onChange={(value) => setForm((current) => ({ ...current, accessToken: value }))} required />
            <Field label="ID da conta de anúncios" value={form.adAccountId} onChange={(value) => setForm((current) => ({ ...current, adAccountId: value }))} placeholder="act_123456789" required />
            <Field label="ID do Pixel / Dataset" value={form.pixelId} onChange={(value) => setForm((current) => ({ ...current, pixelId: value }))} required />
            <Field label="Código de evento de teste (opcional)" value={form.testEventCode} onChange={(value) => setForm((current) => ({ ...current, testEventCode: value }))} />
            <button disabled={working} className="w-full h-10 bg-emerald-500 text-white rounded-lg disabled:opacity-50">{working ? "Validando na Meta..." : "Validar e conectar"}</button>
          </form>
        </Modal>
      )}

      {testModal && (
        <Modal title="Testar conversão" description="Envia um evento Purchase para o Pixel configurado." onClose={() => setTestModal(false)}>
          <form onSubmit={sendTestEvent} className="space-y-4">
            <Field label="Telefone do cliente" value={testEvent.phone} onChange={(value) => setTestEvent((current) => ({ ...current, phone: value }))} placeholder="+55..." required />
            <Field label="Valor da compra" type="number" value={testEvent.value} onChange={(value) => setTestEvent((current) => ({ ...current, value }))} required />
            <Field label="Moeda" value={testEvent.currency} onChange={(value) => setTestEvent((current) => ({ ...current, currency: value.toUpperCase() }))} required />
            <button disabled={working} className="w-full h-10 bg-emerald-500 text-white rounded-lg disabled:opacity-50">{working ? "Enviando..." : "Enviar evento"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Metric({ icon: Icon, value, label, color }: { icon: typeof Users; value: string; label: string; color: string }) {
  return <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"><Icon className={`w-5 h-5 ${color} mb-4`} /><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm text-zinc-500 mt-1">{label}</p></div>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6"><div className="flex items-start justify-between mb-5"><div><h2 className="text-lg font-semibold text-white">{title}</h2><p className="text-sm text-zinc-500 mt-1">{description}</p></div><button type="button" onClick={onClose}><X className="w-5 h-5 text-zinc-500" /></button></div>{children}</div></div>;
}

function Field({ label, value, onChange, type = "text", placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block"><span className="block text-sm text-zinc-300 mb-2">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" /></label>;
}
