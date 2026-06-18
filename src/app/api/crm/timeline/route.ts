import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";

const queryInput = z.object({
  contact_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const parsed = queryInput.safeParse({ contact_id: request.nextUrl.searchParams.get("contact_id") });
    if (!parsed.success) return NextResponse.json({ error: "Contato inválido." }, { status: 400 });

    const { data, error } = await admin
      .from("contact_timeline")
      .select("id,event_type,title,description,metadata_json,created_at,user:users(name,email)")
      .eq("workspace_id", workspaceId)
      .eq("contact_id", parsed.data.contact_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
