import "server-only";

import type { NextRequest } from "next/server";
import type { RequestContext } from "@/lib/server/supabase-admin";
import { writeAuditLog } from "@/lib/server/supabase-admin";
import {
  MODULE_LABELS,
  type LimitKey,
  type ModuleKey,
  type PlanLimits,
  type PlanModules,
} from "@/lib/plans/plan-limits";

export type PlanEntitlements = {
  planId: string | null;
  limits: Partial<PlanLimits> | null;
  modules: Partial<PlanModules> | null;
};

const defaultLimitMessages: Partial<Record<LimitKey, string>> = {
  flows: "Limite de fluxos atingido. Faça upgrade do plano.",
  whatsapp_numbers: "Limite de números WhatsApp atingido.",
  agents: "Limite de agentes IA atingido. Faça upgrade do plano.",
  voices: "Limite de vozes atingido. Faça upgrade do plano.",
  users: "Limite de usuários atingido. Faça upgrade do plano.",
  contacts: "Limite de contatos atingido. Faça upgrade do plano.",
};

function isAdminMaster(context: Pick<RequestContext, "role">) {
  return context.role === "admin_master";
}

export async function getPlanEntitlements(context: Pick<RequestContext, "admin" | "customerId">): Promise<PlanEntitlements> {
  if (!context.customerId) {
    return { planId: null, limits: null, modules: null };
  }

  const { data: subscription, error: subscriptionError } = await context.admin
    .from("subscriptions")
    .select("plan_id, plans!inner(limits_json,modules_json,status)")
    .eq("customer_id", context.customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;

  const joinedPlan = Array.isArray(subscription?.plans) ? subscription?.plans[0] : subscription?.plans;
  if (joinedPlan) {
    return {
      planId: subscription?.plan_id ?? null,
      limits: joinedPlan.limits_json as Partial<PlanLimits>,
      modules: joinedPlan.modules_json as Partial<PlanModules>,
    };
  }

  const { data: customer, error: customerError } = await context.admin
    .from("customers")
    .select("plan_id, plans(limits_json,modules_json,status)")
    .eq("id", context.customerId)
    .maybeSingle();
  if (customerError) throw customerError;

  const customerPlan = Array.isArray(customer?.plans) ? customer?.plans[0] : customer?.plans;
  return {
    planId: customer?.plan_id ?? null,
    limits: customerPlan?.limits_json as Partial<PlanLimits> | null,
    modules: customerPlan?.modules_json as Partial<PlanModules> | null,
  };
}

export async function requirePlanModule({
  context,
  request,
  module,
}: {
  context: RequestContext;
  request: NextRequest;
  module: ModuleKey;
}) {
  if (isAdminMaster(context) || !context.customerId) return;

  const entitlements = await getPlanEntitlements(context);
  if (entitlements.modules?.[module] === false) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: "module.blocked",
      targetType: "plan",
      targetId: entitlements.planId,
      details: { module },
    });
    throw new Error(`Módulo ${MODULE_LABELS[module]} bloqueado neste plano.`);
  }
}

export async function requirePlanLimit({
  context,
  request,
  limit,
  currentCount,
  message,
}: {
  context: RequestContext;
  request: NextRequest;
  limit: LimitKey;
  currentCount: number;
  message?: string;
}) {
  if (isAdminMaster(context) || !context.customerId) return;

  const entitlements = await getPlanEntitlements(context);
  const allowed = entitlements.limits?.[limit];
  if (typeof allowed !== "number" || allowed < 0) return;

  if (currentCount >= allowed) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: "limit.reached",
      targetType: "plan",
      targetId: entitlements.planId,
      details: { limit, allowed, current_count: currentCount },
    });
    throw new Error(message ?? defaultLimitMessages[limit] ?? "Limite do plano atingido.");
  }
}
