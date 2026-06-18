import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const membershipInput = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["owner", "manager", "attendant"]).default("attendant"),
  status: z.enum(["active", "invited", "inactive"]).default("active"),
});

async function canManageWorkspace(context: Awaited<ReturnType<typeof getRequestContext>>, workspaceId: string) {
  if (context.role === "admin_master") return true;
  const { data } = await context.admin
    .from("workspaces")
    .select("id,customer_id")
    .eq("id", workspaceId)
    .eq("customer_id", context.customerId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "Workspace é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    if (!(await canManageWorkspace(context, workspaceId))) {
      return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
    }

    const { data, error } = await context.admin
      .from("workspace_users")
      .select("id,workspace_id,user_id,role,status,created_at,user:users(id,name,email,role)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    const parsed = membershipInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Usuário inválido." }, { status: 400 });
    }
    if (!(await canManageWorkspace(context, parsed.data.workspace_id))) {
      return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
    }

    const { data: user, error: userError } = await context.admin
      .from("users")
      .select("id,customer_id")
      .eq("id", parsed.data.user_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user?.id) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (context.role !== "admin_master" && user.customer_id !== context.customerId) {
      return NextResponse.json({ error: "Usuário não pertence ao cliente atual." }, { status: 403 });
    }

    const { data, error } = await context.admin
      .from("workspace_users")
      .upsert(parsed.data, { onConflict: "workspace_id,user_id" })
      .select("id,workspace_id,user_id,role,status,created_at,user:users(id,name,email,role)")
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: parsed.data.workspace_id,
      userId: context.profileId,
      request,
      action: "workspace.user_added",
      targetType: "user",
      targetId: parsed.data.user_id,
      details: { role: parsed.data.role, status: parsed.data.status },
    });

    return NextResponse.json({ membership: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do vínculo é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    const parsed = membershipInput.pick({ role: true, status: true }).partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Vínculo inválido." }, { status: 400 });

    const { data: existing, error: lookupError } = await context.admin
      .from("workspace_users")
      .select("id,workspace_id,user_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing?.id) return NextResponse.json({ error: "Vínculo não encontrado." }, { status: 404 });
    if (!(await canManageWorkspace(context, existing.workspace_id))) {
      return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
    }

    const { data, error } = await context.admin
      .from("workspace_users")
      .update(parsed.data)
      .eq("id", id)
      .select("id,workspace_id,user_id,role,status,created_at,user:users(id,name,email,role)")
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: existing.workspace_id,
      userId: context.profileId,
      request,
      action: "workspace.user_updated",
      targetType: "user",
      targetId: existing.user_id,
      details: parsed.data,
    });

    return NextResponse.json({ membership: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do vínculo é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");

    const { data: existing, error: lookupError } = await context.admin
      .from("workspace_users")
      .select("id,workspace_id,user_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing?.id) return NextResponse.json({ error: "Vínculo não encontrado." }, { status: 404 });
    if (!(await canManageWorkspace(context, existing.workspace_id))) {
      return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
    }

    const { error } = await context.admin.from("workspace_users").delete().eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: existing.workspace_id,
      userId: context.profileId,
      request,
      action: "workspace.user_removed",
      targetType: "user",
      targetId: existing.user_id,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
