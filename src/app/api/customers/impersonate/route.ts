import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const impersonateInput = z.object({
  customerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    if (context.role !== "admin_master") throw new Error("FORBIDDEN");

    const parsed = impersonateInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    const { data: customer, error } = await context.admin
      .from("customers")
      .select("id,name,status")
      .eq("id", parsed.data.customerId)
      .single();
    if (error) throw error;
    if (customer.status === "suspended") {
      return NextResponse.json({ error: "Não é possível entrar em cliente suspenso." }, { status: 409 });
    }

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "customer.impersonated",
      targetType: "customer",
      targetId: customer.id,
      details: { customer_name: customer.name },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("ozion_impersonation_customer_id", customer.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return response;
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("ozion_impersonation_customer_id", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
