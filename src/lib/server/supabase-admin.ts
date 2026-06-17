import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

type RequestContext = {
  admin: SupabaseClient;
  authUserId: string | null;
  profileId: string | null;
  workspaceId: string;
  isLocalDemo: boolean;
};

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

async function getAuthenticatedUserId() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => undefined,
    },
  });
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const admin = getSupabaseAdmin();
  const authUserId = await getAuthenticatedUserId();
  const localDemo = isLocalRequest(request);

  if (authUserId) {
    const { data: profile, error } = await admin
      .from("users")
      .select("id, workspace_id")
      .eq("auth_id", authUserId)
      .maybeSingle();

    if (error) throw error;
    if (profile?.workspace_id) {
      return {
        admin,
        authUserId,
        profileId: profile.id,
        workspaceId: profile.workspace_id,
        isLocalDemo: false,
      };
    }
  }

  if (!localDemo) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: workspace, error } = await admin
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!workspace) throw new Error("No workspace is configured.");

  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    admin,
    authUserId: null,
    profileId: profile?.id ?? null,
    workspaceId: workspace.id,
    isLocalDemo: true,
  };
}

export function publicServerError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return { message: "Authentication required.", status: 401 };
  }

  console.error("[Ozion API]", error);
  return {
    message: error instanceof Error ? error.message : "Unexpected server error.",
    status: 500,
  };
}

export async function writeAuditLog({
  admin,
  workspaceId,
  userId,
  request,
  action,
  targetType,
  targetId,
  details = {},
}: {
  admin: SupabaseClient;
  workspaceId: string;
  userId: string | null;
  request: NextRequest;
  action: string;
  targetType?: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const { error } = await admin.from("audit_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details,
    ip_address: ipAddress,
  });
  if (error) console.error("[Ozion audit]", error);
}

function readCredentialValue(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function getConnectedIntegrationSecret({
  admin,
  workspaceId,
  type,
  fallback,
  keys = ["apiKey", "api_key", "token", "accessToken"],
}: {
  admin: SupabaseClient;
  workspaceId: string;
  type: string;
  fallback?: string;
  keys?: string[];
}) {
  const { data, error } = await admin
    .from("integrations")
    .select("credentials,config")
    .eq("workspace_id", workspaceId)
    .eq("type", type)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (
    readCredentialValue(data?.credentials, keys) ??
    readCredentialValue(data?.config, keys) ??
    (fallback?.trim() || undefined)
  );
}
