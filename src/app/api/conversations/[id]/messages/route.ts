import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const messageInput = z.object({
  content: z.string().trim().min(1).max(10000),
  type: z.enum(["text", "image", "video", "audio", "document", "sticker", "template", "flow", "location", "contact"]).default("text"),
  sender: z.enum(["agent", "ai", "system"]).default("agent"),
  sender_name: z.string().trim().max(120).optional(),
  media_url: z.string().url().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    const parsed = messageInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
    }

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("messages")
      .insert({
        ...parsed.data,
        conversation_id: id,
        sender_id: parsed.data.sender === "agent" ? profileId : null,
        read: true,
      })
      .select()
      .single();
    if (error) throw error;

    await admin
      .from("conversations")
      .update({ updated_at: new Date().toISOString(), unread_count: 0 })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
