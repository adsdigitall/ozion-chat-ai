import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";

const sendInput = z.object({
  to: z.string().trim().min(7),
  type: z.enum(["text", "image", "audio", "video", "document", "template"]),
  content: z.union([
    z.string().trim().min(1),
    z.object({
      url: z.string().url().optional(),
      caption: z.string().optional(),
      filename: z.string().optional(),
      name: z.string().optional(),
      language: z.string().optional(),
      components: z.array(z.unknown()).optional(),
    }),
  ]),
  connectionId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = sendInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
    }

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId } = context;
    const { data: connection, error: connectionError } = await admin
      .from("whatsapp_connections")
      .select("*")
      .eq("id", parsed.data.connectionId)
      .eq("workspace_id", workspaceId)
      .single();
    if (connectionError || !connection) {
      return NextResponse.json({ error: "WhatsApp connection not found." }, { status: 404 });
    }
    if (!connection.access_token || !connection.phone_number_id) {
      return NextResponse.json({ error: "The official WhatsApp credentials are incomplete." }, { status: 409 });
    }

    const whatsapp = new WhatsAppService({
      accessToken: connection.access_token,
      phoneNumberId: connection.phone_number_id,
      wabaId: connection.waba_id ?? "",
      businessId: connection.business_id ?? "",
      verifyToken: "",
      graphApiVersion:
        typeof connection.config?.graph_api_version === "string"
          ? connection.config.graph_api_version
          : process.env.META_GRAPH_API_VERSION || "v23.0",
    });

    let result: { messages?: Array<{ id?: string }> };
    if (parsed.data.type === "text" && typeof parsed.data.content === "string") {
      result = await whatsapp.sendText(parsed.data.to, parsed.data.content);
    } else if (parsed.data.type === "image" && typeof parsed.data.content !== "string" && parsed.data.content.url) {
      result = await whatsapp.sendImage(parsed.data.to, parsed.data.content.url, parsed.data.content.caption);
    } else if (parsed.data.type === "audio" && typeof parsed.data.content !== "string" && parsed.data.content.url) {
      result = await whatsapp.sendAudio(parsed.data.to, parsed.data.content.url);
    } else if (parsed.data.type === "video" && typeof parsed.data.content !== "string" && parsed.data.content.url) {
      result = await whatsapp.sendVideo(parsed.data.to, parsed.data.content.url, parsed.data.content.caption);
    } else if (parsed.data.type === "document" && typeof parsed.data.content !== "string" && parsed.data.content.url) {
      result = await whatsapp.sendDocument(
        parsed.data.to,
        parsed.data.content.url,
        parsed.data.content.caption,
        parsed.data.content.filename,
      );
    } else if (parsed.data.type === "template" && typeof parsed.data.content !== "string" && parsed.data.content.name) {
      result = await whatsapp.sendTemplate(
        parsed.data.to,
        parsed.data.content.name,
        parsed.data.content.language ?? "pt_BR",
        parsed.data.content.components
      );
    } else {
      return NextResponse.json({ error: "Message content does not match its type." }, { status: 400 });
    }

    const whatsappMessageId = result.messages?.[0]?.id ?? null;
    if (parsed.data.conversationId) {
      await admin.from("messages").insert({
        conversation_id: parsed.data.conversationId,
        content: typeof parsed.data.content === "string" ? parsed.data.content : parsed.data.content.caption ?? parsed.data.content.name,
        type: parsed.data.type,
        sender: "agent",
        sender_id: profileId,
        read: false,
        whatsapp_message_id: whatsappMessageId,
        metadata: { connection_id: connection.id },
      });
      await admin
        .from("conversations")
        .update({ updated_at: new Date().toISOString(), unread_count: 0 })
        .eq("id", parsed.data.conversationId)
        .eq("workspace_id", workspaceId);
    }

    return NextResponse.json({ success: true, messageId: whatsappMessageId });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
