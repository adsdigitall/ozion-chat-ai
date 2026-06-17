"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Tag,
  Grid3X3,
  List,
  LayoutGrid,
  Loader2,
  Trash2,
  Edit,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tags: string[] | null;
  status: string;
  origin: string | null;
  campaign: string | null;
  score: number;
  temperature: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "Novo Lead",
  interested: "Interessado",
  qualified: "Qualificado",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
  risk: "Risco",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  interested: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  qualified: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  proposal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
  risk: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  status: "new",
  origin: "",
  campaign: "",
  tags: "",
  score: 50,
  temperature: "warm",
};

type ContactForm = typeof emptyForm;
type ContactFormTextKey = Exclude<keyof ContactForm, "score">;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "pipeline">("list");
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("search") ?? ""
  );
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchContacts() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts?limit=100", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar contatos");
      setContacts(result.contacts || []);
    } catch (error) {
      setError(errorMessage(error, "Falha ao carregar contatos"));
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchContacts(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(searchQuery);
      const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchQuery, selectedStatus]);

  const kanbanColumns = [
    { id: "new", label: "Novos Leads", contacts: filteredContacts.filter((c) => c.status === "new") },
    { id: "interested", label: "Interessados", contacts: filteredContacts.filter((c) => c.status === "interested") },
    { id: "qualified", label: "Qualificados", contacts: filteredContacts.filter((c) => c.status === "qualified") },
    { id: "proposal", label: "Proposta", contacts: filteredContacts.filter((c) => c.status === "proposal") },
    { id: "won", label: "Ganhos", contacts: filteredContacts.filter((c) => c.status === "won") },
  ];

  function initials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  function openCreate() {
    setEditingContact(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      city: contact.city || "",
      state: contact.state || "",
      status: contact.status || "new",
      origin: contact.origin || "",
      campaign: contact.campaign || "",
      tags: (contact.tags || []).join(", "),
      score: contact.score || 50,
      temperature: contact.temperature || "warm",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Nome e telefone são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone,
        city: form.city || null,
        state: form.state || null,
        status: form.status,
        origin: form.origin || null,
        campaign: form.campaign || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        score: Number(form.score),
        temperature: form.temperature,
      };

      if (editingContact) {
        const response = await fetch(`/api/contacts?id=${editingContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao atualizar contato");
      } else {
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao criar contato");
      }

      setShowModal(false);
      await fetchContacts();
    } catch (error) {
      setError(errorMessage(error, "Falha ao salvar contato"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    try {
      const response = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao excluir contato");
      }
      await fetchContacts();
    } catch (error) {
      setError(errorMessage(error, "Falha ao excluir contato"));
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const response = await fetch(`/api/contacts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao atualizar status");
      await fetchContacts();
    } catch (error) {
      setError(errorMessage(error, "Falha ao atualizar status"));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="text-sm text-zinc-500 mt-1">{contacts.length} contatos cadastrados</p>
        </div>
        <button onClick={openCreate} className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Novo Contato
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar contatos..." className="w-full h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          <option value="all">Todos os Status</option>
          <option value="new">Novo Lead</option>
          <option value="interested">Interessado</option>
          <option value="qualified">Qualificado</option>
          <option value="proposal">Proposta</option>
          <option value="won">Ganho</option>
          <option value="lost">Perdido</option>
        </select>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("kanban")} className={`p-1.5 rounded ${viewMode === "kanban" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("pipeline")} className={`p-1.5 rounded ${viewMode === "pipeline" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}><Grid3X3 className="w-4 h-4" /></button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>}

      {!loading && viewMode === "list" && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Contato</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Telefone</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Localização</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Origem</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Score</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Temperatura</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tags</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center"><span className="text-sm font-medium text-zinc-300">{initials(contact.name)}</span></div><div><p className="text-sm font-medium text-white">{contact.name}</p><p className="text-xs text-zinc-500 flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email || "—"}</p></div></div></td>
                    <td className="py-3 px-4 text-sm text-zinc-300"><div className="flex items-center gap-2"><Phone className="w-3 h-3 text-zinc-500" />{contact.phone || "—"}</div></td>
                    <td className="py-3 px-4 text-sm text-zinc-300"><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-zinc-500" />{contact.city ? `${contact.city}${contact.state ? `, ${contact.state}` : ""}` : "—"}</div></td>
                    <td className="py-3 px-4"><button onClick={() => handleStatusChange(contact.id, contact.status === "new" ? "interested" : "new")} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[contact.status] || statusColors.new}`}>{statusLabels[contact.status] || contact.status}</button></td>
                    <td className="py-3 px-4 text-sm text-zinc-300">{contact.origin || "—"}</td>
                    <td className="py-3 px-4 text-sm font-medium text-white">{contact.score}</td>
                    <td className="py-3 px-4 text-sm text-zinc-300">{contact.temperature}</td>
                    <td className="py-3 px-4"><div className="flex flex-wrap gap-1">{(contact.tags || []).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400"><Tag className="w-2.5 h-2.5 inline mr-1" />{tag}</span>)}</div></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-1"><button onClick={() => openEdit(contact)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(contact.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && viewMode !== "list" && (
        <div className={viewMode === "kanban" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4" : "grid grid-cols-1 gap-4"}>
          {kanbanColumns.map((column) => (
            <div key={column.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">{column.label}</h3>
                <span className="text-xs text-zinc-500">{column.contacts.length}</span>
              </div>
              <div className="space-y-3">
                {column.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{contact.name}</p>
                      <button className="text-zinc-500 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{contact.email || contact.phone || "Sem contato"}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Score {contact.score}</span>
                      <button onClick={() => openEdit(contact)} className="text-xs text-emerald-400 hover:text-emerald-300">Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-medium">{editingContact ? "Editar contato" : "Novo contato"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">×</button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ["name", "Nome"], ["email", "E-mail"], ["phone", "Telefone"], ["city", "Cidade"], ["state", "Estado"], ["origin", "Origem"], ["campaign", "Campanha"], ["tags", "Tags (separadas por vírgula)"],
              ] as Array<[ContactFormTextKey, string]>).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-xs text-zinc-500 mb-2">{label}</span>
                  <input value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </label>
              ))}
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-2">Status</span>
                <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  {Object.keys(statusLabels).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-2">Temperatura</span>
                <select value={form.temperature} onChange={(e) => setForm((s) => ({ ...s, temperature: e.target.value }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="block text-xs text-zinc-500 mb-2">Score</span>
                <input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm((s) => ({ ...s, score: Number(e.target.value) }))} className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="h-10 px-4 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-10 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
