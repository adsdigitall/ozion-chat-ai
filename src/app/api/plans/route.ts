import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";
import { LIMIT_KEYS, MODULE_KEYS } from "@/lib/plans/plan-limits";

const billingCycleSchema = z.enum(["monthly", "quarterly", "yearly"]);
const planStatusSchema = z.enum(["active", "inactive"]);

const limitsSchema = z.object(
  Object.fromEntries(LIMIT_KEYS.map((key) => [key, z.coerce.number().int().min(-1)])) as Record<(typeof LIMIT_KEYS)[number], z.ZodNumber>
);

const modulesSchema = z.object(
  Object.fromEntries(MODULE_KEYS.map((key) => [key, z.boolean()])) as Record<(typeof MODULE_KEYS)[number], z.ZodBoolean>
);

const planInput = z.object({
  id: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.coerce.number().min(0),
  billing_cycle: billingCycleSchema,
  status: planStatusSchema,
  limits_json: limitsSchema,
  modules_json: modulesSchema,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "plano";
}

async function listPlans(admin: Awaited<ReturnType<typeof getRequestContext>>["admin"]) {
  const { data: plans, error } = await admin
    .from("plans")
    .select("id,name,description,price,billing_cycle,status,limits_json,modules_json,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const planIds = (plans ?? []).map((plan) => plan.id);
  const { data: customers } = planIds.length
    ? await admin.from("customers").select("id,plan_id,status").in("plan_id", planIds)
    : { data: [] };

  return (plans ?? []).map((plan) => ({
    ...plan,
    active_customers_count: (customers ?? []).filter((customer) => customer.plan_id === plan.id && customer.status === "active").length,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "plans.view");
    return NextResponse.json({ plans: await listPlans(context.admin) });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "plans.view");
    const duplicateId = request.nextUrl.searchParams.get("duplicateId");

    if (duplicateId) {
      const { data: source, error: sourceError } = await context.admin
        .from("plans")
        .select("name,description,price,billing_cycle,status,limits_json,modules_json")
        .eq("id", duplicateId)
        .single();
      if (sourceError) throw sourceError;

      const id = `${slugify(`copia-de-${source.name}`)}-${Date.now().toString(36)}`;
      const { data, error } = await context.admin
        .from("plans")
        .insert({
          id,
          ...source,
          name: `Cópia de ${source.name}`,
          status: "inactive",
        })
        .select()
        .single();
      if (error) throw error;

      await writeAuditLog({
        admin: context.admin,
        workspaceId: context.adminWorkspaceId ?? context.workspaceId,
        userId: context.profileId,
        request,
        action: "plan.duplicated",
        targetType: "plan",
        targetId: data.id,
        details: { source_plan_id: duplicateId },
      });

      return NextResponse.json({ plan: data }, { status: 201 });
    }

    const parsed = planInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Plano inválido." }, { status: 400 });
    }

    const id = parsed.data.id || slugify(parsed.data.name);
    const { data, error } = await context.admin
      .from("plans")
      .insert({ ...parsed.data, id })
      .select()
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "plan.created",
      targetType: "plan",
      targetId: data.id,
      details: { name: data.name },
    });

    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do plano é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requirePermission(context, "plans.view");
    const parsed = planInput.omit({ id: true }).partial().safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Plano inválido." }, { status: 400 });
    }

    const { data, error } = await context.admin
      .from("plans")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (parsed.data.status || parsed.data.limits_json || parsed.data.modules_json || parsed.data.price || parsed.data.billing_cycle) {
      await context.admin
        .from("subscriptions")
        .update({ updated_at: new Date().toISOString() })
        .eq("plan_id", id);
    }

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "plan.edited",
      targetType: "plan",
      targetId: id,
      details: parsed.data,
    });

    return NextResponse.json({ plan: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do plano é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requirePermission(context, "plans.view");

    const { count, error: countError } = await context.admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("status", "active");
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Este plano possui clientes ativos. Altere os clientes para outro plano antes de excluir." },
        { status: 409 },
      );
    }

    const { error } = await context.admin.from("plans").delete().eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "plan.deleted",
      targetType: "plan",
      targetId: id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
