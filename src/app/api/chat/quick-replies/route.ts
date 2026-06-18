import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";

const quickReplyInput = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(80).default("Atendimento"),
  shortcut: z.string().trim().max(40).default(""),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const search = request.nextUrl.searchParams.get("search")?.trim();
    let query = admin
      .from("quick_replies")
      .select("id,title,message,category,shortcut,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (search) query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%,shortcut.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ quick_replies: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, customerId, profileId } = context;
    const parsed = quickReplyInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Resposta rápida inválida." }, { status: 400 });
    const { data, error } = await admin
      .from("quick_replies")
      .insert({ ...parsed.data, content: parsed.data.message, workspace_id: workspaceId, customer_id: customerId, created_by: profileId })
      .select("id,title,message,category,shortcut,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "quick_reply.created", targetType: "quick_reply", targetId: data.id });
    return NextResponse.json({ quick_reply: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
