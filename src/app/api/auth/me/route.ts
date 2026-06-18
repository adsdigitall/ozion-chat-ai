import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizeRole, permissionsForRole, ROLE_LABELS } from "@/lib/auth/permissions";
import { getPlanEntitlements } from "@/lib/server/plan-guards";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function workspaceSlug(userId: string) {
  return `workspace-${userId.replaceAll("-", "")}`;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server route may be read-only in some runtimes.
        }
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const admin = getSupabaseAdmin();
  const metadata = authData.user.user_metadata ?? {};
  const email = authData.user.email ?? "";
  const name =
    metadata.name ??
    metadata.full_name ??
    email.split("@")[0] ??
    "User";
  const avatar = metadata.avatar_url ?? metadata.picture ?? null;

  const { data: existingByAuth, error: authProfileError } = await admin
    .from("users")
    .select("id,email,name,avatar,role,workspace_id,customer_id,created_at,updated_at")
    .eq("auth_id", authData.user.id)
    .maybeSingle();
  if (authProfileError) throw authProfileError;

  let profile = existingByAuth;

  if (!profile && email) {
    const { data: existingByEmail, error: emailProfileError } = await admin
      .from("users")
      .select("id,email,name,avatar,role,workspace_id,customer_id,created_at,updated_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (emailProfileError) throw emailProfileError;

    if (existingByEmail) {
      const { data: updatedProfile, error: updateError } = await admin
        .from("users")
        .update({
          auth_id: authData.user.id,
          name: existingByEmail.name || name,
          avatar: existingByEmail.avatar || avatar,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByEmail.id)
        .select("id,email,name,avatar,role,workspace_id,customer_id,created_at,updated_at")
        .single();
      if (updateError) throw updateError;
      profile = updatedProfile;
    }
  }

  if (!profile && email) {
    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({
        name,
        slug: workspaceSlug(authData.user.id),
        owner_id: authData.user.id,
        plan: "free",
      })
      .select("id")
      .single();
    if (workspaceError) throw workspaceError;

    const { data: newProfile, error: profileError } = await admin
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email: email.toLowerCase(),
        name,
        avatar,
        role: "admin_master",
        workspace_id: workspace.id,
      })
      .select("id,email,name,avatar,role,workspace_id,customer_id,created_at,updated_at")
      .single();
    if (profileError) throw profileError;
    profile = newProfile;
  }

  const normalizedRole = normalizeRole(profile?.role ?? metadata.role);
  const impersonatedCustomerId = cookieStore.get("ozion_impersonation_customer_id")?.value ?? null;
  let customerStatus: "active" | "suspended" | "inactive" | null = null;
  let impersonation: { customer_id: string; workspace_id: string; customer_name: string } | null = null;
  let currentWorkspace: { id: string; name: string; plan: string | null; status: string | null } | null = null;
  let planId: string | null = null;
  let planLimits: Record<string, number> | null = null;
  let planModules: Record<string, boolean> | null = null;

  if (profile?.customer_id) {
    const { data: customer } = await admin
      .from("customers")
      .select("id,status,last_access_at")
      .eq("id", profile.customer_id)
      .maybeSingle();
    customerStatus = customer?.status ?? null;

    if (customerStatus !== "suspended") {
      await admin
        .from("customers")
        .update({ last_access_at: new Date().toISOString() })
        .eq("id", profile.customer_id);
    }

    const entitlements = await getPlanEntitlements({ admin, customerId: profile.customer_id });
    planId = entitlements.planId;
    planLimits = entitlements.limits as Record<string, number> | null;
    planModules = entitlements.modules as Record<string, boolean> | null;
  }

  if (normalizedRole === "admin_master" && impersonatedCustomerId) {
    const { data: customer } = await admin
      .from("customers")
      .select("id,name,status")
      .eq("id", impersonatedCustomerId)
      .maybeSingle();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id")
      .eq("customer_id", impersonatedCustomerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (customer?.id && workspace?.id) {
      impersonation = {
        customer_id: customer.id,
        workspace_id: workspace.id,
        customer_name: customer.name,
      };

      const entitlements = await getPlanEntitlements({ admin, customerId: customer.id });
      planId = entitlements.planId;
      planLimits = entitlements.limits as Record<string, number> | null;
      planModules = entitlements.modules as Record<string, boolean> | null;
    }
  }

  const selectedWorkspaceId = cookieStore.get("ozion_workspace_id")?.value ?? impersonation?.workspace_id ?? profile?.workspace_id ?? null;
  if (selectedWorkspaceId) {
    let workspaceQuery = admin
      .from("workspaces")
      .select("id,name,plan,status,customer_id")
      .eq("id", selectedWorkspaceId);
    if (normalizedRole !== "admin_master" && profile?.customer_id) {
      workspaceQuery = workspaceQuery.eq("customer_id", profile.customer_id);
    }
    const { data: workspace } = await workspaceQuery.maybeSingle();
    if (workspace?.id) {
      currentWorkspace = {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan ?? null,
        status: workspace.status ?? null,
      };
    }
  }

  if (!currentWorkspace && profile?.workspace_id) {
    const { data: fallbackWorkspace } = await admin
      .from("workspaces")
      .select("id,name,plan,status")
      .eq("id", profile.workspace_id)
      .maybeSingle();
    if (fallbackWorkspace?.id) {
      currentWorkspace = {
        id: fallbackWorkspace.id,
        name: fallbackWorkspace.name,
        plan: fallbackWorkspace.plan ?? null,
        status: fallbackWorkspace.status ?? null,
      };
    }
  }

  const { data: permissionRows } = await admin
    .from("role_permissions")
    .select("permissions(key), roles!inner(key)")
    .eq("roles.key", normalizedRole);
  const permissions = permissionRows
    ?.map((row) => {
      const permission = row.permissions as { key?: string } | { key?: string }[] | null;
      return Array.isArray(permission) ? permission[0]?.key : permission?.key;
    })
    .filter((key): key is string => Boolean(key)) ?? permissionsForRole(normalizedRole);

  const user = {
    id: profile?.id ?? authData.user.id,
    email: profile?.email ?? email,
    name:
      profile?.name ??
      name,
    avatar: profile?.avatar ?? avatar,
    role: normalizedRole,
    role_label: ROLE_LABELS[normalizedRole],
    permissions,
    workspace_id: profile?.workspace_id ?? metadata.workspace_id ?? null,
    current_workspace: currentWorkspace,
    customer_id: profile?.customer_id ?? null,
    customer_status: customerStatus,
    plan_id: planId,
    plan_limits: planLimits,
    plan_modules: planModules,
    impersonation,
    created_at: profile?.created_at ?? authData.user.created_at,
    updated_at: profile?.updated_at ?? authData.user.updated_at ?? authData.user.created_at,
  };

  return NextResponse.json({ user });
}
