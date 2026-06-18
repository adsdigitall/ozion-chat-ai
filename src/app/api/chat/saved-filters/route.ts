import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";

const savedFilterInput = z.object({
  name: z.string().trim().min(2).max(80),
  filters_json: z.record(z.string(), z.unknown()),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId } = context;
    const { data, error } = await admin
      .from("saved_filters")
      .select("id,name,module,filters_json,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("module", "chat")
      .or(`user_id.eq.${profileId},user_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ saved_filters: data ?? [] });
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
    const parsed = savedFilterInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Filtro inválido." }, { status: 400 });
    const { data, error } = await admin
      .from("saved_filters")
      .insert({
        name: parsed.data.name,
        module: "chat",
        filters: parsed.data.filters_json,
        filters_json: parsed.data.filters_json,
        workspace_id: workspaceId,
        customer_id: customerId,
        user_id: profileId,
        created_by: profileId,
      })
      .select("id,name,module,filters_json,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "chat_filter.saved", targetType: "saved_filter", targetId: data.id });
    return NextResponse.json({ saved_filter: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
