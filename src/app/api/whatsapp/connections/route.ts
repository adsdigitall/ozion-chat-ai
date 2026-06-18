import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

const connectionInput = z.object({
  display_name: z.string().trim().min(1).max(120),
  phone_number: z.string().trim().min(7).max(30),
  phone_number_id: z.string().trim().min(1).max(100),
  waba_id: z.string().trim().max(100).nullable().optional(),
  business_id: z.string().trim().max(100).nullable().optional(),
  access_token: z.string().trim().min(20),
  type: z.enum(["cloud_api", "qrcode"]).default("cloud_api"),
});

const safeConnectionSelect = "id,workspace_id,phone_number,display_name,status,type,created_at,updated_at";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const { data, error } = await admin
      .from("whatsapp_connections")
      .select(safeConnectionSelect)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ connections: data ?? [] });
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
    await requirePlanModule({ context, request, module: "whatsapp" });
    const parsed = connectionInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid connection." }, { status: 400 });
    }

    const graphVersion = process.env.META_GRAPH_API_VERSION || "v23.0";
    const verificationResponse = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(parsed.data.phone_number_id)}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${parsed.data.access_token}` },
        cache: "no-store",
      }
    );
    const verification = await verificationResponse.json() as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string };
    };
    if (!verificationResponse.ok) {
      return NextResponse.json(
        { error: verification.error?.message || "A Meta recusou o token ou o ID do telefone." },
        { status: 400 }
      );
    }

    const { count, error: countError } = await admin
      .from("whatsapp_connections")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "connected");
    if (countError) throw countError;
    await requirePlanLimit({
      context,
      request,
      limit: "whatsapp_numbers",
      currentCount: count ?? 0,
      message: "Limite de números WhatsApp atingido.",
    });

    const { data, error } = await admin
      .from("whatsapp_connections")
      .insert({
        ...parsed.data,
        display_name: verification.verified_name || parsed.data.display_name,
        phone_number: verification.display_phone_number || parsed.data.phone_number,
        workspace_id: workspaceId,
        created_by: profileId,
        status: "connected",
        config: { graph_api_version: graphVersion, verified_at: new Date().toISOString() },
      })
      .select(safeConnectionSelect)
      .single();
    if (error) throw error;
    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Connection id is required." }, { status: 400 });

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId } = context;
    const { error } = await admin
      .from("whatsapp_connections")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
