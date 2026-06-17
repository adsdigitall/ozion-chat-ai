"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, DollarSign, Loader2, Pencil, Plus, Search, ShoppingBag, Trash2, X, XCircle, type LucideIcon } from "lucide-react";

type Sale = {
  id: string;
  amount: number;
  platform: string | null;
  status: "completed" | "refunded" | "pending";
  product: string | null;
  external_id: string | null;
  created_at: string;
  contact: { id: string; name: string; phone: string | null; email: string | null } | null;
};

type ContactOption = { id: string; name: string; phone: string | null };

const emptyForm = {
  contact_id: "",
  product: "",
  amount: "",
  platform: "Stripe",
  status: "completed" as Sale["status"],
  external_id: "",
};

const statusMeta = {
  completed: { label: "Pago", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-400" },
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-500/10 text-amber-400" },
  refunded: { label: "Reembolsado", icon: XCircle, className: "bg-red-500/10 text-red-400" },
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [editing, setEditing] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [salesResponse, contactsResponse] = await Promise.all([
        fetch("/api/sales", { cache: "no-store" }),
        fetch("/api/contacts?limit=100", { cache: "no-store" }),
      ]);
      const salesResult = await salesResponse.json();
      const contactsResult = await contactsResponse.json();
      if (!salesResponse.ok) throw new Error(salesResult.error || "Falha ao carregar vendas.");
      if (!contactsResponse.ok) throw new Error(contactsResult.error || "Falha ao carregar contatos.");
      setSales(salesResult.sales ?? []);
      setContacts(contactsResult.contacts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar vendas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const platforms = useMemo(() => [...new Set(sales.map((sale) => sale.platform).filter((value): value is string => Boolean(value)))], [sales]);
  const filtered = useMemo(() => sales.filter((sale) => {
    const term = search.toLowerCase();
    const matchesSearch = !term || sale.contact?.name.toLowerCase().includes(term) || sale.product?.toLowerCase().includes(term);
    return matchesSearch && (platform === "all" || sale.platform === platform);
  }), [platform, sales, search]);

  const completed = sales.filter((sale) => sale.status === "completed");
  const revenue = completed.reduce((sum, sale) => sum + Number(sale.amount), 0);
  const refunds = sales.filter((sale) => sale.status === "refunded").length;
  const average = completed.length ? revenue / completed.length : 0;
  const stats: Array<{ label: string; value: number; currency: boolean; icon: LucideIcon }> = [
    { label: "Receita total", value: revenue, currency: true, icon: DollarSign },
    { label: "Ticket médio", value: average, currency: true, icon: ShoppingBag },
    { label: "Vendas pagas", value: completed.length, currency: false, icon: CheckCircle2 },
    { label: "Reembolsos", value: refunds, currency: false, icon: XCircle },
  ];

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(sale: Sale) {
    setEditing(sale);
    setForm({
      contact_id: sale.contact?.id ?? "",
      product: sale.product ?? "",
      amount: String(sale.amount),
      platform: sale.platform ?? "Stripe",
      status: sale.status,
      external_id: sale.external_id ?? "",
    });
    setShowModal(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/sales${editing ? `?id=${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact_id: form.contact_id || null,
          external_id: form.external_id || null,
          amount: Number(form.amount),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar venda.");
      setShowModal(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar venda.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir esta venda?")) return;
    const response = await fetch(`/api/sales?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Falha ao excluir venda.");
      return;
    }
    await loadData();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Vendas</h1><p className="mt-1 text-sm text-zinc-500">Receita e pagamentos do workspace</p></div>
        <button onClick={openCreate} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600"><Plus className="h-4 w-4" />Nova venda</button>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, currency, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Icon className="mb-4 h-5 w-5 text-emerald-400" />
            <p className="text-2xl font-bold text-white">{currency ? `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : value}</p>
            <p className="mt-1 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <label className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vendas..." className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none" /></label>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300"><option value="all">Todas as plataformas</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        {loading ? <Loader2 className="mx-auto my-20 h-6 w-6 animate-spin text-emerald-400" /> : (
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500"><th className="p-4">Contato</th><th>Produto</th><th>Valor</th><th>Plataforma</th><th>Status</th><th>Data</th><th /></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((sale) => {
                const meta = statusMeta[sale.status];
                const Icon = meta.icon;
                return <tr key={sale.id} className="hover:bg-zinc-800/30"><td className="p-4 text-sm text-white">{sale.contact?.name ?? "Sem contato"}</td><td className="text-sm text-zinc-300">{sale.product}</td><td className="font-medium text-emerald-400">R$ {Number(sale.amount).toLocaleString("pt-BR")}</td><td className="text-sm text-zinc-300">{sale.platform}</td><td><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span></td><td className="text-sm text-zinc-500">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</td><td><button onClick={() => openEdit(sale)} className="p-2 text-zinc-500 hover:text-white"><Pencil className="h-4 w-4" /></button><button onClick={() => void remove(sale.id)} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td></tr>;
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form onSubmit={save} className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5"><h2 className="font-semibold text-white">{editing ? "Editar venda" : "Nova venda"}</h2><button type="button" onClick={() => setShowModal(false)}><X className="h-5 w-5 text-zinc-500" /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label><span className="mb-2 block text-xs text-zinc-500">Contato</span><select value={form.contact_id} onChange={(event) => setForm((current) => ({ ...current, contact_id: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white"><option value="">Sem contato</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>
              <label><span className="mb-2 block text-xs text-zinc-500">Produto</span><input required value={form.product} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" /></label>
              <label><span className="mb-2 block text-xs text-zinc-500">Valor</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" /></label>
              <label><span className="mb-2 block text-xs text-zinc-500">Plataforma</span><input required value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" /></label>
              <label><span className="mb-2 block text-xs text-zinc-500">Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Sale["status"] }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white"><option value="completed">Pago</option><option value="pending">Pendente</option><option value="refunded">Reembolsado</option></select></label>
              <label><span className="mb-2 block text-xs text-zinc-500">ID externo</span><input value={form.external_id} onChange={(event) => setForm((current) => ({ ...current, external_id: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-800 p-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300">Cancelar</button><button disabled={saving} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
