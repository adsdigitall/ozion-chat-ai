import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const resetInput = z.object({
  customerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    const parsed = resetInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });

    const { data: customer, error } = await context.admin
      .from("customers")
      .select("id,email")
      .eq("id", parsed.data.customerId)
      .single();
    if (error) throw error;

    const { data: linkData, error: linkError } = await context.admin.auth.admin.generateLink({
      type: "recovery",
      email: customer.email,
    });
    if (linkError) throw linkError;

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "customer.password_reset",
      targetType: "customer",
      targetId: customer.id,
      details: { email: customer.email },
    });

    return NextResponse.json({
      success: true,
      reset_link: linkData.properties?.action_link ?? null,
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
