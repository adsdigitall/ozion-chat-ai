import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const switchInput = z.object({
  workspace_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "workspaces.view");
    const parsed = switchInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Workspace inválido." }, { status: 400 });
    }

    let query = context.admin
      .from("workspaces")
      .select("id,name,customer_id,status")
      .eq("id", parsed.data.workspace_id);
    if (context.role !== "admin_master") {
      if (context.customerId) query = query.eq("customer_id", context.customerId);
      else query = query.eq("id", context.workspaceId);
    } else if (context.isImpersonating && context.customerId) {
      query = query.eq("customer_id", context.customerId);
    }

    const { data: workspace, error } = await query.maybeSingle();
    if (error) throw error;
    if (!workspace?.id) {
      return NextResponse.json({ error: "Workspace não encontrado ou sem acesso." }, { status: 404 });
    }

    if (context.role !== "admin_master" && context.profileId) {
      const { data: membership, error: membershipError } = await context.admin
        .from("workspace_users")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("user_id", context.profileId)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.id && workspace.customer_id !== context.customerId) {
        return NextResponse.json({ error: "Você não tem acesso a este Workspace." }, { status: 403 });
      }
    }

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "workspace.switched",
      targetType: "workspace",
      targetId: workspace.id,
      details: { name: workspace.name },
    });

    const response = NextResponse.json({ workspace });
    response.cookies.set("ozion_workspace_id", workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
