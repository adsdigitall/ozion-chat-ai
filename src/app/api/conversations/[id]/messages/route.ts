import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";

const messageInput = z.object({
  content: z.string().trim().min(1).max(10000),
  message_type: z.enum(["text", "image", "audio", "video", "document", "template", "internal_note", "flow"]).default("text"),
  sender_type: z.enum(["human", "ai", "system", "flow"]).default("human"),
  sender_name: z.string().trim().max(120).optional(),
  media_url: z.string().url().nullable().optional(),
  metadata_json: z.record(z.string(), z.unknown()).optional(),
});

const legacySender: Record<string, string> = {
  human: "agent",
  ai: "ai",
  system: "system",
  flow: "system",
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const requestContext = await getRequestContext(request);
    requireActiveCustomer(requestContext);
    const { admin, workspaceId, customerId, profileId, role } = requestContext;
    const parsed = messageInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Mensagem inválida." }, { status: 400 });

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id,contact_id,assigned_to,assigned_user_id")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (conversationError || !conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    if (role === "attendant" && conversation.assigned_user_id && conversation.assigned_user_id !== profileId) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const sender = legacySender[parsed.data.sender_type] ?? "system";
    const { data, error } = await admin
      .from("messages")
      .insert({
        conversation_id: id,
        contact_id: conversation.contact_id,
        customer_id: customerId,
        workspace_id: workspaceId,
        content: parsed.data.content,
        type: parsed.data.message_type === "internal_note" ? "text" : parsed.data.message_type,
        message_type: parsed.data.message_type,
        sender,
        sender_type: parsed.data.sender_type,
        sender_id: parsed.data.sender_type === "human" ? profileId : null,
        sender_name: parsed.data.sender_name,
        media_url: parsed.data.media_url,
        metadata: parsed.data.metadata_json ?? {},
        metadata_json: parsed.data.metadata_json ?? {},
        status: "sent",
        read: true,
        created_by: profileId,
      })
      .select()
      .single();
    if (error) throw error;

    const visibleLastMessage = parsed.data.message_type === "internal_note" ? "Nota interna adicionada" : parsed.data.content;
    await admin
      .from("conversations")
      .update({
        updated_by: profileId,
        updated_at: new Date().toISOString(),
        last_message: visibleLastMessage,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: parsed.data.message_type === "internal_note" ? "conversation.internal_note_created" : "message.sent",
      targetType: "conversation",
      targetId: id,
      details: { message_type: parsed.data.message_type, sender_type: parsed.data.sender_type },
    });

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
