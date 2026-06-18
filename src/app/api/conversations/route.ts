import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";

const conversationPatch = z.object({
  status: z.enum(["open", "waiting", "closed"]).optional(),
  assigned_user_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  ai_status: z.enum(["active", "paused"]).optional(),
  unread_count: z.coerce.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  action: z.enum(["open", "assume", "transfer", "close", "reopen", "activate_ai", "pause_ai"]).optional(),
});

function textParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  return value && value !== "all" ? value : null;
}

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId, profileId, role } = await getRequestContext(request);
    const id = textParam(request, "id");
    const tag = textParam(request, "tag");
    const search = textParam(request, "search")?.toLowerCase();

    let query = admin
      .from("conversations")
      .select(`
        *,
        contact:contacts(*),
        assigned_user:users!conversations_assigned_user_id_fkey(id,name,email,avatar),
        connection:whatsapp_connections(id,display_name,phone_number,status,type),
        conversation_tags(tag:tags(id,name,color,category,status)),
        messages(*)
      `)
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "messages", ascending: true });

    if (id) query = query.eq("id", id);
    for (const key of ["status", "assigned_user_id", "channel", "whatsapp_connection_id", "ai_status"] as const) {
      const value = textParam(request, key);
      if (value) query = query.eq(key, value);
    }
    const source = textParam(request, "source");
    const campaign = textParam(request, "campaign_id");
    const dateFrom = textParam(request, "date_from");
    const dateTo = textParam(request, "date_to");
    if (source) query = query.ilike("source", `%${source}%`);
    if (campaign) query = query.ilike("campaign_id", `%${campaign}%`);
    if (request.nextUrl.searchParams.get("unread") === "true") query = query.gt("unread_count", 0);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (role === "attendant" && profileId) {
      query = query.or(`assigned_user_id.eq.${profileId},assigned_user_id.is.null,assigned_to.eq.${profileId},assigned_to.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let conversations = (data ?? []).map((conversation) => ({
      ...conversation,
      tags: (conversation.conversation_tags ?? [])
        .map((item: { tag?: { id: string; name: string; color: string; category?: string; status?: string } }) => item.tag)
        .filter(Boolean),
      messages: conversation.messages ?? [],
      last_message_row: conversation.messages?.at(-1) ?? null,
    }));

    if (tag) {
      conversations = conversations.filter((conversation) =>
        conversation.tags.some((item: { id: string; name: string }) => item.id === tag || item.name === tag),
      );
    }
    if (search) {
      conversations = conversations.filter((conversation) => {
        const contact = Array.isArray(conversation.contact) ? conversation.contact[0] : conversation.contact;
        return [
          contact?.name,
          contact?.phone,
          contact?.email,
          conversation.phone_number,
          conversation.source,
          conversation.campaign_id,
          conversation.last_message,
          conversation.last_message_row?.content,
          ...conversation.tags.map((item: { name: string }) => item.name),
        ].some((value) => String(value ?? "").toLowerCase().includes(search));
      });
    }

    return NextResponse.json({ conversations, total: conversations.length });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID da conversa é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId, role } = context;
    const parsed = conversationPatch.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Conversa inválida." }, { status: 400 });

    const { data: current, error: currentError } = await admin
      .from("conversations")
      .select("id,assigned_to,assigned_user_id,status,metadata")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (currentError || !current) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    if (role === "attendant" && profileId && current.assigned_user_id && current.assigned_user_id !== profileId) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { action, ...input } = parsed.data;
    const updates: Record<string, unknown> = { ...input, updated_by: profileId, updated_at: new Date().toISOString() };
    if (action === "assume") {
      updates.assigned_user_id = profileId;
      updates.assigned_to = profileId;
      updates.status = "waiting";
    }
    if (action === "transfer") {
      const assignee = input.assigned_user_id ?? input.assigned_to ?? null;
      updates.assigned_user_id = assignee;
      updates.assigned_to = assignee;
      updates.status = "waiting";
    }
    if (action === "close") {
      updates.status = "closed";
      updates.closed_at = new Date().toISOString();
    }
    if (action === "reopen") {
      updates.status = "waiting";
      updates.closed_at = null;
    }
    if (action === "activate_ai") updates.ai_status = "active";
    if (action === "pause_ai") updates.ai_status = "paused";
    if (updates.assigned_user_id !== undefined) updates.assigned_to = updates.assigned_user_id;

    const { data, error } = await admin
      .from("conversations")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;

    if (action) {
      const actionMap: Record<string, string> = {
        open: "conversation.opened",
        assume: "conversation.assumed",
        transfer: "conversation.transferred",
        close: "conversation.closed",
        reopen: "conversation.reopened",
        activate_ai: "conversation.ai_activated",
        pause_ai: "conversation.ai_paused",
      };
      await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: actionMap[action], targetType: "conversation", targetId: id, details: updates });
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
