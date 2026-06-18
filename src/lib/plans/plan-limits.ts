export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type PlanStatus = "active" | "inactive";
export type LimitKey =
  | "workspaces"
  | "users"
  | "contacts"
  | "flows"
  | "agents"
  | "voices"
  | "whatsapp_numbers"
  | "integrations"
  | "webhooks"
  | "gpt_tokens"
  | "voice_tokens"
  | "storage"
  | "flow_executions"
  | "sent_messages";

export type ModuleKey =
  | "dashboard"
  | "chat"
  | "crm"
  | "flows"
  | "agents"
  | "voice"
  | "ctwa"
  | "campaigns"
  | "analytics"
  | "sales"
  | "integrations"
  | "whatsapp"
  | "workspaces"
  | "members"
  | "community";

export type PlanLimits = Record<LimitKey, number>;
export type PlanModules = Record<ModuleKey, boolean>;

export const LIMIT_LABELS: Record<LimitKey, string> = {
  workspaces: "Workspaces",
  users: "Usuários",
  contacts: "Contatos",
  flows: "Fluxos",
  agents: "Agentes IA",
  voices: "Vozes",
  whatsapp_numbers: "Números WhatsApp",
  integrations: "Integrações",
  webhooks: "Webhooks",
  gpt_tokens: "Tokens GPT",
  voice_tokens: "Tokens Voice",
  storage: "Storage",
  flow_executions: "Execuções de fluxo",
  sent_messages: "Mensagens enviadas",
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  chat: "Chat ao Vivo",
  crm: "CRM",
  flows: "Fluxos",
  agents: "Agentes IA",
  voice: "Voice Studio",
  ctwa: "CTWA",
  campaigns: "Campanhas",
  analytics: "Analytics",
  sales: "Vendas",
  integrations: "Integrações",
  whatsapp: "WhatsApp",
  workspaces: "Workspaces",
  members: "Área de Membros",
  community: "Comunidade",
};

export const LIMIT_KEYS = Object.keys(LIMIT_LABELS) as LimitKey[];
export const MODULE_KEYS = Object.keys(MODULE_LABELS) as ModuleKey[];

export const allModules: PlanModules = MODULE_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as PlanModules);

export const noLimit = -1;

export const DEFAULT_PLANS = [
  {
    id: "start",
    name: "Start",
    description: "Plano inicial para validar a operação.",
    price: 197,
    billing_cycle: "monthly" as BillingCycle,
    status: "active" as PlanStatus,
    limits_json: {
      workspaces: 1,
      users: 1,
      whatsapp_numbers: 1,
      flows: 2,
      agents: 1,
      voices: 1,
      contacts: 1000,
      integrations: 2,
      webhooks: 1,
      gpt_tokens: 100000,
      voice_tokens: 30000,
      storage: 2,
      flow_executions: 1000,
      sent_messages: 3000,
    } satisfies PlanLimits,
    modules_json: {
      ...allModules,
      ctwa: false,
      campaigns: false,
      members: false,
      community: false,
    } satisfies PlanModules,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Plano para operação comercial em crescimento.",
    price: 497,
    billing_cycle: "monthly" as BillingCycle,
    status: "active" as PlanStatus,
    limits_json: {
      workspaces: 3,
      users: 5,
      whatsapp_numbers: 3,
      flows: 10,
      agents: 3,
      voices: 3,
      contacts: 10000,
      integrations: 8,
      webhooks: 5,
      gpt_tokens: 500000,
      voice_tokens: 150000,
      storage: 20,
      flow_executions: 15000,
      sent_messages: 30000,
    } satisfies PlanLimits,
    modules_json: {
      ...allModules,
      members: false,
      community: false,
    } satisfies PlanModules,
  },
  {
    id: "scale",
    name: "Scale",
    description: "Plano com recursos ilimitados para escala.",
    price: 997,
    billing_cycle: "monthly" as BillingCycle,
    status: "active" as PlanStatus,
    limits_json: LIMIT_KEYS.reduce((acc, key) => ({ ...acc, [key]: noLimit }), {} as PlanLimits),
    modules_json: allModules,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Contrato customizado com limites manuais.",
    price: 0,
    billing_cycle: "monthly" as BillingCycle,
    status: "active" as PlanStatus,
    limits_json: LIMIT_KEYS.reduce((acc, key) => ({ ...acc, [key]: noLimit }), {} as PlanLimits),
    modules_json: allModules,
  },
];

export function normalizeLimit(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function isUnlimited(value: number) {
  return value < 0;
}

export function formatLimit(value: number) {
  return isUnlimited(value) ? "Ilimitado" : new Intl.NumberFormat("pt-BR").format(value);
}
