"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

type WorkspaceRow = {
  id: string;
  customer_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  color: string | null;
  logo_url: string | null;
  status: "active" | "inactive" | "suspended";
  plan: string;
  created_at: string;
  is_current?: boolean;
  users_count: number;
  flows_count: number;
  contacts_count: number;
  whatsapp_numbers_count: number;
  agents_count: number;
  customer?: { id: string; name: string; company: string; status: string; plan_id: string } | null;
};

type CustomerOption = { id: string; name: string; company: string; plan_id: string; status: string };
type UserOption = { id: string; name: string; email: string; role: string };
type WorkspaceUser = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "manager" | "attendant";
  status: "active" | "invited" | "inactive";
  user?: UserOption | UserOption[] | null;
};

type WorkspaceForm = {
  name: string;
  description: string;
  category: string;
  customer_id: string;
  color: string;
  status: "active" | "inactive" | "suspended";
};

const emptyForm: WorkspaceForm = {
  name: "",
  description: "",
  category: "operacao",
  customer_id: "",
  color: "#10b981",
  status: "active",
};

const statusLabels = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

function Toast({ toast, onClose }: { toast: { type: "success" | "error"; message: string }; onClose: () => void }) {
  return (
    <div className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>
      <CheckCircle2 className="mt-0.5 h-4 w-4" />
      <p>{toast.message}</p>
      <button type="button" onClick={onClose} className="ml-auto text-current/70 hover:text-current"><X className="h-4 w-4" /></button>
    </div>
  );
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceRow | null>(null);
  const [editing, setEditing] = useState<WorkspaceRow | null>(null);
  const [form, setForm] = useState<WorkspaceForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modal, setModal] = useState<"form" | "team" | null>(null);
  const [teamForm, setTeamForm] = useState({ user_id: "", role: "attendant" as "owner" | "manager" | "attendant" });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? workspaces.filter((workspace) =>
          `${workspace.name} ${workspace.customer?.company ?? ""} ${workspace.category ?? ""}`.toLowerCase().includes(query),
        )
      : workspaces;
  }, [search, workspaces]);

  const stats = useMemo(() => [
    { label: "Workspaces", value: workspaces.length, icon: Building2 },
    { label: "Usuários", value: workspaces.reduce((sum, item) => sum + item.users_count, 0), icon: Users },
    { label: "WhatsApp", value: workspaces.reduce((sum, item) => sum + item.whatsapp_numbers_count, 0), icon: MessageCircle },
    { label: "Agentes IA", value: workspaces.reduce((sum, item) => sum + item.agents_count, 0), icon: Bot },
  ], [workspaces]);

  async function loadWorkspaces() {
    try {
      setLoading(true);
      const response = await fetch("/api/workspaces", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar Workspaces.");
      setWorkspaces(payload.workspaces ?? []);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar Workspaces." });
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    const response = await fetch("/api/customers", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setCustomers(payload.customers ?? []);
  }

  async function loadUsers() {
    const response = await fetch("/api/users?scope=customer", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setUsers(payload.users ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void Promise.all([loadWorkspaces(), loadCustomers(), loadUsers()]), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModal("form");
  }

  function openEdit(workspace: WorkspaceRow) {
    setEditing(workspace);
    setForm({
      name: workspace.name,
      description: workspace.description ?? "",
      category: workspace.category ?? "operacao",
      customer_id: workspace.customer_id ?? "",
      color: workspace.color ?? "#10b981",
      status: workspace.status,
    });
    setModal("form");
  }

  async function saveWorkspace(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, description: form.description || null, customer_id: form.customer_id || null };
      const response = await fetch(editing ? `/api/workspaces?id=${editing.id}` : "/api/workspaces", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar Workspace.");
      setToast({ type: "success", message: editing ? "Workspace atualizado." : "Workspace criado com configurações padrão." });
      setModal(null);
      await loadWorkspaces();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao salvar Workspace." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace(workspace: WorkspaceRow) {
    if (!confirm(`Excluir o Workspace ${workspace.name}?`)) return;
    try {
      const response = await fetch(`/api/workspaces?id=${workspace.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir Workspace.");
      setToast({ type: "success", message: "Workspace excluído." });
      await loadWorkspaces();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao excluir Workspace." });
    }
  }

  async function switchWorkspace(workspace: WorkspaceRow) {
    const response = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspace.id }),
    });
    if (response.ok) {
      setToast({ type: "success", message: `Workspace atual: ${workspace.name}` });
      window.location.reload();
      return;
    }
    const result = await response.json().catch(() => null);
    setToast({ type: "error", message: result?.error || "Não foi possível trocar Workspace." });
  }

  async function openTeam(workspace: WorkspaceRow) {
    setSelectedWorkspace(workspace);
    setModal("team");
    setTeamForm({ user_id: "", role: "attendant" });
    const response = await fetch(`/api/workspaces/users?workspaceId=${workspace.id}`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      setWorkspaceUsers(payload.users ?? []);
    } else {
      setWorkspaceUsers([]);
    }
  }

  async function addUser(event: FormEvent) {
    event.preventDefault();
    if (!selectedWorkspace || !teamForm.user_id) return;
    const response = await fetch("/api/workspaces/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: selectedWorkspace.id, user_id: teamForm.user_id, role: teamForm.role, status: "active" }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setToast({ type: "error", message: result?.error || "Não foi possível adicionar usuário." });
    setToast({ type: "success", message: "Usuário adicionado ao Workspace." });
    await openTeam(selectedWorkspace);
  }

  async function removeUser(member: WorkspaceUser) {
    if (!selectedWorkspace) return;
    const response = await fetch(`/api/workspaces/users?id=${member.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setToast({ type: "error", message: result?.error || "Não foi possível remover usuário." });
    setToast({ type: "success", message: "Usuário removido do Workspace." });
    await openTeam(selectedWorkspace);
  }

  return (
    <div className="space-y-6 p-6">
      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}
      <div className="pointer-events-none fixed inset-0 oz-grid-bg opacity-35" />

      <section className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">Ambientes de operação</p>
          <h1 className="mt-2 text-3xl font-black text-white">Workspaces</h1>
          <p className="mt-2 text-sm text-zinc-500">Separe CRM, chat, fluxos, IA, WhatsApp e integrações por ambiente.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void loadWorkspaces()} className="oz-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <button type="button" onClick={openCreate} className="oz-button-primary pulse-button inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black">
            <Plus className="h-4 w-4" /> Criar Workspace
          </button>
        </div>
      </section>

      <section className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="oz-card rounded-xl p-4">
            <stat.icon className="mb-3 h-5 w-5 text-emerald-400" />
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs font-semibold text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar Workspaces..." className="oz-input h-10 w-full rounded-lg pl-10 pr-3 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : (
        <section className="relative grid gap-4 lg:grid-cols-2">
          {filtered.map((workspace) => (
            <article key={workspace.id} className={`oz-card rounded-xl p-5 transition hover:border-emerald-500/25 ${workspace.is_current ? "border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.12)]" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10" style={{ color: workspace.color ?? "#10b981" }}>
                    <Building2 className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-white">{workspace.name}</h2>
                    <p className="truncate text-xs text-zinc-500">{workspace.customer?.company ?? "Sem cliente"} · /{workspace.slug}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${workspace.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-400"}`}>
                  {statusLabels[workspace.status]}
                </span>
              </div>

              <p className="mt-4 min-h-10 text-sm leading-5 text-zinc-500">{workspace.description || "Workspace operacional da plataforma Ozion."}</p>

              <div className="mt-5 grid grid-cols-5 gap-3">
                <MiniStat label="Usuários" value={workspace.users_count} />
                <MiniStat label="Fluxos" value={workspace.flows_count} />
                <MiniStat label="Contatos" value={workspace.contacts_count} />
                <MiniStat label="WhatsApp" value={workspace.whatsapp_numbers_count} />
                <MiniStat label="Agentes" value={workspace.agents_count} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">Plano</p>
                  <p className="text-sm font-black text-white">{workspace.plan}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void switchWorkspace(workspace)} className="oz-button-secondary h-9 rounded-lg px-3 text-xs font-bold">Acessar</button>
                  <button type="button" onClick={() => void openTeam(workspace)} className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300"><Users className="h-4 w-4" /></button>
                  <button type="button" onClick={() => openEdit(workspace)} className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300"><Edit3 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void deleteWorkspace(workspace)} className="rounded-lg border border-red-500/20 p-2 text-red-300 transition hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
          {!filtered.length ? <div className="oz-card col-span-full rounded-xl p-10 text-center text-sm text-zinc-500">Nenhum Workspace encontrado.</div> : null}
        </section>
      )}

      {modal === "form" ? (
        <WorkspaceFormModal
          editing={editing}
          form={form}
          customers={customers}
          saving={saving}
          onChange={setForm}
          onClose={() => setModal(null)}
          onSubmit={saveWorkspace}
        />
      ) : null}

      {modal === "team" && selectedWorkspace ? (
        <TeamModal
          workspace={selectedWorkspace}
          users={users}
          members={workspaceUsers}
          teamForm={teamForm}
          onTeamForm={setTeamForm}
          onAdd={addUser}
          onRemove={removeUser}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2"><p className="text-sm font-black text-white">{value}</p><p className="text-[10px] font-semibold text-zinc-500">{label}</p></div>;
}

function WorkspaceFormModal({ editing, form, customers, saving, onChange, onClose, onSubmit }: {
  editing: WorkspaceRow | null;
  form: WorkspaceForm;
  customers: CustomerOption[];
  saving: boolean;
  onChange: (form: WorkspaceForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="oz-modal w-full max-w-2xl rounded-2xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-black text-white">{editing ? "Editar Workspace" : "Criar Workspace"}</h2><p className="mt-1 text-sm text-zinc-500">Crie um ambiente isolado para operação do cliente.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><input required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} className="oz-input h-10 w-full rounded-lg px-3 text-sm" /></Field>
          <Field label="Categoria"><input value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} className="oz-input h-10 w-full rounded-lg px-3 text-sm" /></Field>
          <Field label="Cliente">
            <select disabled={Boolean(editing)} value={form.customer_id} onChange={(event) => onChange({ ...form, customer_id: event.target.value })} className="oz-input h-10 w-full rounded-lg px-3 text-sm disabled:opacity-50">
              <option value="">Cliente atual</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company} · {customer.plan_id}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as WorkspaceForm["status"] })} className="oz-input h-10 w-full rounded-lg px-3 text-sm">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </Field>
          <Field label="Cor"><input type="color" value={form.color} onChange={(event) => onChange({ ...form, color: event.target.value })} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-1" /></Field>
          <Field label="Descrição"><textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} className="oz-input min-h-24 w-full rounded-lg px-3 py-3 text-sm md:col-span-2" /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="oz-button-secondary h-10 rounded-lg px-4 text-sm font-bold">Cancelar</button>
          <button type="submit" disabled={saving} className="oz-button-primary h-10 rounded-lg px-4 text-sm font-black disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Workspace"}</button>
        </div>
      </form>
    </div>
  );
}

function TeamModal({ workspace, users, members, teamForm, onTeamForm, onAdd, onRemove, onClose }: {
  workspace: WorkspaceRow;
  users: UserOption[];
  members: WorkspaceUser[];
  teamForm: { user_id: string; role: "owner" | "manager" | "attendant" };
  onTeamForm: (form: { user_id: string; role: "owner" | "manager" | "attendant" }) => void;
  onAdd: (event: FormEvent) => void;
  onRemove: (member: WorkspaceUser) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="oz-modal max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-black text-white">Equipe do Workspace</h2><p className="mt-1 text-sm text-zinc-500">{workspace.name}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onAdd} className="mb-5 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:grid-cols-[1fr_160px_auto]">
          <select required value={teamForm.user_id} onChange={(event) => onTeamForm({ ...teamForm, user_id: event.target.value })} className="oz-input h-10 rounded-lg px-3 text-sm">
            <option value="">Selecionar usuário</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
          </select>
          <select value={teamForm.role} onChange={(event) => onTeamForm({ ...teamForm, role: event.target.value as typeof teamForm.role })} className="oz-input h-10 rounded-lg px-3 text-sm">
            <option value="owner">Dono</option>
            <option value="manager">Gestor</option>
            <option value="attendant">Atendente</option>
          </select>
          <button type="submit" className="oz-button-primary h-10 rounded-lg px-4 text-sm font-black">Adicionar</button>
        </form>
        <div className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
          {members.map((member) => {
            const user = Array.isArray(member.user) ? member.user[0] : member.user;
            return (
              <div key={member.id} className="flex items-center justify-between gap-4 p-4">
                <div><p className="text-sm font-black text-white">{user?.name ?? "Usuário"}</p><p className="text-xs text-zinc-500">{user?.email ?? member.user_id} · {member.role}</p></div>
                <button type="button" onClick={() => onRemove(member)} className="rounded-lg border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
          {!members.length ? <p className="p-6 text-center text-sm text-zinc-500">Nenhum usuário vinculado.</p> : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-2"><span className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</span>{children}</label>;
}
