import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

const userInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(250),
  role: z.enum(["admin_master", "client", "manager", "attendant"]).default("attendant"),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "users.view");
    const { admin, workspaceId, customerId } = context;
    const scope = request.nextUrl.searchParams.get("scope");
    let query = admin
      .from("users")
      .select("id,name,email,avatar,role,auth_id,customer_id,workspace_id,created_at,updated_at");
    query = scope === "customer" && customerId
      ? query.eq("customer_id", customerId)
      : query.eq("workspace_id", workspaceId);
    const { data, error } = await query
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
    requirePermission(context, "users.view");
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId, customerId } = context;
    await requirePlanModule({ context, request, module: "workspaces" });
    const parsed = userInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Usuário inválido." }, { status: 400 });
    }

    const { count, error: countError } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (countError) throw countError;
    await requirePlanLimit({
      context,
      request,
      limit: "users",
      currentCount: count ?? 0,
      message: "Limite de usuários atingido. Faça upgrade do plano.",
    });

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { name: parsed.data.name, workspace_id: workspaceId },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/login`,
      },
    );
    if (inviteError) throw inviteError;

    const { data, error } = await admin
      .from("users")
      .insert({
        ...parsed.data,
        auth_id: invited.user.id,
        workspace_id: workspaceId,
        customer_id: customerId,
      })
      .select("id,name,email,avatar,role,auth_id,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "user.invited",
      targetType: "user",
      targetId: data.id,
      details: { name: data.name, email: data.email, role: data.role },
    });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do usuário é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "users.view");
    const { admin, workspaceId } = context;
    const parsed = userInput.partial().safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Usuário inválido." }, { status: 400 });
    }
    const { data, error } = await admin
      .from("users")
      .update(parsed.data)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("id,name,email,avatar,role,auth_id,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do usuário é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requirePermission(context, "users.view");
    const { admin, workspaceId, profileId } = context;
    if (id === profileId) {
      return NextResponse.json({ error: "Você não pode remover seu próprio usuário." }, { status: 409 });
    }
    const { data: user, error: lookupError } = await admin
      .from("users")
      .select("auth_id,role")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (lookupError) throw lookupError;
    if (user.role === "admin_master") {
      return NextResponse.json({ error: "O Admin Master não pode ser removido." }, { status: 409 });
    }
    const { error } = await admin.from("users").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    if (user.auth_id) await admin.auth.admin.deleteUser(user.auth_id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
