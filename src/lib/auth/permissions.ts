import type { LucideIcon } from "lucide-react";
import type { ModuleKey } from "@/lib/plans/plan-limits";

export type AppRole = "admin_master" | "client" | "manager" | "attendant";

export type PermissionKey =
  | "dashboard.view"
  | "chat.view"
  | "crm.view"
  | "flows.view"
  | "agents.view"
  | "voice.view"
  | "ctwa.view"
  | "campaigns.view"
  | "analytics.view"
  | "sales.view"
  | "integrations.view"
  | "whatsapp.view"
  | "customers.view"
  | "workspaces.view"
  | "users.view"
  | "plans.view"
  | "settings.view"
  | "logs.view";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin_master: "Admin Master",
  client: "Cliente",
  manager: "Gestor",
  attendant: "Atendente",
};

export const ROLE_ALIASES: Record<string, AppRole> = {
  admin_master: "admin_master",
  master: "admin_master",
  admin: "manager",
  client: "client",
  cliente: "client",
  manager: "manager",
  gestor: "manager",
  agent: "attendant",
  attendant: "attendant",
  atendente: "attendant",
  viewer: "attendant",
};

export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  admin_master: [
    "dashboard.view",
    "chat.view",
    "crm.view",
    "flows.view",
    "agents.view",
    "voice.view",
    "ctwa.view",
    "campaigns.view",
    "analytics.view",
    "sales.view",
    "integrations.view",
    "whatsapp.view",
    "customers.view",
    "workspaces.view",
    "users.view",
    "plans.view",
    "settings.view",
    "logs.view",
  ],
  client: [
    "dashboard.view",
    "chat.view",
    "crm.view",
    "flows.view",
    "agents.view",
    "voice.view",
    "ctwa.view",
    "campaigns.view",
    "analytics.view",
    "sales.view",
    "integrations.view",
    "whatsapp.view",
    "workspaces.view",
    "settings.view",
  ],
  manager: [
    "dashboard.view",
    "chat.view",
    "crm.view",
    "flows.view",
    "agents.view",
    "campaigns.view",
    "analytics.view",
    "sales.view",
    "whatsapp.view",
  ],
  attendant: [
    "chat.view",
    "crm.view",
    "whatsapp.view",
  ],
};

export const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: "/dashboard", permission: "dashboard.view" },
  { prefix: "/chat", permission: "chat.view" },
  { prefix: "/crm", permission: "crm.view" },
  { prefix: "/tags", permission: "crm.view" },
  { prefix: "/flows", permission: "flows.view" },
  { prefix: "/agents", permission: "agents.view" },
  { prefix: "/voice", permission: "voice.view" },
  { prefix: "/ctwa", permission: "ctwa.view" },
  { prefix: "/campaigns", permission: "campaigns.view" },
  { prefix: "/analytics", permission: "analytics.view" },
  { prefix: "/sales", permission: "sales.view" },
  { prefix: "/integrations", permission: "integrations.view" },
  { prefix: "/whatsapp", permission: "whatsapp.view" },
  { prefix: "/customers", permission: "customers.view" },
  { prefix: "/workspaces", permission: "workspaces.view" },
  { prefix: "/users", permission: "users.view" },
  { prefix: "/plans", permission: "plans.view" },
  { prefix: "/settings", permission: "settings.view" },
  { prefix: "/logs", permission: "logs.view" },
];

export function normalizeRole(role?: string | null): AppRole {
  return ROLE_ALIASES[(role ?? "").toLowerCase()] ?? "attendant";
}

export function permissionsForRole(role?: string | null) {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function canAccess(permissions: readonly string[] | undefined, permission: PermissionKey) {
  return Boolean(permissions?.includes(permission));
}

export function routePermission(pathname: string) {
  return ROUTE_PERMISSIONS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))?.permission;
}

export type NavItemConfig = {
  icon: LucideIcon;
  label: string;
  href: string;
  permission: PermissionKey;
  module?: ModuleKey;
};
