import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

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
    .select("id,email,name,avatar,role,workspace_id,created_at,updated_at")
    .eq("auth_id", authData.user.id)
    .maybeSingle();
  if (authProfileError) throw authProfileError;

  let profile = existingByAuth;

  if (!profile && email) {
    const { data: existingByEmail, error: emailProfileError } = await admin
      .from("users")
      .select("id,email,name,avatar,role,workspace_id,created_at,updated_at")
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
        .select("id,email,name,avatar,role,workspace_id,created_at,updated_at")
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
        role: "master",
        workspace_id: workspace.id,
      })
      .select("id,email,name,avatar,role,workspace_id,created_at,updated_at")
      .single();
    if (profileError) throw profileError;
    profile = newProfile;
  }

  const user = {
    id: profile?.id ?? authData.user.id,
    email: profile?.email ?? email,
    name:
      profile?.name ??
      name,
    avatar: profile?.avatar ?? avatar,
    role: profile?.role ?? metadata.role ?? "agent",
    workspace_id: profile?.workspace_id ?? metadata.workspace_id ?? null,
    created_at: profile?.created_at ?? authData.user.created_at,
    updated_at: profile?.updated_at ?? authData.user.updated_at ?? authData.user.created_at,
  };

  return NextResponse.json({ user });
}
