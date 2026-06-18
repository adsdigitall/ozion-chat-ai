import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";

const integrationInput = z.object({
  type: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  status: z.enum(["connected", "disconnected", "error"]).default("connected"),
  apiKey: z.string().trim().min(1).max(4096).optional(),
  baseUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  config: z.record(z.string(), z.unknown()).optional(),
});

function safeIntegration(integration: Record<string, unknown>) {
  const credentials =
    integration.credentials && typeof integration.credentials === "object"
      ? (integration.credentials as Record<string, unknown>)
      : {};

  const safe = { ...integration };
  delete safe.credentials;
  return {
    ...safe,
    configured: Object.keys(credentials).length > 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin
      .from("integrations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      integrations: (data ?? []).map((integration) => safeIntegration(integration)),
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "integrations" });
    const { admin, workspaceId, profileId } = context;
    const parsed = integrationInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Integração inválida." },
        { status: 400 },
      );
    }

    const { apiKey, baseUrl, config, ...input } = parsed.data;
    const { data: existing, error: existingError } = await admin
      .from("integrations")
      .select("credentials,config")
      .eq("workspace_id", workspaceId)
      .eq("type", input.type)
      .maybeSingle();
    if (existingError) throw existingError;

    const credentials = apiKey ? { apiKey } : (existing?.credentials ?? {});
    const mergedConfig = {
      ...((existing?.config as Record<string, unknown> | null) ?? {}),
      ...(config ?? {}),
      ...(baseUrl !== undefined ? { baseUrl } : {}),
    };
    const { data, error } = await admin
      .from("integrations")
      .upsert(
        {
          ...input,
          workspace_id: workspaceId,
          created_by: profileId,
          updated_by: profileId,
          credentials,
          config: mergedConfig,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,type" },
      )
      .select()
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "integration.connected",
      targetType: "integration",
      targetId: data.id,
      details: { type: data.type, name: data.name },
    });

    return NextResponse.json({ integration: safeIntegration(data) }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "O ID da integração é obrigatório." }, { status: 400 });
    }

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "integrations" });
    const { admin, workspaceId, profileId } = context;
    const body = z
      .object({
        status: z.enum(["connected", "disconnected", "error"]).optional(),
        apiKey: z.string().trim().min(1).max(4096).optional(),
        baseUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
      })
      .safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Atualização inválida." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    };
    if (body.data.status) updates.status = body.data.status;
    if (body.data.apiKey) updates.credentials = { apiKey: body.data.apiKey };
    if (body.data.baseUrl !== undefined) updates.config = { baseUrl: body.data.baseUrl };

    const { data, error } = await admin
      .from("integrations")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ integration: safeIntegration(data) });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "O ID da integração é obrigatório." }, { status: 400 });
    }

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "integrations" });
    const { admin, workspaceId, profileId } = context;
    const { data: integration, error: lookupError } = await admin
      .from("integrations")
      .select("name,type")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const { error } = await admin
      .from("integrations")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "integration.disconnected",
      targetType: "integration",
      targetId: id,
      details: { name: integration?.name, type: integration?.type },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
