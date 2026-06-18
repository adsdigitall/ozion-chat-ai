import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";

const campaignInput = z.object({
  name: z.string().trim().min(1).max(180),
  platform: z.enum(["meta", "google", "tiktok"]),
  status: z.enum(["active", "paused", "completed"]),
  budget: z.coerce.number().min(0),
  spent: z.coerce.number().min(0),
  leads: z.coerce.number().int().min(0),
  purchases: z.coerce.number().int().min(0),
  cpa: z.coerce.number().min(0),
  roi: z.coerce.number(),
  roas: z.coerce.number().min(0),
  external_id: z.string().trim().max(200).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    await requirePlanModule({ context, request, module: "campaigns" });
    const { admin, workspaceId } = context;
    const { data, error } = await admin.from("campaigns").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ campaigns: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "campaigns" });
    const { admin, workspaceId, profileId } = context;
    const parsed = campaignInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign." }, { status: 400 });
    const { data, error } = await admin.from("campaigns").insert({ ...parsed.data, workspace_id: workspaceId, created_by: profileId }).select().single();
    if (error) throw error;
    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "campaigns" });
    const { admin, workspaceId, profileId } = context;
    const parsed = campaignInput.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign." }, { status: 400 });
    const { data, error } = await admin.from("campaigns").update({ ...parsed.data, updated_by: profileId, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId).select().single();
    if (error) throw error;
    return NextResponse.json({ campaign: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "campaigns" });
    const { admin, workspaceId } = context;
    const { error } = await admin.from("campaigns").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
