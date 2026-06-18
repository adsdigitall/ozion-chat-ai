"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Loader2,
  Palette,
  Save,
  Shield,
  User,
  Users,
  MessageCircle,
  Bot,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TabId = "general" | "team" | "channels" | "ai" | "integrations" | "profile" | "notifications" | "security" | "appearance";

type SettingsData = {
  profile: { id: string; name: string; email: string; role: string; phone: string };
  company: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    description: string;
    logo: string;
    color: string;
    status: string;
    document: string;
    website: string;
    timezone: string;
  };
  notifications: Record<string, boolean>;
  appearance: { theme: "dark" | "light" | "system"; accent: string };
};

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "Geral", icon: Building2 },
  { id: "team", label: "Equipe", icon: Users },
  { id: "channels", label: "Canais", icon: MessageCircle },
  { id: "ai", label: "IA", icon: Bot },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "profile", label: "Perfil", icon: User },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "security", label: "Segurança", icon: Shield },
  { id: "appearance", label: "Aparência", icon: Palette },
];

const notificationOptions = [
  ["newConversations", "Novas conversas", "Avisar quando uma nova conversa chegar"],
  ["unreadMessages", "Mensagens não lidas", "Lembrar sobre mensagens aguardando resposta"],
  ["newLeads", "Novos leads", "Avisar quando um contato entrar no CRM"],
  ["newSales", "Vendas realizadas", "Avisar quando uma venda for confirmada"],
  ["systemUpdates", "Atualizações do sistema", "Receber novidades importantes da plataforma"],
] as const;

const emptySettings: SettingsData = {
  profile: { id: "", name: "", email: "", role: "", phone: "" },
  company: {
    id: "",
    name: "",
    slug: "",
    plan: "",
    description: "",
    logo: "",
    color: "#10b981",
    status: "active",
    document: "",
    website: "",
    timezone: "America/Sao_Paulo",
  },
  notifications: {},
  appearance: { theme: "dark", accent: "emerald" },
};

const accentClasses: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [data, setData] = useState<SettingsData>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as configurações.");
        setData(payload);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      setMessage("Alterações salvas.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) return setError("A nova senha precisa ter pelo menos 8 caracteres.");
    if (password !== passwordConfirmation) return setError("As senhas não são iguais.");
    setSaving(true);
    const { error: authError } = await createClient().auth.updateUser({ password });
    if (authError) setError(authError.message);
    else {
      setMessage("Senha alterada com sucesso.");
      setPassword("");
      setPasswordConfirmation("");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Workspace → Configurações</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie o ambiente atual, equipe, canais, IA e integrações</p>
      </div>

      {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 className="w-4 h-4" />{message}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-48 shrink-0 flex md:block gap-2 overflow-x-auto md:space-y-1">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setMessage(""); setError(""); }} className={`shrink-0 md:w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${activeTab === tab.id ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "general" && (
            <form onSubmit={(event) => { event.preventDefault(); void save({ company: { ...data.company, logo_url: data.company.logo } }); }} className="oz-card rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-medium text-white">Geral</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nome do Workspace" value={data.company.name} onChange={(value) => setData((current) => ({ ...current, company: { ...current.company, name: value } }))} />
                <Field label="Logo" type="url" value={data.company.logo} onChange={(value) => setData((current) => ({ ...current, company: { ...current.company, logo: value } }))} />
                <Field label="Cor" type="color" value={data.company.color} onChange={(value) => setData((current) => ({ ...current, company: { ...current.company, color: value } }))} />
                <Field label="Status" value={data.company.status} disabled onChange={() => undefined} />
                <div className="md:col-span-2"><label className="block text-sm text-zinc-300 mb-2">Descrição</label><textarea value={data.company.description} onChange={(event) => setData((current) => ({ ...current, company: { ...current.company, description: event.target.value } }))} className="w-full min-h-24 px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" /></div>
              </div>
              <SaveButton saving={saving} />
            </form>
          )}

          {activeTab === "team" && <InfoPanel title="Equipe" items={["Usuários do Workspace", "Convites", "Permissões por função", "Adicionar, remover e alterar função ficam em Workspaces → Equipe."]} />}
          {activeTab === "channels" && <InfoPanel title="Canais" items={["WhatsApp Oficial", "APIs", "Webhooks do Workspace", "Conexões aparecem isoladas por Workspace."]} />}
          {activeTab === "ai" && <InfoPanel title="IA" items={["Agentes IA", "Vozes", "Configurações de geração", "Todos os agentes e vozes seguem o Workspace atual."]} />}
          {activeTab === "integrations" && <InfoPanel title="Integrações" items={["OpenAI", "Dify", "ElevenLabs", "Credenciais salvas por Workspace."]} />}

          {activeTab === "profile" && (
            <form onSubmit={(event) => { event.preventDefault(); void save({ profile: data.profile }); }} className="oz-card rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-medium text-white">Informações do Perfil</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nome completo" value={data.profile.name} onChange={(value) => setData((current) => ({ ...current, profile: { ...current.profile, name: value } }))} />
                <Field label="E-mail" type="email" value={data.profile.email} onChange={(value) => setData((current) => ({ ...current, profile: { ...current.profile, email: value } }))} />
                <Field label="Telefone" value={data.profile.phone} onChange={(value) => setData((current) => ({ ...current, profile: { ...current.profile, phone: value } }))} />
                <Field label="Perfil de acesso" value={data.profile.role} disabled onChange={() => undefined} />
              </div>
              <SaveButton saving={saving} />
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="oz-card rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-medium text-white mb-5">Preferências de Notificação</h2>
              {notificationOptions.map(([id, label, description]) => {
                const enabled = data.notifications[id] ?? true;
                return (
                  <button key={id} type="button" onClick={() => setData((current) => ({ ...current, notifications: { ...current.notifications, [id]: !enabled } }))} className="w-full flex items-center justify-between gap-4 p-4 bg-zinc-800/50 rounded-lg text-left">
                    <span><span className="block text-sm font-medium text-white">{label}</span><span className="block text-xs text-zinc-500">{description}</span></span>
                    <span className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-zinc-700"}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} /></span>
                  </button>
                );
              })}
              <SaveButton saving={saving} onClick={() => void save({ notifications: data.notifications })} />
            </div>
          )}

          {activeTab === "security" && (
            <form onSubmit={changePassword} className="oz-card rounded-xl p-6 space-y-5 max-w-xl">
              <div><h2 className="text-lg font-medium text-white">Alterar Senha</h2><p className="text-sm text-zinc-500 mt-1">A alteração exige uma sessão autenticada.</p></div>
              <Field label="Nova senha" type="password" value={password} onChange={setPassword} />
              <Field label="Confirmar nova senha" type="password" value={passwordConfirmation} onChange={setPasswordConfirmation} />
              <SaveButton saving={saving} label="Alterar senha" />
            </form>
          )}

          {activeTab === "appearance" && (
            <div className="oz-card rounded-xl p-6 space-y-6">
              <div><h2 className="text-lg font-medium text-white">Aparência</h2><p className="text-sm text-zinc-500 mt-1">Preferências prontas para aplicação completa do tema.</p></div>
              <div><p className="text-sm text-zinc-300 mb-3">Tema</p><div className="grid grid-cols-3 gap-3">{(["dark", "light", "system"] as const).map((theme) => <button key={theme} type="button" onClick={() => setData((current) => ({ ...current, appearance: { ...current.appearance, theme } }))} className={`p-4 rounded-lg border text-sm capitalize ${data.appearance.theme === theme ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" : "border-zinc-700 text-zinc-400"}`}>{theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Sistema"}</button>)}</div></div>
              <div><p className="text-sm text-zinc-300 mb-3">Cor de destaque</p><div className="flex flex-wrap gap-3">{Object.keys(accentClasses).map((accent) => <button key={accent} type="button" aria-label={`Cor ${accent}`} onClick={() => setData((current) => ({ ...current, appearance: { ...current.appearance, accent } }))} className={`w-10 h-10 rounded-full ${accentClasses[accent]} border-2 ${data.appearance.accent === accent ? "border-white" : "border-transparent"}`} />)}</div></div>
              <SaveButton saving={saving} onClick={() => void save({ appearance: data.appearance })} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <div><label className="block text-sm text-zinc-300 mb-2">{label}</label><input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white disabled:text-zinc-500 disabled:bg-zinc-800" /></div>;
}

function SaveButton({ saving, onClick, label = "Salvar alterações" }: { saving: boolean; onClick?: () => void; label?: string }) {
  return <div className="flex justify-end"><button type={onClick ? "button" : "submit"} onClick={onClick} disabled={saving} className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{label}</button></div>;
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="oz-card rounded-xl p-6">
      <h2 className="text-lg font-medium text-white">{title}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm font-semibold text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
