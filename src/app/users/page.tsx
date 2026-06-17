"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Crown, Loader2, Plus, Search, Shield, Trash2, User, UserCog, X, type LucideIcon } from "lucide-react";

type Role = "master" | "admin" | "agent" | "viewer";
type UserRow = { id: string; name: string; email: string; role: Role; auth_id: string | null; created_at: string };

const roles: Record<Role, { icon: LucideIcon; label: string; color: string }> = {
  master: { icon: Crown, label: "Master", color: "text-amber-400 bg-amber-500/10" },
  admin: { icon: Shield, label: "Admin", color: "text-purple-400 bg-purple-500/10" },
  agent: { icon: UserCog, label: "Agente", color: "text-blue-400 bg-blue-500/10" },
  viewer: { icon: User, label: "Visualizador", color: "text-zinc-400 bg-zinc-500/10" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({ name: "", email: "", role: "agent" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/users", { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os usuários.");
      setUsers(payload.users);
    }).catch((loadError: unknown) => {
      if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => users.filter((item) =>
    (role === "all" || item.role === role) &&
    (!search || `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase()))
  ), [users, search, role]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível convidar.");
      setUsers((current) => [...current, payload.user]);
      setModal(false); setForm({ name: "", email: "", role: "agent" });
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Erro ao convidar.");
    } finally { setSaving(false); }
  };

  const updateRole = async (item: UserRow, nextRole: Role) => {
    const response = await fetch(`/api/users?id=${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole }) });
    if (response.ok) setUsers((current) => current.map((user) => user.id === item.id ? { ...user, role: nextRole } : user));
  };

  const remove = async (item: UserRow) => {
    if (!window.confirm(`Remover ${item.name}?`)) return;
    const response = await fetch(`/api/users?id=${item.id}`, { method: "DELETE" });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) return setError(payload?.error ?? "Não foi possível remover.");
    setUsers((current) => current.filter((user) => user.id !== item.id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Usuários</h1><p className="text-sm text-zinc-500 mt-1">Equipe e permissões do workspace</p></div><button onClick={() => setModal(true)} className="h-9 px-4 bg-emerald-500 text-white text-sm rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" />Convidar</button></div>
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{(["master", "admin", "agent", "viewer"] as Role[]).map((item) => { const config = roles[item]; return <div key={item} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><config.icon className="w-5 h-5 text-zinc-400 mb-3" /><p className="text-2xl font-bold text-white">{users.filter((user) => user.role === item).length}</p><p className="text-xs text-zinc-500">{config.label}</p></div>; })}</div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuários..." className="w-full h-9 pl-10 pr-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white" /></div><select value={role} onChange={(event) => setRole(event.target.value)} className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300"><option value="all">Todos</option>{Object.entries(roles).map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select></div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto">{loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div> : <table className="w-full"><thead><tr className="border-b border-zinc-800"><th className="text-left p-4 text-xs text-zinc-500 uppercase">Usuário</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Perfil</th><th className="text-left p-4 text-xs text-zinc-500 uppercase">Entrada</th><th className="w-12" /></tr></thead><tbody className="divide-y divide-zinc-800">{filtered.map((item) => { const config = roles[item.role]; return <tr key={item.id}><td className="p-4"><p className="text-sm text-white">{item.name}</p><p className="text-xs text-zinc-500">{item.email}</p></td><td className="p-4"><select value={item.role} disabled={item.role === "master"} onChange={(event) => void updateRole(item, event.target.value as Role)} className={`text-xs px-2 py-1 rounded-lg border-0 ${config.color}`}><option value="master">Master</option><option value="admin">Admin</option><option value="agent">Agente</option><option value="viewer">Visualizador</option></select></td><td className="p-4 text-sm text-zinc-500">{new Date(item.created_at).toLocaleDateString("pt-BR")}</td><td className="p-4"><button onClick={() => void remove(item)} disabled={item.role === "master"} className="text-red-400 disabled:opacity-20"><Trash2 className="w-4 h-4" /></button></td></tr>; })}{!filtered.length && <tr><td colSpan={4} className="p-10 text-center text-sm text-zinc-500">Nenhum usuário encontrado.</td></tr>}</tbody></table>}</div>
      {modal && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><form onSubmit={invite} className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4"><div className="flex justify-between"><div><h2 className="text-lg font-semibold text-white">Convidar usuário</h2><p className="text-sm text-zinc-500">Um convite será enviado por e-mail.</p></div><button type="button" onClick={() => setModal(false)}><X className="w-5 h-5 text-zinc-500" /></button></div><input required placeholder="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><input required type="email" placeholder="E-mail" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white" /><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))} className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white"><option value="admin">Admin</option><option value="agent">Agente</option><option value="viewer">Visualizador</option></select><button disabled={saving} className="w-full h-10 bg-emerald-500 text-white rounded-lg disabled:opacity-50">{saving ? "Enviando..." : "Enviar convite"}</button></form></div>}
    </div>
  );
}
