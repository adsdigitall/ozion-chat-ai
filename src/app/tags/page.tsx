"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Edit, Loader2, Plus, RotateCcw, Search, Tag, Trash2, X } from "lucide-react";
import { ActionButton, EmptyState, FilterSelect, MetricCard, Modal, PageHeader, SearchInput, StatusBadge } from "@/components/ui/ozion-design-system";

type TagStatus = "active" | "inactive";
type TagCategory = "Funil" | "Origem" | "Pagamento" | "Atendimento" | "Risco" | "Produto" | "Campanha";
type ToastState = { type: "success" | "error"; message: string } | null;

type TagRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  category: TagCategory;
  description: string | null;
  status: TagStatus;
  contacts_count: number;
  conversations_count: number;
  created_at: string;
};

const EMPTY_FORM = {
  name: "",
  color: "#10b981",
  category: "Funil" as TagCategory,
  description: "",
  status: "active" as TagStatus,
};

const categories: TagCategory[] = ["Funil", "Origem", "Pagamento", "Atendimento", "Risco", "Produto", "Campanha"];
const swatches = ["#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#a855f7", "#f59e0b", "#f97316", "#ef4444", "#71717a"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className={`fixed right-4 top-4 z-[80] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>
      {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
      <p>{toast.message}</p>
      <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
    </div>
  );
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [modal, setModal] = useState<"tag" | "delete" | null>(null);
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [selected, setSelected] = useState<TagRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ search: "", category: "all", status: "all" });

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      const response = await fetch(`/api/tags?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar etiquetas.");
      setTags(payload.tags ?? []);
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao carregar etiquetas."));
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTags(), 220);
    return () => window.clearTimeout(timer);
  }, [loadTags]);

  const stats = useMemo(() => {
    const active = tags.filter((item) => item.status === "active").length;
    const appliedContacts = tags.reduce((sum, item) => sum + Number(item.contacts_count ?? 0), 0);
    const appliedConversations = tags.reduce((sum, item) => sum + Number(item.conversations_count ?? 0), 0);
    return { total: tags.length, active, appliedContacts, appliedConversations };
  }, [tags]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal("tag");
  }

  function openEdit(tag: TagRow) {
    setEditing(tag);
    setForm({
      name: tag.name,
      color: tag.color,
      category: tag.category,
      description: tag.description ?? "",
      status: tag.status,
    });
    setModal("tag");
  }

  async function saveTag() {
    if (!form.name.trim()) {
      showToast("error", "Informe o nome da etiqueta.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/tags${editing ? `?id=${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao salvar etiqueta.");
      setModal(null);
      showToast("success", editing ? "Etiqueta atualizada." : "Etiqueta criada.");
      await loadTags();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao salvar etiqueta."));
    } finally {
      setSaving(false);
    }
  }

  async function duplicateTag(tag: TagRow) {
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", id: tag.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao duplicar etiqueta.");
      showToast("success", "Etiqueta duplicada.");
      await loadTags();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao duplicar etiqueta."));
    }
  }

  async function deleteTag() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tags?id=${selected.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Falha ao excluir etiqueta.");
      }
      setModal(null);
      showToast("success", "Etiqueta excluída e removida dos vínculos.");
      await loadTags();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao excluir etiqueta."));
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-defaults" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao criar etiquetas padrão.");
      showToast("success", "Etiquetas padrão conferidas.");
      await loadTags();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao criar etiquetas padrão."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <PageHeader
        title="Tags / Etiquetas"
        description="Etiquetas globais para CRM, chat, filtros, fluxos e automações."
        actions={
          <>
            <ActionButton variant="secondary" onClick={seedDefaults} disabled={saving}><RotateCcw className="mr-2 inline h-4 w-4" />Tags padrão</ActionButton>
            <ActionButton onClick={openCreate}><Plus className="mr-2 inline h-4 w-4" />Criar Tag</ActionButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Tag} label="Total de tags" value={stats.total} detail="No workspace atual" />
        <MetricCard icon={CheckCircle2} label="Ativas" value={stats.active} detail="Disponíveis para uso" />
        <MetricCard icon={Search} label="Em contatos" value={stats.appliedContacts} detail="Aplicações no CRM" />
        <MetricCard icon={Copy} label="Em conversas" value={stats.appliedConversations} detail="Aplicações no chat" />
      </div>

      <div className="oz-card rounded-xl p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <SearchInput placeholder="Buscar tag, categoria ou descrição" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <FilterSelect value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
            <option value="all">Todas categorias</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </FilterSelect>
          <FilterSelect value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="all">Todos status</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </FilterSelect>
          <ActionButton variant="ghost" onClick={() => setFilters({ search: "", category: "all", status: "all" })}>Limpar filtros</ActionButton>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div>
      ) : tags.length === 0 ? (
        <EmptyState icon={Tag} title="Nenhuma etiqueta encontrada" description="Crie uma nova etiqueta ou restaure as etiquetas padrão do workspace." action={<ActionButton onClick={openCreate}>Criar Tag</ActionButton>} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/70">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="p-4">Nome</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Contatos</th>
                <th className="p-4">Conversas</th>
                <th className="p-4">Status</th>
                <th className="p-4">Criada em</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-zinc-900 last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3.5 w-3.5 rounded-full shadow-[0_0_18px_currentColor]" style={{ backgroundColor: tag.color, color: tag.color }} />
                      <div>
                        <p className="font-black text-white">{tag.name}</p>
                        <p className="text-xs text-zinc-600">{tag.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-zinc-300">{tag.category}</td>
                  <td className="max-w-sm p-4 text-zinc-500">{tag.description || "Sem descrição"}</td>
                  <td className="p-4 font-bold text-white">{tag.contacts_count}</td>
                  <td className="p-4 font-bold text-white">{tag.conversations_count}</td>
                  <td className="p-4"><StatusBadge tone={tag.status === "active" ? "success" : "muted"}>{tag.status === "active" ? "Ativa" : "Inativa"}</StatusBadge></td>
                  <td className="p-4 text-zinc-500">{formatDate(tag.created_at)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(tag)} className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white" aria-label="Editar"><Edit className="h-4 w-4" /></button>
                      <button type="button" onClick={() => duplicateTag(tag)} className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white" aria-label="Duplicar"><Copy className="h-4 w-4" /></button>
                      <button type="button" onClick={() => { setSelected(tag); setModal("delete"); }} className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === "tag" && (
        <Modal title={editing ? "Editar Tag" : "Criar Tag"} description="A etiqueta fica disponível no CRM, chat, filtros, fluxos e automações." onClose={() => setModal(null)} footer={<><ActionButton variant="secondary" onClick={() => setModal(null)}>Cancelar</ActionButton><ActionButton disabled={saving} onClick={saveTag}>{saving ? "Salvando..." : "Salvar"}</ActionButton></>}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Nome</span>
              <SearchInput value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex: Lead VIP" className="w-full" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Categoria</span>
              <FilterSelect value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as TagCategory }))} className="w-full">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </FilterSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Status</span>
              <FilterSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TagStatus }))} className="w-full">
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </FilterSelect>
            </label>
            <div className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Cor</span>
              <div className="flex flex-wrap gap-2">
                {swatches.map((color) => (
                  <button key={color} type="button" onClick={() => setForm((current) => ({ ...current, color }))} className={`h-9 w-9 rounded-full border transition ${form.color === color ? "border-white ring-2 ring-emerald-400" : "border-zinc-700"}`} style={{ backgroundColor: color }} aria-label={`Usar cor ${color}`} />
                ))}
                <input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-9 w-12 rounded border border-zinc-700 bg-zinc-950" />
              </div>
            </div>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">Descrição</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Uso interno da etiqueta" className="oz-input w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50" />
            </label>
          </div>
        </Modal>
      )}

      {modal === "delete" && selected && (
        <Modal title="Excluir Tag" description={selected.contacts_count || selected.conversations_count ? `Esta tag está aplicada em ${selected.contacts_count} contatos e ${selected.conversations_count} conversas. Deseja remover mesmo assim?` : "Esta etiqueta será removida permanentemente."} onClose={() => setModal(null)} footer={<><ActionButton variant="secondary" onClick={() => setModal(null)}>Cancelar</ActionButton><ActionButton variant="danger" disabled={saving} onClick={deleteTag}>{saving ? "Excluindo..." : "Excluir"}</ActionButton></>}>
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>A exclusão remove também a associação da etiqueta em contatos e conversas. Os contatos e conversas continuam preservados.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
