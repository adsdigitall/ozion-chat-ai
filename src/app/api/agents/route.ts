import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

const agentInput = z.object({
  name: z.string().trim().min(1).max(120),
  avatar: z.string().trim().max(20).nullable().optional(),
  provider: z.enum(["openai", "openrouter", "gemini", "claude", "deepseek", "groq", "dify"]),
  model: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(30000),
  objective: z.string().trim().max(2000).nullable().optional(),
  rules: z.array(z.string().max(1000)).max(100).default([]),
  knowledge_base: z.array(z.string().max(10000)).max(100).default([]),
  memory: z.boolean().default(true),
  max_tokens: z.coerce.number().int().min(64).max(100000).default(4096),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  status: z.enum(["active", "inactive"]).default("active"),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin
      .from("ai_agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ agents: data ?? [] });
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
    await requirePlanModule({ context, request, module: "agents" });
    const parsed = agentInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid agent." }, { status: 400 });
    }
    const { count, error: countError } = await admin
      .from("ai_agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (countError) throw countError;
    await requirePlanLimit({
      context,
      request,
      limit: "agents",
      currentCount: count ?? 0,
      message: "Limite de agentes IA atingido. Faça upgrade do plano.",
    });

    const { data, error } = await admin
      .from("ai_agents")
      .insert({ ...parsed.data, workspace_id: workspaceId, conversations_handled: 0, created_by: profileId })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Agent id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId } = context;
    const parsed = agentInput.partial().safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid agent." }, { status: 400 });
    }
    const { data, error } = await admin
      .from("ai_agents")
      .update({ ...parsed.data, updated_by: profileId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ agent: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Agent id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const { error } = await admin.from("ai_agents").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
