import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanEntitlements } from "@/lib/server/plan-guards";
import { getRequestContext, publicServerError, requireActiveCustomer, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const statusSchema = z.enum(["active", "inactive", "suspended"]);
const workspaceInput = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(80).default("operacao"),
  customer_id: z.string().uuid().optional().nullable(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  status: statusSchema.default("active"),
});
const workspacePatch = workspaceInput.omit({ customer_id: true }).partial();

function slugify(value: string) {
  const suffix = randomBytes(3).toString("hex");
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${slug || "workspace"}-${suffix}`;
}

async function workspaceCounts(admin: SupabaseClient, workspaceIds: string[]) {
  if (!workspaceIds.length) return new Map<string, Record<string, number>>();
  const tables = [
    ["users", "users_count"],
    ["flows", "flows_count"],
    ["contacts", "contacts_count"],
    ["whatsapp_connections", "whatsapp_numbers_count"],
    ["ai_agents", "agents_count"],
  ] as const;

  const results = await Promise.all(
    tables.map(async ([table, key]) => {
      const { data } = await admin.from(table).select("id,workspace_id").in("workspace_id", workspaceIds);
      return { key, rows: data ?? [] };
    }),
  );

  const map = new Map<string, Record<string, number>>();
  for (const id of workspaceIds) {
    map.set(id, {
      users_count: 0,
      flows_count: 0,
      contacts_count: 0,
      whatsapp_numbers_count: 0,
      agents_count: 0,
    });
  }

  for (const result of results) {
    for (const row of result.rows as Array<{ workspace_id?: string | null }>) {
      if (!row.workspace_id) continue;
      const current = map.get(row.workspace_id);
      if (current) current[result.key] += 1;
    }
  }
  return map;
}

async function listWorkspaces(context: Awaited<ReturnType<typeof getRequestContext>>) {
  let query = context.admin
    .from("workspaces")
    .select("id,customer_id,name,slug,description,category,color,logo_url,status,plan,created_at,updated_at,customer:customers(id,name,company,status,plan_id)")
    .order("created_at", { ascending: false });

  if (context.role !== "admin_master") {
    if (context.customerId) query = query.eq("customer_id", context.customerId);
    else query = query.eq("id", context.workspaceId);
  } else if (context.isImpersonating && context.customerId) {
    query = query.eq("customer_id", context.customerId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const workspaceIds = (data ?? []).map((workspace) => workspace.id);
  const counts = await workspaceCounts(context.admin, workspaceIds);
  return (data ?? []).map((workspace) => ({
    ...workspace,
    is_current: workspace.id === context.workspaceId,
    ...(counts.get(workspace.id) ?? {}),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    return NextResponse.json({
      current_workspace_id: context.workspaceId,
      workspaces: await listWorkspaces(context),
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    requireActiveCustomer(context);
    const parsed = workspaceInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Workspace inválido." }, { status: 400 });
    }

    const customerId = context.role === "admin_master" && parsed.data.customer_id
      ? parsed.data.customer_id
      : context.customerId;
    if (!customerId) return NextResponse.json({ error: "Selecione um cliente para criar o Workspace." }, { status: 400 });

    const [{ count, error: countError }, entitlements] = await Promise.all([
      context.admin.from("workspaces").select("id", { count: "exact", head: true }).eq("customer_id", customerId),
      getPlanEntitlements({ admin: context.admin, customerId }),
    ]);
    if (countError) throw countError;
    const limit = entitlements.limits?.workspaces;
    if (typeof limit === "number" && limit >= 0 && (count ?? 0) >= limit) {
      await writeAuditLog({
        admin: context.admin,
        workspaceId: context.adminWorkspaceId ?? context.workspaceId,
        userId: context.profileId,
        request,
        action: "limit.reached",
        targetType: "plan",
        targetId: entitlements.planId,
        details: { limit: "workspaces", allowed: limit, current_count: count ?? 0 },
      });
      return NextResponse.json({ error: "Limite de Workspaces atingido." }, { status: 409 });
    }

    const { data: customer } = await context.admin
      .from("customers")
      .select("plan_id")
      .eq("id", customerId)
      .maybeSingle();

    const { data, error } = await context.admin
      .from("workspaces")
      .insert({
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        owner_id: context.authUserId ?? context.profileId,
        plan: customer?.plan_id ?? entitlements.planId ?? "start",
        customer_id: customerId,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        color: parsed.data.color,
        status: parsed.data.status,
        settings: {
          notifications: {},
          theme: "dark",
          accent: "emerald",
          created_by: "ozion_admin",
        },
      })
      .select("id,name,slug,customer_id,status,plan,description,category,color,logo_url,created_at,updated_at")
      .single();
    if (error) throw error;

    if (context.profileId) {
      await context.admin.from("workspace_users").upsert({
        workspace_id: data.id,
        user_id: context.profileId,
        role: "owner",
        status: "active",
      }, { onConflict: "workspace_id,user_id" });
    }

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "workspace.created",
      targetType: "workspace",
      targetId: data.id,
      details: { customer_id: customerId, name: data.name },
    });

    return NextResponse.json({ workspace: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do Workspace é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    const parsed = workspacePatch.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Workspace inválido." }, { status: 400 });
    }

    let query = context.admin.from("workspaces").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id);
    if (context.role !== "admin_master" && context.customerId) query = query.eq("customer_id", context.customerId);
    const { data, error } = await query
      .select("id,name,slug,customer_id,status,plan,description,category,color,logo_url,created_at,updated_at")
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "workspace.edited",
      targetType: "workspace",
      targetId: id,
      details: parsed.data,
    });
    return NextResponse.json({ workspace: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do Workspace é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");

    const { data: workspace, error: workspaceError } = await context.admin
      .from("workspaces")
      .select("id,customer_id")
      .eq("id", id)
      .maybeSingle();
    if (workspaceError) throw workspaceError;
    if (!workspace?.id) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
    if (context.role !== "admin_master" && workspace.customer_id !== context.customerId) {
      return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
    }

    const [{ count: usersCount }, { count: channelsCount }] = await Promise.all([
      context.admin.from("workspace_users").select("id", { count: "exact", head: true }).eq("workspace_id", id).eq("status", "active"),
      context.admin.from("whatsapp_connections").select("id", { count: "exact", head: true }).eq("workspace_id", id).eq("status", "connected"),
    ]);
    if ((usersCount ?? 0) > 0) {
      return NextResponse.json({ error: "Não é possível excluir: este Workspace possui usuários ativos." }, { status: 409 });
    }
    if ((channelsCount ?? 0) > 0) {
      return NextResponse.json({ error: "Não é possível excluir: este Workspace possui canais WhatsApp conectados." }, { status: 409 });
    }

    const { error } = await context.admin.from("workspaces").delete().eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "workspace.deleted",
      targetType: "workspace",
      targetId: id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
