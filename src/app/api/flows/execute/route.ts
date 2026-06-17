import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeConversationFlow } from "@/lib/server/flow-engine";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const input = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(30000),
});

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Teste inválido." }, { status: 400 });
    }
    const { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("id", parsed.data.conversationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    const result = await executeConversationFlow({
      admin,
      conversationId: parsed.data.conversationId,
      incomingText: parsed.data.message,
    });
    return NextResponse.json(result);
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
