import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

const flowInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  nodes: z.array(z.unknown()).max(500),
  edges: z.array(z.unknown()).max(1000),
  status: z.enum(["draft", "published"]).default("draft"),
  trigger_type: z.enum(["keyword", "flow", "api", "webhook", "schedule"]).nullable().optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const id = request.nextUrl.searchParams.get("id");

    let query = admin
      .from("flows")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });
    if (id) query = query.eq("id", id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ flows: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId } = context;
    await requirePlanModule({ context, request, module: "flows" });
    const parsed = flowInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid flow." }, { status: 400 });
    }

    const { id, ...input } = parsed.data;
    if (id) {
      const { data, error } = await admin
        .from("flows")
        .update({ ...input, updated_by: profileId, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ flow: data });
    }

    const { count, error: countError } = await admin
      .from("flows")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (countError) throw countError;
    await requirePlanLimit({
      context,
      request,
      limit: "flows",
      currentCount: count ?? 0,
      message: "Limite de fluxos atingido. Faça upgrade do plano.",
    });

    const { data, error } = await admin
      .from("flows")
      .insert({ ...input, workspace_id: workspaceId, created_by: profileId })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ flow: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
