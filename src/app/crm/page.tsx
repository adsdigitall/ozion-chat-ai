"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Copy,
  Download,
  Edit,
  Eye,
  Filter,
  Funnel,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  ActionButton,
  EmptyState,
  FilterSelect,
  MetricCard,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  Tabs,
} from "@/components/ui/ozion-design-system";

type ContactStatus = "new" | "in_service" | "qualified" | "pix_sent" | "waiting_payment" | "paid" | "lost" | "risk";
type Temperature = "cold" | "warm" | "hot";
type ViewMode = "list" | "kanban" | "pipeline";
type ToastState = { type: "success" | "error"; message: string } | null;

type TagRow = { id: string; name: string; color: string; category?: string; status?: string };
type UserRow = { id: string; name: string; email: string; role?: string };
type CustomField = { id: string; name: string; type: "text" | "number" | "date" | "select" | "boolean" | "url"; options_json?: string[]; required?: boolean };
type CustomValue = { custom_field_id: string; value: unknown; field?: CustomField };
type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  status: ContactStatus;
  score: number;
  temperature: Temperature;
  source: string | null;
  channel: string | null;
  whatsapp_connection_id: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  creative_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  assigned_user_id: string | null;
  assigned_user?: UserRow | null;
  last_message: string | null;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
  ai_summary: string | null;
  tags: TagRow[];
  custom_values: CustomValue[];
};

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  user?: { name?: string; email?: string } | null;
};

const STATUS_META: Record<ContactStatus, { label: string; tone: "success" | "warning" | "danger" | "muted" | "info" }> = {
  new: { label: "Novo Lead", tone: "info" },
  in_service: { label: "Em Atendimento", tone: "warning" },
  qualified: { label: "Qualificado", tone: "success" },
  pix_sent: { label: "Pix Enviado", tone: "info" },
  waiting_payment: { label: "Aguardando Pagamento", tone: "warning" },
  paid: { label: "Pagou", tone: "success" },
  lost: { label: "Perdido", tone: "danger" },
  risk: { label: "Risco", tone: "danger" },
};

const TEMPERATURE_LABELS: Record<Temperature, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  status: "new" as ContactStatus,
  tags: "",
  score: 50,
  temperature: "warm" as Temperature,
  source: "",
  channel: "whatsapp",
  whatsapp_connection_id: "",
  campaign_id: "",
  adset_id: "",
  ad_id: "",
  creative_id: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  assigned_user_id: "",
  ai_summary: "",
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [modal, setModal] = useState<"contact" | "delete" | "details" | "fields" | "import" | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [fieldForm, setFieldForm] = useState({ id: "", name: "", type: "text" as CustomField["type"], options: "", required: false });
  const [importText, setImportText] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    tag: "all",
    status: "all",
    temperature: "all",
    source: "",
    channel: "",
    campaign_id: "",
    assigned_user_id: "all",
    min_score: "",
    max_score: "",
    date_from: "",
    date_to: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      params.set("limit", "200");
      const [contactsResponse, fieldsResponse, usersResponse, tagsResponse] = await Promise.all([
        fetch(`/api/contacts?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/crm/custom-fields", { cache: "no-store" }),
        fetch("/api/users?scope=customer", { cache: "no-store" }),
        fetch("/api/tags?status=active", { cache: "no-store" }),
      ]);
      const contactsPayload = await contactsResponse.json();
      const fieldsPayload = await fieldsResponse.json();
      const usersPayload = await usersResponse.json();
      const tagsPayload = await tagsResponse.json();
      if (!contactsResponse.ok) throw new Error(contactsPayload.error ?? "Falha ao carregar contatos.");
      setContacts(contactsPayload.contacts ?? []);
      setFields(fieldsPayload.fields ?? []);
      setUsers(usersResponse.ok ? usersPayload.users ?? [] : []);
      setTags(tagsResponse.ok ? tagsPayload.tags ?? [] : []);
    } catch (error) {
      setToast({ type: "error", message: errorMessage(error, "Erro ao carregar CRM.") });
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const stats = useMemo(() => {
    const paid = contacts.filter((contact) => contact.status === "paid").length;
    const hot = contacts.filter((contact) => contact.temperature === "hot").length;
    const avgScore = contacts.length ? Math.round(contacts.reduce((sum, contact) => sum + Number(contact.score ?? 0), 0) / contacts.length) : 0;
    return { total: contacts.length, paid, hot, avgScore };
  }, [contacts]);

  const pipeline = useMemo(() => {
    const max = Math.max(1, ...Object.keys(STATUS_META).map((status) => contacts.filter((contact) => contact.status === status).length));
    return Object.entries(STATUS_META).map(([status, meta]) => {
      const total = contacts.filter((contact) => contact.status === status).length;
      return { status: status as ContactStatus, ...meta, total, width: Math.max(10, Math.round((total / max) * 100)) };
    });
  }, [contacts]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCustomValues({});
    setModal("contact");
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setSelected(contact);
    setForm({
      name: contact.name ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      city: contact.city ?? "",
      state: contact.state ?? "",
      status: contact.status ?? "new",
      tags: contact.tags.map((tag) => tag.name).join(", "),
      score: Number(contact.score ?? 50),
      temperature: contact.temperature ?? "warm",
      source: contact.source ?? "",
      channel: contact.channel ?? "",
      whatsapp_connection_id: contact.whatsapp_connection_id ?? "",
      campaign_id: contact.campaign_id ?? "",
      adset_id: contact.adset_id ?? "",
      ad_id: contact.ad_id ?? "",
      creative_id: contact.creative_id ?? "",
      utm_source: contact.utm_source ?? "",
      utm_medium: contact.utm_medium ?? "",
      utm_campaign: contact.utm_campaign ?? "",
      utm_content: contact.utm_content ?? "",
      utm_term: contact.utm_term ?? "",
      assigned_user_id: contact.assigned_user_id ?? "",
      ai_summary: contact.ai_summary ?? "",
    });
    setCustomValues(Object.fromEntries(contact.custom_values.map((item) => [item.custom_field_id, String(item.value ?? "")])));
    setModal("contact");
  }

  async function openDetails(contact: Contact) {
    setSelected(contact);
    setModal("details");
    try {
      const response = await fetch(`/api/crm/timeline?contact_id=${contact.id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar histórico.");
      setTimeline(payload.events ?? []);
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao carregar histórico."));
      setTimeline([]);
    }
  }

  function payloadFromForm() {
    return {
      ...form,
      email: form.email || null,
      city: form.city || null,
      state: form.state || null,
      source: form.source || null,
      channel: form.channel || null,
      whatsapp_connection_id: form.whatsapp_connection_id || null,
      campaign_id: form.campaign_id || null,
      adset_id: form.adset_id || null,
      ad_id: form.ad_id || null,
      creative_id: form.creative_id || null,
      assigned_user_id: form.assigned_user_id || null,
      ai_summary: form.ai_summary || null,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      custom_fields: customValues,
    };
  }

  async function saveContact() {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast("error", "Nome e telefone são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/contacts${editing ? `?id=${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm()),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao salvar contato.");
      setModal(null);
      showToast("success", editing ? "Contato atualizado." : "Contato criado.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao salvar contato."));
    } finally {
      setSaving(false);
    }
  }

  async function duplicateContact(contact: Contact) {
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", id: contact.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao duplicar contato.");
      showToast("success", "Contato duplicado.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao duplicar contato."));
    }
  }

  async function deleteContact() {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/contacts?id=${selected.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Falha ao excluir contato.");
      }
      setModal(null);
      showToast("success", "Contato excluído.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao excluir contato."));
    } finally {
      setSaving(false);
    }
  }

  async function saveField() {
    if (!fieldForm.name.trim()) {
      showToast("error", "Informe o nome do campo.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/crm/custom-fields${fieldForm.id ? `?id=${fieldForm.id}` : ""}`, {
        method: fieldForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fieldForm.name,
          type: fieldForm.type,
          required: fieldForm.required,
          options_json: fieldForm.options.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao salvar campo.");
      setFieldForm({ id: "", name: "", type: "text", options: "", required: false });
      showToast("success", "Campo personalizado salvo.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao salvar campo."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(field: CustomField) {
    try {
      const response = await fetch(`/api/crm/custom-fields?id=${field.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Falha ao excluir campo.");
      }
      showToast("success", "Campo excluído.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao excluir campo."));
    }
  }

  async function importCsv() {
    const rows = importText.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    if (rows.length < 2) {
      showToast("error", "Cole um CSV com cabeçalho e ao menos um contato.");
      return;
    }
    setSaving(true);
    try {
      const imported = rows.slice(1).map((row) => row.split(",").map((cell) => cell.trim()));
      for (const row of imported) {
        if (!row[0] || !row[1]) continue;
        await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: row[0], phone: row[1], email: row[2] || null, status: "new", temperature: "cold", score: 0 }),
        });
      }
      setModal(null);
      setImportText("");
      showToast("success", "CSV importado.");
      await loadData();
    } catch (error) {
      showToast("error", errorMessage(error, "Falha ao importar CSV."));
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    params.set("export", "csv");
    window.open(`/api/contacts?${params.toString()}`, "_blank");
    showToast("success", "Exportação CSV iniciada.");
  }

  const filterControls = (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
      <SearchInput placeholder="Nome, telefone ou email" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
      <FilterSelect value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
        <option value="all">Todos os status</option>
        {Object.entries(STATUS_META).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
      </FilterSelect>
      <FilterSelect value={filters.temperature} onChange={(event) => setFilters((current) => ({ ...current, temperature: event.target.value }))}>
        <option value="all">Temperatura</option>
        <option value="cold">Frio</option>
        <option value="warm">Morno</option>
        <option value="hot">Quente</option>
      </FilterSelect>
      <FilterSelect value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}>
        <option value="all">Todas as tags</option>
        {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </FilterSelect>
      <SearchInput placeholder="Origem" value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} />
      <SearchInput placeholder="Canal" value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))} />
      <SearchInput placeholder="Campanha" value={filters.campaign_id} onChange={(event) => setFilters((current) => ({ ...current, campaign_id: event.target.value }))} />
      <FilterSelect value={filters.assigned_user_id} onChange={(event) => setFilters((current) => ({ ...current, assigned_user_id: event.target.value }))}>
        <option value="all">Todos atendentes</option>
        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
      </FilterSelect>
      <SearchInput type="number" placeholder="Score mín." value={filters.min_score} onChange={(event) => setFilters((current) => ({ ...current, min_score: event.target.value }))} />
      <SearchInput type="number" placeholder="Score máx." value={filters.max_score} onChange={(event) => setFilters((current) => ({ ...current, max_score: event.target.value }))} />
      <SearchInput type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
      <SearchInput type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <PageHeader
        title="CRM / Contatos"
        description="Leads, tags, funil, histórico e dados comerciais do workspace atual."
        actions={
          <>
            <ActionButton variant="secondary" onClick={() => setModal("fields")}><SlidersHorizontal className="mr-2 h-4 w-4" />Campos</ActionButton>
            <ActionButton variant="secondary" onClick={() => setModal("import")}><Upload className="mr-2 h-4 w-4" />Importar CSV</ActionButton>
            <ActionButton variant="secondary" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Exportar CSV</ActionButton>
            <ActionButton onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Criar Contato</ActionButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Users} label="Contatos" value={stats.total} detail="Base ativa" />
        <MetricCard icon={CheckCircle2} label="Pagaram" value={stats.paid} detail="Status pagou" />
        <MetricCard icon={AlertTriangle} label="Quentes" value={stats.hot} detail="Temperatura alta" />
        <MetricCard icon={Funnel} label="Score médio" value={stats.avgScore} detail="0 a 100" />
      </div>

      <section className="oz-card rounded-xl p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Filter className="h-4 w-4 text-emerald-300" />Filtros</div>
          <ActionButton variant="ghost" onClick={() => setFilters({ search: "", tag: "all", status: "all", temperature: "all", source: "", channel: "", campaign_id: "", assigned_user_id: "all", min_score: "", max_score: "", date_from: "", date_to: "" })}>Limpar filtros</ActionButton>
        </div>
        {filterControls}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={[{ id: "list", label: "Lista", icon: Search }, { id: "kanban", label: "Kanban", icon: Columns3 }, { id: "pipeline", label: "Pipeline", icon: Funnel }]} active={viewMode} onChange={(id) => setViewMode(id as ViewMode)} />
        <p className="text-sm font-semibold text-zinc-500">{contacts.length} resultado(s)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div>
      ) : contacts.length === 0 ? (
        <EmptyState title="Nenhum resultado encontrado" description="Ajuste os filtros ou crie o primeiro contato para este workspace." action={<ActionButton onClick={openCreate}>Criar Contato</ActionButton>} />
      ) : viewMode === "list" ? (
        <ContactTable contacts={contacts} onDetails={openDetails} onEdit={openEdit} onDuplicate={duplicateContact} onDelete={(contact) => { setSelected(contact); setModal("delete"); }} />
      ) : viewMode === "kanban" ? (
        <Kanban contacts={contacts} onEdit={openEdit} />
      ) : (
        <section className="oz-card rounded-xl p-5">
          <div className="space-y-4">
            {pipeline.map((step) => (
              <div key={step.status} className="grid gap-3 md:grid-cols-[180px_1fr_70px] md:items-center">
                <div className="text-sm font-bold text-white">{step.label}</div>
                <div className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  <div className="h-full rounded-lg bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.25)]" style={{ width: `${step.width}%` }} />
                </div>
                <div className="text-right text-sm font-black text-emerald-300">{step.total}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {modal === "contact" ? (
        <ContactModal
          title={editing ? "Editar Contato" : "Criar Contato"}
          form={form}
          fields={fields}
          users={users}
          customValues={customValues}
          saving={saving}
          onForm={setForm}
          onCustom={setCustomValues}
          onClose={() => setModal(null)}
          onSave={saveContact}
        />
      ) : null}

      {modal === "delete" && selected ? (
        <Modal title="Excluir contato" description="O contato será removido da listagem, mas ficará preservado no banco como soft delete." onClose={() => setModal(null)} footer={<><ActionButton variant="secondary" onClick={() => setModal(null)}>Cancelar</ActionButton><ActionButton variant="danger" disabled={saving} onClick={deleteContact}>Excluir</ActionButton></>}>
          <p className="text-sm text-zinc-300">Confirmar exclusão de <strong className="text-white">{selected.name}</strong>?</p>
        </Modal>
      ) : null}

      {modal === "details" && selected ? (
        <Modal title={selected.name} description="Histórico, origem e dados comerciais do contato." onClose={() => setModal(null)} className="max-w-4xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3 text-sm text-zinc-400">
              <Info label="Telefone" value={selected.phone} />
              <Info label="Email" value={selected.email} />
              <Info label="Localização" value={[selected.city, selected.state].filter(Boolean).join(", ") || "-"} />
              <Info label="Origem" value={selected.source} />
              <Info label="Canal" value={selected.channel} />
              <Info label="Campanha" value={selected.campaign_id} />
              <Info label="Última mensagem" value={selected.last_message} />
              <Info label="Última interação" value={formatDate(selected.last_interaction_at)} />
              <Info label="Resumo IA" value={selected.ai_summary} />
            </div>
            <div className="space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-sm font-black text-white">{event.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDate(event.created_at)} {event.user?.name ? `por ${event.user.name}` : ""}</p>
                  {event.description ? <p className="mt-2 text-sm text-zinc-400">{event.description}</p> : null}
                </div>
              ))}
              {!timeline.length ? <EmptyState title="Sem histórico ainda" description="Os próximos eventos deste contato aparecerão aqui." /> : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "fields" ? (
        <Modal title="Campos personalizados" description="Crie campos extras para cadastro, filtros e fluxos." onClose={() => setModal(null)} className="max-w-4xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <SearchInput placeholder="Nome do campo" value={fieldForm.name} onChange={(event) => setFieldForm((current) => ({ ...current, name: event.target.value }))} />
              <FilterSelect value={fieldForm.type} onChange={(event) => setFieldForm((current) => ({ ...current, type: event.target.value as CustomField["type"] }))}>
                <option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option><option value="select">Seleção</option><option value="boolean">Booleano</option><option value="url">URL</option>
              </FilterSelect>
              <SearchInput placeholder="Opções separadas por vírgula" value={fieldForm.options} onChange={(event) => setFieldForm((current) => ({ ...current, options: event.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={fieldForm.required} onChange={(event) => setFieldForm((current) => ({ ...current, required: event.target.checked }))} />Obrigatório</label>
              <ActionButton disabled={saving} onClick={saveField}>{fieldForm.id ? "Salvar Campo" : "Criar Campo"}</ActionButton>
            </div>
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div><p className="text-sm font-bold text-white">{field.name}</p><p className="text-xs text-zinc-500">{field.type}{field.required ? " · obrigatório" : ""}</p></div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setFieldForm({ id: field.id, name: field.name, type: field.type, options: (field.options_json ?? []).join(", "), required: Boolean(field.required) })} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Edit className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void deleteField(field)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {!fields.length ? <EmptyState title="Nenhum campo personalizado" /> : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "import" ? (
        <Modal title="Importar CSV" description="Formato básico: nome, telefone, email. O cabeçalho é obrigatório." onClose={() => setModal(null)} footer={<><ActionButton variant="secondary" onClick={() => setModal(null)}>Cancelar</ActionButton><ActionButton disabled={saving} onClick={importCsv}>Importar</ActionButton></>}>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={"nome,telefone,email\nMaria,+5511999999999,maria@email.com"} className="oz-input min-h-56 w-full rounded-xl p-4 text-sm text-white outline-none" />
        </Modal>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-xs font-bold uppercase text-zinc-600">{label}</p><p className="mt-1 text-sm text-zinc-200">{value || "-"}</p></div>;
}

function ContactTable({ contacts, onDetails, onEdit, onDuplicate, onDelete }: { contacts: Contact[]; onDetails: (contact: Contact) => void; onEdit: (contact: Contact) => void; onDuplicate: (contact: Contact) => void; onDelete: (contact: Contact) => void }) {
  return (
    <section className="oz-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-[1180px]">
        <thead><tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500"><th className="p-4">Contato</th><th className="p-4">Status</th><th className="p-4">Score</th><th className="p-4">Origem</th><th className="p-4">Campanha</th><th className="p-4">Atendente</th><th className="p-4">Tags</th><th className="p-4">Última interação</th><th className="p-4" /></tr></thead>
        <tbody className="divide-y divide-zinc-800">
          {contacts.map((contact) => {
            const status = STATUS_META[contact.status] ?? STATUS_META.new;
            return (
              <tr key={contact.id} className="transition hover:bg-zinc-900/60">
                <td className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-black text-emerald-300">{initials(contact.name)}</div><div><p className="text-sm font-black text-white">{contact.name}</p><p className="text-xs text-zinc-500">{contact.phone} · {contact.email || "sem email"}</p></div></div></td>
                <td className="p-4"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                <td className="p-4 text-sm font-black text-white">{contact.score}</td>
                <td className="p-4 text-sm text-zinc-300">{contact.source || "-"}</td>
                <td className="p-4 text-sm text-zinc-300">{contact.campaign_id || "-"}</td>
                <td className="p-4 text-sm text-zinc-300">{contact.assigned_user?.name || "-"}</td>
                <td className="p-4"><div className="flex flex-wrap gap-1">{contact.tags.map((tag) => <span key={tag.id} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200"><Tag className="mr-1 inline h-3 w-3" />{tag.name}</span>)}</div></td>
                <td className="p-4 text-xs text-zinc-500">{formatDate(contact.last_interaction_at || contact.updated_at)}</td>
                <td className="p-4"><div className="flex justify-end gap-1"><button onClick={() => void onDetails(contact)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Eye className="h-4 w-4" /></button><button onClick={() => onEdit(contact)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Edit className="h-4 w-4" /></button><button onClick={() => void onDuplicate(contact)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><Copy className="h-4 w-4" /></button><button onClick={() => onDelete(contact)} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Kanban({ contacts, onEdit }: { contacts: Contact[]; onEdit: (contact: Contact) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Object.entries(STATUS_META).map(([status, meta]) => {
        const items = contacts.filter((contact) => contact.status === status);
        return (
          <section key={status} className="oz-card rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-black text-white">{meta.label}</h3><span className="text-xs font-bold text-zinc-500">{items.length}</span></div>
            <div className="space-y-3">
              {items.map((contact) => (
                <button key={contact.id} type="button" onClick={() => onEdit(contact)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition hover:border-emerald-500/30">
                  <p className="text-sm font-black text-white">{contact.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{contact.phone}</p>
                  <div className="mt-3 flex items-center justify-between"><span className="text-xs text-zinc-400">Score {contact.score}</span><span className="text-xs font-bold text-emerald-300">{TEMPERATURE_LABELS[contact.temperature]}</span></div>
                </button>
              ))}
              {!items.length ? <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">Vazio</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ContactModal({ title, form, fields, users, customValues, saving, onForm, onCustom, onClose, onSave }: {
  title: string;
  form: typeof EMPTY_FORM;
  fields: CustomField[];
  users: UserRow[];
  customValues: Record<string, string>;
  saving: boolean;
  onForm: (form: typeof EMPTY_FORM) => void;
  onCustom: (values: Record<string, string>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    onForm({ ...form, [key]: value });
  }

  return (
    <Modal title={title} description="Dados principais, origem, tags e informações comerciais." onClose={onClose} className="max-w-5xl" footer={<><ActionButton variant="secondary" onClick={onClose}>Cancelar</ActionButton><ActionButton disabled={saving} onClick={onSave}>{saving ? "Salvando..." : "Salvar"}</ActionButton></>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nome"><SearchInput value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Telefone"><SearchInput value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><SearchInput value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Cidade"><SearchInput value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Estado"><SearchInput value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
        <Field label="Status"><FilterSelect value={form.status} onChange={(e) => set("status", e.target.value as ContactStatus)}>{Object.entries(STATUS_META).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</FilterSelect></Field>
        <Field label="Score"><SearchInput type="number" min={0} max={100} value={form.score} onChange={(e) => set("score", Number(e.target.value))} /></Field>
        <Field label="Temperatura"><FilterSelect value={form.temperature} onChange={(e) => set("temperature", e.target.value as Temperature)}><option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option></FilterSelect></Field>
        <Field label="Atendente"><FilterSelect value={form.assigned_user_id} onChange={(e) => set("assigned_user_id", e.target.value)}><option value="">Sem atendente</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</FilterSelect></Field>
        <Field label="Tags"><SearchInput value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="vip, campanha, risco" /></Field>
        <Field label="Origem"><SearchInput value={form.source} onChange={(e) => set("source", e.target.value)} /></Field>
        <Field label="Canal"><SearchInput value={form.channel} onChange={(e) => set("channel", e.target.value)} /></Field>
        <Field label="Campanha"><SearchInput value={form.campaign_id} onChange={(e) => set("campaign_id", e.target.value)} /></Field>
        <Field label="Conjunto"><SearchInput value={form.adset_id} onChange={(e) => set("adset_id", e.target.value)} /></Field>
        <Field label="Anúncio"><SearchInput value={form.ad_id} onChange={(e) => set("ad_id", e.target.value)} /></Field>
        <Field label="Criativo"><SearchInput value={form.creative_id} onChange={(e) => set("creative_id", e.target.value)} /></Field>
        <Field label="UTM Source"><SearchInput value={form.utm_source} onChange={(e) => set("utm_source", e.target.value)} /></Field>
        <Field label="UTM Medium"><SearchInput value={form.utm_medium} onChange={(e) => set("utm_medium", e.target.value)} /></Field>
        <Field label="UTM Campaign"><SearchInput value={form.utm_campaign} onChange={(e) => set("utm_campaign", e.target.value)} /></Field>
        <Field label="UTM Content"><SearchInput value={form.utm_content} onChange={(e) => set("utm_content", e.target.value)} /></Field>
        <Field label="UTM Term"><SearchInput value={form.utm_term} onChange={(e) => set("utm_term", e.target.value)} /></Field>
        <Field label="Resumo IA"><SearchInput value={form.ai_summary} onChange={(e) => set("ai_summary", e.target.value)} /></Field>
        {fields.map((field) => (
          <Field key={field.id} label={field.name}>
            <SearchInput value={customValues[field.id] ?? ""} onChange={(e) => onCustom({ ...customValues, [field.id]: e.target.value })} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase text-zinc-600">{label}</span>{children}</label>;
}
