import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMetaPurchaseEvent } from "@/lib/services/meta-ctwa";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const input = z.object({
  phone: z.string().trim().min(7),
  value: z.coerce.number().positive(),
  currency: z.string().trim().length(3).default("BRL"),
  eventId: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Evento inválido." }, { status: 400 });
    }
    const { data: integration, error } = await admin
      .from("integrations")
      .select("credentials,config")
      .eq("workspace_id", workspaceId)
      .eq("type", "meta_ctwa")
      .eq("status", "connected")
      .single();
    if (error || !integration) return NextResponse.json({ error: "Meta CTWA não conectada." }, { status: 409 });
    const result = await sendMetaPurchaseEvent({
      config: {
        accessToken: String(integration.credentials.accessToken),
        adAccountId: String(integration.config.adAccountId),
        pixelId: String(integration.config.pixelId),
        testEventCode: integration.config.testEventCode || undefined,
      },
      ...parsed.data,
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
