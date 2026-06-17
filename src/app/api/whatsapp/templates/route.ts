import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const queryInput = z.object({
  connectionId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = queryInput.safeParse({
      connectionId: request.nextUrl.searchParams.get("connectionId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Connection id is required." }, { status: 400 });
    }

    const { admin, workspaceId } = await getRequestContext(request);
    const { data: connection, error } = await admin
      .from("whatsapp_connections")
      .select("*")
      .eq("id", parsed.data.connectionId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error || !connection) return NextResponse.json({ error: "WhatsApp connection not found." }, { status: 404 });
    if (!connection.access_token || !connection.phone_number_id || !connection.waba_id) {
      return NextResponse.json({ error: "Credenciais oficiais incompletas para listar templates." }, { status: 409 });
    }

    const whatsapp = new WhatsAppService({
      accessToken: connection.access_token,
      phoneNumberId: connection.phone_number_id,
      wabaId: connection.waba_id,
      businessId: connection.business_id ?? "",
      verifyToken: "",
      graphApiVersion:
        typeof connection.config?.graph_api_version === "string"
          ? connection.config.graph_api_version
          : process.env.META_GRAPH_API_VERSION || "v23.0",
    });

    const result = await whatsapp.getMessageTemplates();
    return NextResponse.json({ templates: result.data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
