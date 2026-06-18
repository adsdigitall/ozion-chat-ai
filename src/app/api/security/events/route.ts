import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, writeAuditLog } from "@/lib/server/supabase-admin";

const securityEventInput = z.object({
  action: z.enum(["auth.login", "auth.logout", "data.exported", "access.denied"]),
  targetType: z.string().trim().max(80).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const parsed = securityEventInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Evento inválido." }, { status: 400 });
    }

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: parsed.data.action,
      targetType: parsed.data.targetType ?? "security",
      details: parsed.data.details ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
