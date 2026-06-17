import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const conversationPatch = z.object({
  status: z.enum(["open", "waiting", "closed"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  unread_count: z.coerce.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const status = request.nextUrl.searchParams.get("status");
    const id = request.nextUrl.searchParams.get("id");

    let query = admin
      .from("conversations")
      .select(`
        *,
        contact:contacts(*),
        assigned_user:users!conversations_assigned_to_fkey(id,name,email,avatar),
        connection:whatsapp_connections(id,display_name,phone_number,status,type),
        messages(*)
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .order("created_at", { referencedTable: "messages", ascending: true });

    if (id) query = query.eq("id", id);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const conversations = (data ?? []).map((conversation) => ({
      ...conversation,
      messages: conversation.messages ?? [],
      last_message: conversation.messages?.at(-1) ?? null,
    }));

    return NextResponse.json({ conversations, total: conversations.length });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Conversation id is required." }, { status: 400 });

    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = conversationPatch.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid conversation." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("conversations")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ conversation: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
