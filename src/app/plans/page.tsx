"use client";

import { type Dispatch, FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Edit3,
  Infinity,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  DEFAULT_PLANS,
  LIMIT_KEYS,
  LIMIT_LABELS,
  MODULE_KEYS,
  MODULE_LABELS,
  formatLimit,
  type BillingCycle,
  type LimitKey,
  type ModuleKey,
  type PlanLimits,
  type PlanModules,
  type PlanStatus,
} from "@/lib/plans/plan-limits";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: BillingCycle;
  status: PlanStatus;
  limits_json: PlanLimits;
  modules_json: PlanModules;
  active_customers_count: number;
  created_at: string;
  updated_at: string;
};

type PlanForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  billing_cycle: BillingCycle;
  status: PlanStatus;
  limits_json: PlanLimits;
  modules_json: PlanModules;
};

const cycleLabels: Record<BillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const initialPlan = DEFAULT_PLANS[0];
const emptyForm: PlanForm = {
  name: "",
  description: "",
  price: "",
  billing_cycle: "monthly",
  status: "active",
  limits_json: { ...initialPlan.limits_json },
  modules_json: { ...initialPlan.modules_json },
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function Toast({ toast, onClose }: { toast: { type: "success" | "error"; message: string }; onClose: () => void }) {
  return (
    <div
      className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${
        toast.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <ShieldCheck className="mt-0.5 h-4 w-4" />}
      <p>{toast.message}</p>
      <button type="button" onClick={onClose} className="ml-auto text-current/70 transition hover:text-current">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [step, setStep] = useState<"dados" | "limites" | "modulos">("dados");
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const stats = useMemo(() => {
    const active = plans.filter((plan) => plan.status === "active").length;
    const customers = plans.reduce((total, plan) => total + Number(plan.active_customers_count ?? 0), 0);
    const modules = plans.reduce((total, plan) => total + MODULE_KEYS.filter((key) => plan.modules_json?.[key]).length, 0);
    return [
      { label: "Planos ativos", value: active },
      { label: "Clientes vinculados", value: customers },
      { label: "Módulos liberados", value: modules },
      { label: "Planos cadastrados", value: plans.length },
    ];
  }, [plans]);

  async function loadPlans() {
    try {
      setLoading(true);
      const response = await fetch("/api/plans", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar planos.");
      setPlans(payload.plans ?? []);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao carregar planos." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlans(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setStep("dados");
    setModalOpen(true);
  }

  function openEdit(plan: PlanRow) {
    setEditing(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price ?? 0),
      billing_cycle: plan.billing_cycle,
      status: plan.status,
      limits_json: { ...initialPlan.limits_json, ...plan.limits_json },
      modules_json: { ...initialPlan.modules_json, ...plan.modules_json },
    });
    setStep("dados");
    setModalOpen(true);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description || null,
        price: Number(form.price || 0),
        billing_cycle: form.billing_cycle,
        status: form.status,
        limits_json: form.limits_json,
        modules_json: form.modules_json,
      };
      const response = await fetch(editing ? `/api/plans?id=${encodeURIComponent(editing.id)}` : "/api/plans", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? payload : { ...payload, id: form.id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar plano.");
      setToast({ type: "success", message: editing ? "Plano atualizado e aplicado aos clientes vinculados." : "Plano criado." });
      setModalOpen(false);
      await loadPlans();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao salvar plano." });
    } finally {
      setSaving(false);
    }
  }

  async function duplicatePlan(plan: PlanRow) {
    try {
      setActionId(`duplicate-${plan.id}`);
      const response = await fetch(`/api/plans?duplicateId=${encodeURIComponent(plan.id)}`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível duplicar plano.");
      setToast({ type: "success", message: `Plano duplicado como Cópia de ${plan.name}.` });
      await loadPlans();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao duplicar plano." });
    } finally {
      setActionId(null);
    }
  }

  async function deletePlan(plan: PlanRow) {
    if (!confirm(`Excluir o plano ${plan.name}?`)) return;
    try {
      setActionId(`delete-${plan.id}`);
      const response = await fetch(`/api/plans?id=${encodeURIComponent(plan.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir plano.");
      setToast({ type: "success", message: "Plano excluído." });
      await loadPlans();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Erro ao excluir plano." });
    } finally {
      setActionId(null);
    }
  }

  function updateLimit(key: LimitKey, value: number) {
    setForm((current) => ({ ...current, limits_json: { ...current.limits_json, [key]: value } }));
  }

  function updateModule(key: ModuleKey, value: boolean) {
    setForm((current) => ({ ...current, modules_json: { ...current.modules_json, [key]: value } }));
  }

  return (
    <div className="space-y-6 p-6">
      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}

      <div className="pointer-events-none fixed inset-0 oz-grid-bg opacity-35" />
      <section className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-400">Admin Master</p>
          <h1 className="mt-2 text-3xl font-black text-white">Planos</h1>
          <p className="mt-2 text-sm text-zinc-500">Controle comercial, módulos liberados e limites de uso por cliente.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void loadPlans()} className="oz-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button type="button" onClick={openCreate} className="oz-button-primary pulse-button inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black">
            <Plus className="h-4 w-4" />
            Criar Plano
          </button>
        </div>
      </section>

      <section className="relative grid gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="oz-card rounded-xl p-4">
            <p className="text-2xl font-black text-white">{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="relative oz-card overflow-x-auto rounded-xl">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Plano</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Preço</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Status</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Clientes</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Limites principais</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Módulos</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Criação</th>
                <th className="p-4 text-right text-xs font-black uppercase tracking-wider text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {plans.map((plan) => (
                <tr key={plan.id} className="transition hover:bg-emerald-500/[0.03]">
                  <td className="p-4">
                    <p className="font-black text-white">{plan.name}</p>
                    <p className="mt-1 max-w-xs truncate text-xs text-zinc-500">{plan.description || "Sem descrição"}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-zinc-200">{money(plan.price)}</p>
                    <p className="text-xs text-zinc-500">{cycleLabels[plan.billing_cycle]}</p>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${plan.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-400"}`}>
                      {plan.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-white">{plan.active_customers_count}</td>
                  <td className="p-4">
                    <div className="flex max-w-sm flex-wrap gap-2">
                      {(["workspaces", "users", "whatsapp_numbers", "flows", "agents"] as LimitKey[]).map((key) => (
                        <span key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-300">
                          {LIMIT_LABELS[key]}: {formatLimit(plan.limits_json?.[key] ?? 0)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-white">{MODULE_KEYS.filter((key) => plan.modules_json?.[key]).length}/{MODULE_KEYS.length}</p>
                    <p className="text-xs text-zinc-500">módulos liberados</p>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{new Date(plan.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton label="Editar" onClick={() => openEdit(plan)} icon={<Edit3 className="h-4 w-4" />} />
                      <ActionButton
                        label="Duplicar"
                        onClick={() => void duplicatePlan(plan)}
                        loading={actionId === `duplicate-${plan.id}`}
                        icon={<Copy className="h-4 w-4" />}
                      />
                      <ActionButton
                        label="Excluir"
                        onClick={() => void deletePlan(plan)}
                        loading={actionId === `delete-${plan.id}`}
                        danger
                        icon={<Trash2 className="h-4 w-4" />}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!plans.length ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-zinc-500">Nenhum plano cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </section>

      {modalOpen ? (
        <PlanModal
          editing={editing}
          form={form}
          saving={saving}
          step={step}
          setStep={setStep}
          setForm={setForm}
          updateLimit={updateLimit}
          updateModule={updateModule}
          onClose={() => setModalOpen(false)}
          onSubmit={savePlan}
        />
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  loading,
  danger = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
        danger
          ? "border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/15"
          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-emerald-500/30 hover:text-emerald-300"
      }`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </button>
  );
}

function PlanModal({
  editing,
  form,
  saving,
  step,
  setStep,
  setForm,
  updateLimit,
  updateModule,
  onClose,
  onSubmit,
}: {
  editing: PlanRow | null;
  form: PlanForm;
  saving: boolean;
  step: "dados" | "limites" | "modulos";
  setStep: (step: "dados" | "limites" | "modulos") => void;
  setForm: Dispatch<SetStateAction<PlanForm>>;
  updateLimit: (key: LimitKey, value: number) => void;
  updateModule: (key: ModuleKey, value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="oz-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 p-5">
          <div>
            <h2 className="text-xl font-black text-white">{editing ? "Editar Plano" : "Criar Plano"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Defina venda, limites e módulos liberados.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-2 border-b border-zinc-800 px-5 py-3">
          {(["dados", "limites", "modulos"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(item)}
              className={`rounded-lg px-4 py-2 text-sm font-black capitalize transition ${
                step === item ? "bg-emerald-500 text-black shadow-[0_0_28px_rgba(16,185,129,0.22)]" : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {item === "modulos" ? "Módulos" : item}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {step === "dados" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do plano">
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="oz-input h-11 w-full rounded-lg px-3 text-sm" />
              </Field>
              <Field label="ID interno">
                <input disabled={Boolean(editing)} value={form.id ?? ""} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="Gerado automaticamente" className="oz-input h-11 w-full rounded-lg px-3 text-sm disabled:opacity-50" />
              </Field>
              <Field label="Preço">
                <input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="oz-input h-11 w-full rounded-lg px-3 text-sm" />
              </Field>
              <Field label="Ciclo">
                <select value={form.billing_cycle} onChange={(event) => setForm((current) => ({ ...current, billing_cycle: event.target.value as BillingCycle }))} className="oz-input h-11 w-full rounded-lg px-3 text-sm">
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PlanStatus }))} className="oz-input h-11 w-full rounded-lg px-3 text-sm">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </Field>
              <Field label="Descrição">
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="oz-input min-h-28 w-full rounded-lg px-3 py-3 text-sm md:col-span-2" />
              </Field>
            </div>
          ) : null}

          {step === "limites" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {LIMIT_KEYS.map((key) => {
                const value = form.limits_json[key];
                const unlimited = value < 0;
                return (
                  <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">{LIMIT_LABELS[key]}</p>
                      <button
                        type="button"
                        onClick={() => updateLimit(key, unlimited ? 1 : -1)}
                        className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
                          unlimited ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-500 hover:text-white"
                        }`}
                      >
                        <Infinity className="h-3.5 w-3.5" />
                        Ilimitado
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      disabled={unlimited}
                      value={unlimited ? "" : value}
                      onChange={(event) => updateLimit(key, Number(event.target.value || 0))}
                      placeholder={unlimited ? "Ilimitado" : "0"}
                      className="oz-input mt-3 h-10 w-full rounded-lg px-3 text-sm disabled:opacity-50"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {step === "modulos" ? (
            <div className="grid gap-3 md:grid-cols-3">
              {MODULE_KEYS.map((key) => {
                const enabled = form.modules_json[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateModule(key, !enabled)}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                      enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500"
                    }`}
                  >
                    <span className="text-sm font-black">{MODULE_LABELS[key]}</span>
                    <span className={`h-5 w-9 rounded-full p-0.5 transition ${enabled ? "bg-emerald-500" : "bg-zinc-800"}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-4" : ""}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 p-5">
          <p className="text-xs font-semibold text-zinc-500">Alterações salvas atualizam os clientes vinculados ao plano.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="oz-button-secondary h-10 rounded-lg px-4 text-sm font-bold">Cancelar</button>
            <button type="submit" disabled={saving} className="oz-button-primary h-10 rounded-lg px-4 text-sm font-black disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Plano"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
