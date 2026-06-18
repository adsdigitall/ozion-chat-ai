import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";

const saleInput = z.object({
  contact_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive(),
  platform: z.string().trim().min(1).max(80),
  status: z.enum(["completed", "refunded", "pending"]),
  product: z.string().trim().min(1).max(180),
  external_id: z.string().trim().max(200).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    await requirePlanModule({ context, request, module: "sales" });
    const { admin, workspaceId } = context;
    const { data, error } = await admin
      .from("sales")
      .select("*,contact:contacts(id,name,phone,email)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ sales: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "sales" });
    const { admin, workspaceId, profileId } = context;
    const parsed = saleInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid sale." }, { status: 400 });
    const { data, error } = await admin.from("sales").insert({ ...parsed.data, workspace_id: workspaceId, created_by: profileId }).select("*,contact:contacts(id,name,phone,email)").single();
    if (error) throw error;
    return NextResponse.json({ sale: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Sale id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "sales" });
    const { admin, workspaceId, profileId } = context;
    const parsed = saleInput.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid sale." }, { status: 400 });
    const { data, error } = await admin.from("sales").update({ ...parsed.data, updated_by: profileId }).eq("id", id).eq("workspace_id", workspaceId).select("*,contact:contacts(id,name,phone,email)").single();
    if (error) throw error;
    return NextResponse.json({ sale: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Sale id is required." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "sales" });
    const { admin, workspaceId } = context;
    const { error } = await admin.from("sales").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
