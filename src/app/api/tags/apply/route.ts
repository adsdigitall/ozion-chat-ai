import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { applyTagToContact, applyTagToConversation, removeTagFromContact, removeTagFromConversation } from "@/lib/server/tags";

const applyInput = z.object({
  target_type: z.enum(["contact", "conversation"]),
  target_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const parsed = applyInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Etiqueta inválida." }, { status: 400 });

    if (parsed.data.target_type === "contact") {
      await applyTagToContact({ context, contactId: parsed.data.target_id, tagId: parsed.data.tag_id, request });
    } else {
      await applyTagToConversation({ context, conversationId: parsed.data.target_id, tagId: parsed.data.tag_id, request });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const parsed = applyInput.safeParse({
      target_type: request.nextUrl.searchParams.get("target_type"),
      target_id: request.nextUrl.searchParams.get("target_id"),
      tag_id: request.nextUrl.searchParams.get("tag_id"),
    });
    if (!parsed.success) return NextResponse.json({ error: "Etiqueta inválida." }, { status: 400 });

    if (parsed.data.target_type === "contact") {
      await removeTagFromContact({ context, contactId: parsed.data.target_id, tagId: parsed.data.tag_id, request });
    } else {
      await removeTagFromConversation({ context, conversationId: parsed.data.target_id, tagId: parsed.data.tag_id, request });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
