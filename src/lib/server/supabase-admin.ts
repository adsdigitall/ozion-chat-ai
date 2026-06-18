import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { normalizeRole, permissionsForRole, type AppRole, type PermissionKey } from "@/lib/auth/permissions";

export type RequestContext = {
  admin: SupabaseClient;
  authUserId: string | null;
  profileId: string | null;
  workspaceId: string;
  workspaceName: string | null;
  workspacePlan: string | null;
  workspaceStatus: "active" | "inactive" | "suspended" | null;
  customerId: string | null;
  customerStatus: "active" | "suspended" | "inactive" | null;
  role: AppRole;
  permissions: PermissionKey[];
  isImpersonating: boolean;
  adminWorkspaceId: string | null;
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

async function resolveWorkspaceForProfile({
  admin,
  profile,
  role,
  selectedWorkspaceId,
  customerId,
}: {
  admin: SupabaseClient;
  profile: { id: string; workspace_id: string; customer_id?: string | null };
  role: AppRole;
  selectedWorkspaceId: string | null;
  customerId: string | null;
}) {
  const fields = "id,name,plan,status,customer_id";
  if (selectedWorkspaceId) {
    let query = admin.from("workspaces").select(fields).eq("id", selectedWorkspaceId);
    if (role !== "admin_master") {
      query = customerId ? query.eq("customer_id", customerId) : query.eq("id", profile.workspace_id);
    }
    const { data: selected, error } = await query.maybeSingle();
    if (error) throw error;

    if (selected?.id && role !== "admin_master") {
      const { data: membership, error: membershipError } = await admin
        .from("workspace_users")
        .select("id")
        .eq("workspace_id", selected.id)
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (membership?.id || selected.customer_id === customerId || selected.id === profile.workspace_id) return selected;
    }

    if (selected?.id && role === "admin_master") return selected;
  }

  const { data: fallback, error: fallbackError } = await admin
    .from("workspaces")
    .select(fields)
    .eq("id", profile.workspace_id)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return fallback;
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
      .select("id, workspace_id, role, customer_id")
      .eq("auth_id", authUserId)
      .maybeSingle();

    if (error) throw error;
    if (profile?.workspace_id) {
      const role = normalizeRole(profile.role);
      const permissions = permissionsForRole(profile.role);
      const impersonatedCustomerId = request.cookies.get("ozion_impersonation_customer_id")?.value ?? null;
      const selectedWorkspaceId = request.cookies.get("ozion_workspace_id")?.value ?? null;

      if (role === "admin_master" && impersonatedCustomerId) {
        const { data: customer, error: customerError } = await admin
          .from("customers")
          .select("id,status")
          .eq("id", impersonatedCustomerId)
          .maybeSingle();
        if (customerError) throw customerError;

        let workspaceQuery = admin
          .from("workspaces")
          .select("id,name,plan,status")
          .eq("customer_id", impersonatedCustomerId)
          .order("created_at", { ascending: true });
        if (selectedWorkspaceId) workspaceQuery = workspaceQuery.eq("id", selectedWorkspaceId);
        const { data: workspaceRows, error: workspaceError } = await workspaceQuery.limit(1);
        if (workspaceError) throw workspaceError;
        const workspace = workspaceRows?.[0] ?? null;

        if (customer?.id && workspace?.id) {
          return {
            admin,
            authUserId,
            profileId: profile.id,
            workspaceId: workspace.id,
            workspaceName: workspace.name ?? null,
            workspacePlan: workspace.plan ?? null,
            workspaceStatus: workspace.status ?? null,
            customerId: customer.id,
            customerStatus: customer.status,
            role,
            permissions,
            isImpersonating: true,
            adminWorkspaceId: profile.workspace_id,
            isLocalDemo: false,
          };
        }
      }

      let customerStatus: "active" | "suspended" | "inactive" | null = null;
      if (profile.customer_id) {
        const { data: customer, error: customerError } = await admin
          .from("customers")
          .select("status")
          .eq("id", profile.customer_id)
          .maybeSingle();
        if (customerError) throw customerError;
        customerStatus = customer?.status ?? null;
      }

      const workspace = await resolveWorkspaceForProfile({
        admin,
        profile,
        role,
        selectedWorkspaceId,
        customerId: profile.customer_id ?? null,
      });
      if (!workspace?.id) throw new Error("WORKSPACE_NOT_FOUND");

      return {
        admin,
        authUserId,
        profileId: profile.id,
        workspaceId: workspace.id,
        workspaceName: workspace.name ?? null,
        workspacePlan: workspace.plan ?? null,
        workspaceStatus: workspace.status ?? null,
        customerId: workspace.customer_id ?? profile.customer_id ?? null,
        customerStatus,
        role,
        permissions,
        isImpersonating: false,
        adminWorkspaceId: null,
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
    workspaceName: null,
    workspacePlan: null,
    workspaceStatus: "active",
    customerId: null,
    customerStatus: "active",
    role: "admin_master",
    permissions: permissionsForRole("admin_master"),
    isImpersonating: false,
    adminWorkspaceId: workspace.id,
    isLocalDemo: true,
  };
}

export function requirePermission(context: RequestContext, permission: PermissionKey) {
  if (!context.permissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function requireActiveCustomer(context: RequestContext) {
  if (context.customerStatus === "suspended") {
    throw new Error("CUSTOMER_SUSPENDED");
  }
  if (context.workspaceStatus === "suspended" || context.workspaceStatus === "inactive") {
    throw new Error("WORKSPACE_INACTIVE");
  }
}

export function publicServerError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return { message: "Authentication required.", status: 401 };
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return { message: "Você não tem permissão para executar esta ação.", status: 403 };
  }

  if (error instanceof Error && error.message === "CUSTOMER_SUSPENDED") {
    return { message: "Conta suspensa. Entre em contato com o administrador.", status: 403 };
  }

  if (error instanceof Error && error.message === "WORKSPACE_INACTIVE") {
    return { message: "Workspace inativo. Selecione outro Workspace ou fale com o administrador.", status: 403 };
  }

  if (error instanceof Error && error.message === "WORKSPACE_NOT_FOUND") {
    return { message: "Workspace não encontrado ou sem acesso.", status: 404 };
  }

  if (error instanceof Error && error.message.includes("bloqueado neste plano")) {
    return { message: error.message, status: 403 };
  }

  if (error instanceof Error && error.message.toLowerCase().includes("limite")) {
    return { message: error.message, status: 403 };
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
