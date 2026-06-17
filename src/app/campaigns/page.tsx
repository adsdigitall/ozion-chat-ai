"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  DollarSign,
  Loader2,
  Megaphone,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import type { Campaign } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

type CampaignRow = Campaign;
type DialogMode = "create" | "edit" | "delete" | null;

type CampaignFormState = {
  name: string;
  platform: Campaign["platform"];
  status: Campaign["status"];
  budget: string;
  spent: string;
  leads: string;
  purchases: string;
  roi: string;
  roas: string;
};

type CampaignStats = {
  active: number;
  budget: number;
  spent: number;
  leads: number;
  purchases: number;
  roiAverage: number;
  cpaAverage: number;
};

const PLATFORM_META: Record<string, { label: string; pill: string; dot: string }> = {
  meta: { label: "Meta", pill: "bg-blue-500/10 text-blue-300 border border-blue-500/20", dot: "bg-blue-400" },
  google: { label: "Google", pill: "bg-red-500/10 text-red-300 border border-red-500/20", dot: "bg-red-400" },
  tiktok: { label: "TikTok", pill: "bg-pink-500/10 text-pink-300 border border-pink-500/20", dot: "bg-pink-400" },
};

const STATUS_META: Record<Campaign["status"], { label: string; pill: string; dot: string }> = {
  active: { label: "Ativa", pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-400" },
  paused: { label: "Pausada", pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dot: "bg-amber-400" },
  completed: { label: "Concluída", pill: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20", dot: "bg-zinc-500" },
};

const EMPTY_FORM: CampaignFormState = {
  name: "",
  platform: "meta",
  status: "active",
  budget: "0",
  spent: "0",
  leads: "0",
  purchases: "0",
  roi: "0",
  roas: "0",
};

type CampaignFormKey = keyof CampaignFormState;

function StatCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: React.ReactNode; color: "blue" | "amber" | "emerald" | "purple" }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    purple: "bg-purple-500/10 text-purple-400",
  } as const;
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4"><div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}><Icon className="w-5 h-5" /></div></div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/campaigns", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao carregar campanhas");
        if (mounted) setCampaigns(result.campaigns || []);
      } catch (loadError) {
        if (mounted) {
          setCampaigns([]);
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar campanhas");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }, 0);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, []);

  const stats: CampaignStats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active").length;
    const budget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
    const spent = campaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0);
    const leads = campaigns.reduce((sum, c) => sum + Number(c.leads || 0), 0);
    const purchases = campaigns.reduce((sum, c) => sum + Number(c.purchases || 0), 0);
    const roiAverage = campaigns.length ? campaigns.reduce((sum, c) => sum + Number(c.roi || 0), 0) / campaigns.length : 0;
    const cpaAverage = campaigns.length ? campaigns.reduce((sum, c) => sum + Number(c.cpa || 0), 0) / campaigns.length : 0;
    return { active, budget, spent, leads, purchases, roiAverage, cpaAverage };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => campaigns.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }), [campaigns, searchQuery, selectedStatus]);

  function openCreate() { setEditingCampaign(null); setForm(EMPTY_FORM); setDialogMode("create"); }
  function openEdit(campaign: CampaignRow) {
    setEditingCampaign(campaign);
    setForm({ name: campaign.name, platform: campaign.platform, status: campaign.status, budget: String(campaign.budget ?? 0), spent: String(campaign.spent ?? 0), leads: String(campaign.leads ?? 0), purchases: String(campaign.purchases ?? 0), roi: String(campaign.roi ?? 0), roas: String(campaign.roas ?? 0) });
    setDialogMode("edit");
  }
  function openDelete(campaign: CampaignRow) { setEditingCampaign(campaign); setDialogMode("delete"); }

  async function refresh() {
    try {
      const response = await fetch("/api/campaigns", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCampaigns(result.campaigns || []);
    } catch {
      setCampaigns([]);
    }
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        platform: form.platform,
        status: form.status,
        budget: Number(form.budget),
        spent: Number(form.spent),
        leads: Number(form.leads),
        purchases: Number(form.purchases),
        cpa: Number(form.purchases) > 0 ? Number(form.spent) / Number(form.purchases) : 0,
        roi: Number(form.roi),
        roas: Number(form.roas),
      };
      const response = await fetch(`/api/campaigns${editingCampaign ? `?id=${editingCampaign.id}` : ""}`, {
        method: editingCampaign ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar campanha");
      setDialogMode(null);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar campanha");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingCampaign) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns?id=${editingCampaign.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir campanha");
      }
      setDialogMode(null);
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Falha ao excluir campanha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie suas campanhas de marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Atualizar</button>
          <button onClick={openCreate} className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Nova Campanha</button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error} — exibindo dados de exemplo.</div>}
      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard icon={Megaphone} label="Campanhas Ativas" value={stats.active} color="blue" />
        <StatCard icon={DollarSign} label="Total Investido" value={`R$ ${stats.spent.toLocaleString("pt-BR")}`} color="amber" />
        <StatCard icon={Users} label="Total de Leads" value={stats.leads} color="emerald" />
        <StatCard icon={TrendingUp} label="Total de Vendas" value={stats.purchases} color="purple" />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="text" placeholder="Buscar campanhas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" /></div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="all">Todos os Status</option><option value="active">Ativas</option><option value="paused">Pausadas</option><option value="completed">Concluídas</option></select>
        <button className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"><Calendar className="w-4 h-4" /> Período</button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Campanha</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Orçamento</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Gasto</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Leads</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Compras</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">CPA</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">ROI</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredCampaigns.map((campaign) => {
                const platform = PLATFORM_META[campaign.platform] || PLATFORM_META.meta;
                const status = STATUS_META[campaign.status] || STATUS_META.active;
                return (
                  <tr key={campaign.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4"><div><p className="text-sm font-medium text-white">{campaign.name}</p><span className={`text-xs px-1.5 py-0.5 rounded-full ${platform.pill}`}>{platform.label}</span></div></td>
                    <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full ${status.pill}`}>{status.label}</span></td>
                    <td className="py-3 px-4 text-sm text-zinc-300">R$ {Number(campaign.budget || 0).toLocaleString("pt-BR")}</td>
                    <td className="py-3 px-4 text-sm text-zinc-300">R$ {Number(campaign.spent || 0).toLocaleString("pt-BR")}</td>
                    <td className="py-3 px-4 text-sm text-zinc-300">{campaign.leads}</td>
                    <td className="py-3 px-4 text-sm text-zinc-300">{campaign.purchases}</td>
                    <td className="py-3 px-4 text-sm text-zinc-300">R$ {Number(campaign.cpa || 0).toFixed(2)}</td>
                    <td className="py-3 px-4"><span className={`text-sm font-medium ${Number(campaign.roi || 0) >= 200 ? "text-emerald-400" : Number(campaign.roi || 0) >= 100 ? "text-amber-400" : "text-red-400"}`}>{Number(campaign.roi || 0)}%</span></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-1"><button onClick={() => openEdit(campaign)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"><PencilLine className="w-4 h-4" /></button><button onClick={() => openDelete(campaign)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-medium">{dialogMode === "create" ? "Nova campanha" : dialogMode === "edit" ? "Editar campanha" : "Excluir campanha"}</h3>
              <button onClick={() => setDialogMode(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {dialogMode === "delete" ? (
              <div className="p-5">
                <p className="text-zinc-300">Deseja excluir a campanha <span className="text-white font-medium">{editingCampaign?.name}</span>?</p>
                <div className="mt-5 flex items-center justify-end gap-3">
                  <button onClick={() => setDialogMode(null)} className="h-10 px-4 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900">Cancelar</button>
                  <button onClick={handleDelete} disabled={saving} className="h-10 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50">{saving ? "Excluindo..." : "Excluir"}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {([["name", "Nome"], ["budget", "Orçamento"], ["spent", "Gasto"], ["leads", "Leads"], ["purchases", "Compras"], ["roi", "ROI"], ["roas", "ROAS"]] as Array<[CampaignFormKey, string]>).map(([key, label]) => (
                  <label key={key} className="block"><span className="block text-xs text-zinc-500 mb-2">{label}</span><input value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" /></label>
                ))}
                <label className="block"><span className="block text-xs text-zinc-500 mb-2">Plataforma</span><select value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value as Campaign["platform"] }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="meta">Meta</option><option value="google">Google</option><option value="tiktok">TikTok</option></select></label>
                <label className="block"><span className="block text-xs text-zinc-500 mb-2">Status</span><select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as Campaign["status"] }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="active">Ativa</option><option value="paused">Pausada</option><option value="completed">Concluída</option></select></label>
                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2"><button type="button" onClick={() => setDialogMode(null)} className="h-10 px-4 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900">Cancelar</button><button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
