import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";

const fieldInput = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["text", "number", "date", "select", "boolean", "url"]),
  options_json: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  required: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const { data, error } = await admin
      .from("custom_fields")
      .select("id,name,type,options_json,required,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ fields: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, customerId, profileId } = context;
    const parsed = fieldInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Campo inválido." }, { status: 400 });

    const { data, error } = await admin
      .from("custom_fields")
      .insert({
        ...parsed.data,
        customer_id: customerId,
        workspace_id: workspaceId,
        created_by: profileId,
      })
      .select("id,name,type,options_json,required,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "custom_field.created", targetType: "custom_field", targetId: data.id, details: { name: data.name } });
    return NextResponse.json({ field: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do campo é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;
    const parsed = fieldInput.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Campo inválido." }, { status: 400 });

    const { data, error } = await admin
      .from("custom_fields")
      .update({ ...parsed.data, updated_by: profileId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("id,name,type,options_json,required,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "custom_field.updated", targetType: "custom_field", targetId: id, details: { name: data.name } });
    return NextResponse.json({ field: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do campo é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;
    const { error } = await admin.from("custom_fields").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "custom_field.deleted", targetType: "custom_field", targetId: id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
