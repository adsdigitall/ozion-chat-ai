import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

const completionInput = z.object({
  code: z.string().trim().min(4),
  signup: z
    .object({
      phoneNumberId: z.string().trim().optional(),
      wabaId: z.string().trim().optional(),
      businessId: z.string().trim().optional(),
    })
    .partial()
    .optional(),
});

type TokenExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

type DebugTokenResponse = {
  data?: {
    is_valid?: boolean;
    granular_scopes?: Array<{
      scope?: string;
      target_ids?: string[];
    }>;
  };
  error?: { message?: string };
};

type PhoneNumberResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  error?: { message?: string };
};

type PhoneNumbersResponse = {
  data?: PhoneNumberResponse[];
  error?: { message?: string };
};

type SubscribeResult = {
  success: boolean;
  error?: string;
};

function graphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v23.0";
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${graphVersion()}/${path}`;
}

function requiredMetaEnv() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("O app oficial da Ozion ainda nao esta configurado.");
  }
  return { appId, appSecret };
}

async function exchangeCodeForToken(code: string) {
  const { appId, appSecret } = requiredMetaEnv();
  const url = new URL(graphUrl("oauth/access_token"));
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const redirectUri = process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI;
  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json() as TokenExchangeResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || "A Meta nao retornou a autorizacao do numero.");
  }
  return data;
}

async function fetchGraph<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(graphUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || "A Meta recusou a solicitacao.");
  }
  return data;
}

async function tryDebugWaba(accessToken: string) {
  const { appId, appSecret } = requiredMetaEnv();
  const inspectorToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN || `${appId}|${appSecret}`;
  const url = new URL(graphUrl("debug_token"));
  url.searchParams.set("input_token", accessToken);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${inspectorToken}` },
    cache: "no-store",
  });
  const data = await response.json() as DebugTokenResponse;
  if (!response.ok || !data.data?.is_valid) return null;

  const whatsappScope = data.data.granular_scopes?.find((scope) => scope.scope === "whatsapp_business_management");
  return whatsappScope?.target_ids?.[0] ?? null;
}

async function fetchPhoneInfo(accessToken: string, phoneNumberId?: string, wabaId?: string) {
  if (phoneNumberId) {
    return fetchGraph<PhoneNumberResponse>(
      `${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`,
      accessToken,
    );
  }

  if (!wabaId) throw new Error("A Meta nao informou o numero conectado.");

  const result = await fetchGraph<PhoneNumbersResponse>(
    `${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name`,
    accessToken,
  );
  const phone = result.data?.[0];
  if (!phone?.id) throw new Error("A Meta nao retornou nenhum numero para essa conta WhatsApp.");
  return phone;
}

async function subscribeAppToWaba(accessToken: string, wabaId?: string): Promise<SubscribeResult> {
  if (!wabaId) return { success: false, error: "WABA nao informada." };

  try {
    await fetchGraph<Record<string, unknown>>(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, {
      method: "POST",
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao assinar eventos da WABA.",
    };
  }
}

function safeConnection(row: Record<string, unknown>) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    phone_number: row.phone_number,
    display_name: row.display_name,
    status: row.status,
    type: row.type,
    messages_today: row.messages_today,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId } = context;
    await requirePlanModule({ context, request, module: "whatsapp" });
    const parsed = completionInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Conexao invalida." }, { status: 400 });
    }

    const token = await exchangeCodeForToken(parsed.data.code);
    const accessToken = token.access_token!;
    const wabaId = parsed.data.signup?.wabaId || await tryDebugWaba(accessToken) || undefined;
    const phone = await fetchPhoneInfo(accessToken, parsed.data.signup?.phoneNumberId, wabaId);
    const phoneNumberId = phone.id || parsed.data.signup?.phoneNumberId;
    if (!phoneNumberId) throw new Error("A Meta nao informou o identificador do numero.");

    const subscribe = await subscribeAppToWaba(accessToken, wabaId);
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
    const connectionPayload = {
      workspace_id: workspaceId,
      created_by: profileId,
      updated_by: profileId,
      phone_number: phone.display_phone_number || phoneNumberId,
      display_name: phone.verified_name || phone.display_phone_number || "WhatsApp Oficial",
      waba_id: wabaId ?? null,
      phone_number_id: phoneNumberId,
      business_id: parsed.data.signup?.businessId ?? null,
      access_token: accessToken,
      status: "connected",
      type: "cloud_api",
      config: {
        connected_via: "meta_embedded_signup",
        graph_api_version: graphVersion(),
        connected_at: new Date().toISOString(),
        token_expires_at: expiresAt,
        webhook_managed_by: "ozion",
        app_managed_by: "ozion",
        subscribed_apps: subscribe.success,
        subscribe_error: subscribe.error ?? null,
      },
    };

    const { data: existing, error: lookupError } = await admin
      .from("whatsapp_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone_number_id", phoneNumberId)
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing?.id) {
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
    }

    const query = existing?.id
      ? admin
          .from("whatsapp_connections")
          .update({ ...connectionPayload, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("workspace_id", workspaceId)
      : admin
          .from("whatsapp_connections")
          .insert(connectionPayload);

    const { data, error } = await query
      .select("id,workspace_id,phone_number,display_name,status,type,config,created_at,updated_at")
      .single();
    if (error) throw error;

    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: existing?.id ? "whatsapp.embedded_signup.reconnected" : "whatsapp.embedded_signup.connected",
      targetType: "whatsapp_connection",
      targetId: String(data.id),
      details: {
        provider: "meta",
        status: "connected",
        subscribed_apps: subscribe.success,
      },
    });

    return NextResponse.json({ connection: safeConnection(data) }, { status: existing?.id ? 200 : 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
