import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";
import { validateMetaCTWA } from "@/lib/services/meta-ctwa";

const input = z.object({
  accessToken: z.string().trim().min(20),
  adAccountId: z.string().trim().min(3).max(80),
  pixelId: z.string().trim().min(3).max(80),
  testEventCode: z.string().trim().max(120).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin
      .from("integrations")
      .select("id,status,config,last_sync_at,last_error")
      .eq("workspace_id", workspaceId)
      .eq("type", "meta_ctwa")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      connection: data
        ? {
            id: data.id,
            status: data.status,
            adAccountId: data.config?.adAccountId ?? "",
            pixelId: data.config?.pixelId ?? "",
            testEventCode: data.config?.testEventCode ?? "",
            lastSyncAt: data.last_sync_at,
            lastError: data.last_error,
          }
        : null,
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "ctwa" });
    const { admin, workspaceId, profileId } = context;
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados da Meta inválidos." }, { status: 400 });
    }
    const validation = await validateMetaCTWA(parsed.data);
    const { data, error } = await admin
      .from("integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          created_by: profileId,
          updated_by: profileId,
          type: "meta_ctwa",
          name: "Meta CTWA",
          status: "connected",
          credentials: { accessToken: parsed.data.accessToken },
          config: {
            adAccountId: parsed.data.adAccountId.replace(/^act_/, ""),
            pixelId: parsed.data.pixelId,
            testEventCode: parsed.data.testEventCode || "",
            accountName: validation.account.name,
            pixelName: validation.pixel.name,
          },
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,type" },
      )
      .select("id,status,config")
      .single();
    if (error) throw error;
    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "ctwa.connected",
      targetType: "integration",
      targetId: data.id,
      details: { adAccountId: data.config.adAccountId, pixelId: data.config.pixelId },
    });
    return NextResponse.json({ connection: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
