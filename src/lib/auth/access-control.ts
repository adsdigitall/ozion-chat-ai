import { canAccess, type AppRole, type PermissionKey } from "@/lib/auth/permissions";
import type { ModuleKey } from "@/lib/plans/plan-limits";

export type AccessUser = {
  role: AppRole;
  permissions?: PermissionKey[];
  customer_status?: "active" | "suspended" | "inactive" | null;
  current_workspace?: {
    id: string;
    status: string | null;
  } | null;
  plan_modules?: Partial<Record<ModuleKey, boolean>> | null;
};

export type ActionName =
  | "create_contact"
  | "delete_contact"
  | "create_flow"
  | "connect_whatsapp"
  | "create_agent"
  | "export_contacts"
  | "view_billing";

const modulePermissions: Partial<Record<ModuleKey, PermissionKey>> = {
  dashboard: "dashboard.view",
  chat: "chat.view",
  crm: "crm.view",
  flows: "flows.view",
  agents: "agents.view",
  voice: "voice.view",
  ctwa: "ctwa.view",
  campaigns: "campaigns.view",
  analytics: "analytics.view",
  sales: "sales.view",
  integrations: "integrations.view",
  whatsapp: "whatsapp.view",
  workspaces: "workspaces.view",
};

const actionRules: Record<ActionName, { module?: ModuleKey; permission?: PermissionKey; requiresActiveAccount?: boolean }> = {
  create_contact: { module: "crm", permission: "crm.view", requiresActiveAccount: true },
  delete_contact: { module: "crm", permission: "crm.view", requiresActiveAccount: true },
  create_flow: { module: "flows", permission: "flows.view", requiresActiveAccount: true },
  connect_whatsapp: { module: "whatsapp", permission: "whatsapp.view", requiresActiveAccount: true },
  create_agent: { module: "agents", permission: "agents.view", requiresActiveAccount: true },
  export_contacts: { module: "crm", permission: "crm.view", requiresActiveAccount: true },
  view_billing: { permission: "plans.view" },
};

function isActiveAccount(user: AccessUser) {
  return user.customer_status !== "suspended" && user.current_workspace?.status !== "suspended" && user.current_workspace?.status !== "inactive";
}

export function canAccessModule(user: AccessUser | null | undefined, moduleName: ModuleKey) {
  if (!user) return false;
  if (user.role === "admin_master") return true;
  if (user.plan_modules?.[moduleName] === false) return false;

  const permission = modulePermissions[moduleName];
  return permission ? canAccess(user.permissions, permission) : true;
}

export function canPerformAction(user: AccessUser | null | undefined, actionName: ActionName) {
  if (!user) return false;
  if (user.role === "admin_master") return true;

  const rule = actionRules[actionName];
  if (rule.requiresActiveAccount && !isActiveAccount(user)) return false;
  if (rule.permission && !canAccess(user.permissions, rule.permission)) return false;
  if (rule.module && !canAccessModule(user, rule.module)) return false;

  return true;
}
