"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  Building2,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Edit3,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CustomerStatus = "active" | "suspended" | "inactive";
type PlanId = "start" | "pro" | "scale" | "enterprise";

type CustomerRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  plan_id: PlanId;
  created_at: string;
  updated_at: string;
  last_access_at: string | null;
  workspaces_count: number;
  users_count: number;
};

type CustomerForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  plan_id: PlanId;
  status: CustomerStatus;
};

type CustomerLog = {
  id: string;
  action: string;
  target_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const initialForm: CustomerForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  plan_id: "start",
  status: "active",
};

const planLabels: Record<PlanId, string> = {
  start: "Start",
  pro: "Pro",
  scale: "Scale",
  enterprise: "Enterprise",
};

const statusLabels: Record<CustomerStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
};

const statusStyles: Record<CustomerStatus, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  suspended: "border-red-500/30 bg-red-500/10 text-red-300",
  inactive: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

const summaryCards: Array<{ label: string; value: (customers: CustomerRow[]) => number; icon: LucideIcon }> = [
  { label: "Clientes", value: (customers) => customers.length, icon: Building2 },
  { label: "Ativos", value: (customers) => customers.filter((item) => item.status === "active").length, icon: CheckCircle2 },
  { label: "Suspensos", value: (customers) => customers.filter((item) => item.status === "suspended").length, icon: Ban },
  { label: "Usuários", value: (customers) => customers.reduce((sum, item) => sum + Number(item.users_count || 0), 0), icon: UserRound },
];

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function Toast({ toast, onClose }: { toast: { type: "success" | "error"; message: string }; onClose: () => void }) {
  return (
    <div className={`fixed right-5 top-5 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${
      toast.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"
    }`}>
      <div className="flex items-start gap-3">
        {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <Ban className="mt-0.5 h-4 w-4" />}
        <p>{toast.message}</p>
        <button type="button" onClick={onClose} className="ml-auto text-current opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [logs, setLogs] = useState<CustomerLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "plan" | "details" | "logs" | null>(null);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => (
      `${customer.name} ${customer.company} ${customer.email} ${customer.phone ?? ""}`.toLowerCase().includes(query)
    ));
  }, [customers, search]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar clientes.");
      setCustomers(payload.customers ?? []);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar clientes." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setSelected(null);
    setForm(initialForm);
    setModal("create");
  }

  function openEdit(customer: CustomerRow) {
    setSelected(customer);
    setForm({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone ?? "",
      plan_id: customer.plan_id,
      status: customer.status,
    });
    setModal("edit");
  }

  function openPlan(customer: CustomerRow) {
    setSelected(customer);
    setForm({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone ?? "",
      plan_id: customer.plan_id,
      status: customer.status,
    });
    setModal("plan");
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    const isEdit = modal === "edit" || modal === "plan";
    setActionLoading("save");
    try {
      const body = modal === "plan" ? { plan_id: form.plan_id } : form;
      const response = await fetch(`/api/customers${isEdit && selected ? `?id=${selected.id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Não foi possível salvar cliente.");
      setToast({ type: "success", message: isEdit ? "Cliente atualizado." : "Cliente criado com usuário administrador e workspace padrão." });
      setModal(null);
      await loadCustomers();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao salvar cliente." });
    } finally {
      setActionLoading(null);
    }
  }

  async function patchCustomer(customer: CustomerRow, payload: Partial<CustomerForm>, success: string, loadingKey: string) {
    setActionLoading(`${loadingKey}:${customer.id}`);
    try {
      const response = await fetch(`/api/customers?id=${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Ação não concluída.");
      setToast({ type: "success", message: success });
      await loadCustomers();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro na ação." });
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteCustomer(customer: CustomerRow) {
    if (!window.confirm(`Excluir o cliente ${customer.company}?`)) return;
    setActionLoading(`delete:${customer.id}`);
    try {
      const response = await fetch(`/api/customers?id=${customer.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Não foi possível excluir cliente.");
      }
      setToast({ type: "success", message: "Cliente excluído." });
      await loadCustomers();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao excluir cliente." });
    } finally {
      setActionLoading(null);
    }
  }

  async function resetPassword(customer: CustomerRow) {
    setActionLoading(`reset:${customer.id}`);
    try {
      const response = await fetch("/api/customers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível resetar senha.");
      if (result.reset_link) await navigator.clipboard.writeText(result.reset_link);
      setToast({ type: "success", message: result.reset_link ? "Link de reset copiado." : "Reset de senha solicitado." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao resetar senha." });
    } finally {
      setActionLoading(null);
    }
  }

  async function impersonate(customer: CustomerRow) {
    setActionLoading(`impersonate:${customer.id}`);
    try {
      const response = await fetch("/api/customers/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar como cliente.");
      window.location.href = "/dashboard";
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao entrar como cliente." });
      setActionLoading(null);
    }
  }

  async function openLogs(customer: CustomerRow) {
    setSelected(customer);
    setLogs([]);
    setModal("logs");
    setActionLoading(`logs:${customer.id}`);
    try {
      const response = await fetch(`/api/customers/logs?customerId=${customer.id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar logs.");
      setLogs(result.logs ?? []);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar logs." });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Clientes</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">Admin Master gerencia clientes, planos, acessos e status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void loadCustomers()} className="oz-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button type="button" onClick={openCreate} className="oz-button-primary pulse-button inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black">
            <Plus className="h-4 w-4" />
            Criar Cliente
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="oz-card rounded-xl p-4">
            <Icon className="mb-3 h-5 w-5 text-emerald-300" />
            <p className="text-2xl font-black text-white">{value(customers)}</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente..."
            className="oz-input h-10 w-full rounded-lg pl-10 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="oz-card overflow-x-auto rounded-xl">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : (
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                <th className="p-4">Nome</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Email</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Workspaces</th>
                <th className="p-4">Usuários</th>
                <th className="p-4">Último acesso</th>
                <th className="p-4">Criação</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="align-top">
                  <td className="p-4 text-sm font-bold text-white">{customer.name}</td>
                  <td className="p-4 text-sm text-zinc-300">{customer.company}</td>
                  <td className="p-4 text-sm text-zinc-400">{customer.email}</td>
                  <td className="p-4 text-sm text-zinc-400">{customer.phone || "-"}</td>
                  <td className="p-4 text-sm font-bold text-emerald-300">{planLabels[customer.plan_id]}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[customer.status]}`}>
                      {statusLabels[customer.status]}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-300">{customer.workspaces_count}</td>
                  <td className="p-4 text-sm text-zinc-300">{customer.users_count}</td>
                  <td className="p-4 text-sm text-zinc-500">{formatDate(customer.last_access_at)}</td>
                  <td className="p-4 text-sm text-zinc-500">{formatDate(customer.created_at)}</td>
                  <td className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton label="Ver detalhes" icon={Eye} onClick={() => { setSelected(customer); setModal("details"); }} />
                      <ActionButton label="Editar" icon={Edit3} onClick={() => openEdit(customer)} />
                      <ActionButton label="Alterar plano" icon={Activity} onClick={() => openPlan(customer)} />
                      {customer.status === "suspended" ? (
                        <ActionButton label="Reativar" icon={RotateCcw} loading={actionLoading === `active:${customer.id}`} onClick={() => void patchCustomer(customer, { status: "active" }, "Cliente reativado.", "active")} />
                      ) : (
                        <ActionButton label="Suspender" icon={Ban} tone="danger" loading={actionLoading === `suspend:${customer.id}`} onClick={() => void patchCustomer(customer, { status: "suspended" }, "Cliente suspenso.", "suspend")} />
                      )}
                      <ActionButton label="Resetar senha" icon={KeyRound} loading={actionLoading === `reset:${customer.id}`} onClick={() => void resetPassword(customer)} />
                      <ActionButton label="Entrar como cliente" icon={DoorOpen} loading={actionLoading === `impersonate:${customer.id}`} onClick={() => void impersonate(customer)} />
                      <ActionButton label="Ver logs" icon={ClipboardList} loading={actionLoading === `logs:${customer.id}`} onClick={() => void openLogs(customer)} />
                      <ActionButton label="Excluir" icon={Trash2} tone="danger" loading={actionLoading === `delete:${customer.id}`} onClick={() => void deleteCustomer(customer)} />
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredCustomers.length ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-sm font-medium text-zinc-500">Nenhum cliente encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "create" || modal === "edit" || modal === "plan") ? (
        <CustomerModal
          title={modal === "create" ? "Criar Cliente" : modal === "plan" ? "Alterar plano" : "Editar Cliente"}
          form={form}
          setForm={setForm}
          saving={actionLoading === "save"}
          planOnly={modal === "plan"}
          onClose={() => setModal(null)}
          onSubmit={saveCustomer}
        />
      ) : null}

      {modal === "details" && selected ? (
        <InfoModal title="Detalhes do cliente" onClose={() => setModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Nome", selected.name],
              ["Empresa", selected.company],
              ["Email", selected.email],
              ["Telefone", selected.phone || "-"],
              ["Plano", planLabels[selected.plan_id]],
              ["Status", statusLabels[selected.status]],
              ["Workspaces", String(selected.workspaces_count)],
              ["Usuários", String(selected.users_count)],
              ["Último acesso", formatDate(selected.last_access_at)],
              ["Criação", formatDate(selected.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </InfoModal>
      ) : null}

      {modal === "logs" && selected ? (
        <InfoModal title={`Logs de ${selected.company}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-white">{log.action}</p>
                  <span className="text-xs font-medium text-zinc-500">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{log.ip_address || "Sem IP registrado"}</p>
              </div>
            ))}
            {!logs.length ? <p className="py-8 text-center text-sm text-zinc-500">Nenhum log encontrado.</p> : null}
          </div>
        </InfoModal>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  loading,
  tone = "default",
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  loading?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-black transition disabled:opacity-60 ${
        tone === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          : "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-emerald-500/35 hover:text-white"
      }`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function CustomerModal({
  title,
  form,
  setForm,
  saving,
  planOnly,
  onClose,
  onSubmit,
}: {
  title: string;
  form: CustomerForm;
  setForm: (updater: CustomerForm | ((current: CustomerForm) => CustomerForm)) => void;
  saving: boolean;
  planOnly?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <form onSubmit={onSubmit} className="oz-modal w-full max-w-xl rounded-2xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">Salve as alterações no Supabase.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!planOnly ? (
            <>
              <Field label="Nome" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
              <Field label="Empresa" value={form.company} onChange={(value) => setForm((current) => ({ ...current, company: value }))} required />
              <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" required />
              <Field label="Telefone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
            </>
          ) : null}
          <SelectField label="Plano" value={form.plan_id} onChange={(value) => setForm((current) => ({ ...current, plan_id: value as PlanId }))}>
            {Object.entries(planLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField>
          {!planOnly ? (
            <SelectField label="Status inicial" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value as CustomerStatus }))}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectField>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="oz-button-secondary h-10 rounded-lg px-4 text-sm font-bold">Cancelar</button>
          <button type="submit" disabled={saving} className="oz-button-primary h-10 rounded-lg px-4 text-sm font-black">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="oz-input h-10 w-full rounded-lg px-3 text-sm" />
    </label>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="oz-input h-10 w-full rounded-lg px-3 text-sm">
        {children}
      </select>
    </label>
  );
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="oz-modal max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
