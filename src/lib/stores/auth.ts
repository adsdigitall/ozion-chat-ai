import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { normalizeRole, permissionsForRole, ROLE_LABELS, type AppRole, type PermissionKey } from "@/lib/auth/permissions";
import type { LimitKey, ModuleKey } from "@/lib/plans/plan-limits";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: AppRole;
  role_label: string;
  permissions: PermissionKey[];
  workspace_id?: string;
  current_workspace?: {
    id: string;
    name: string;
    plan: string | null;
    status: string | null;
  } | null;
  customer_id?: string | null;
  customer_status?: "active" | "suspended" | "inactive" | null;
  plan_id?: string | null;
  plan_limits?: Partial<Record<LimitKey, number>> | null;
  plan_modules?: Partial<Record<ModuleKey, boolean>> | null;
  impersonation?: {
    customer_id: string;
    workspace_id: string;
    customer_name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface AuthStore {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

function mapSupabaseUser(supabaseUser: SupabaseUser, profile?: Partial<UserProfile> | null): UserProfile {
  const meta = supabaseUser.user_metadata || {};
  const role = normalizeRole(profile?.role || meta.role);
  const permissions = profile?.permissions?.length ? profile.permissions : permissionsForRole(role);
  return {
    id: profile?.id || supabaseUser.id,
    email: profile?.email || supabaseUser.email || "",
    name: profile?.name || meta.name || meta.full_name || supabaseUser.email?.split("@")[0] || "User",
    avatar: profile?.avatar || meta.avatar_url,
    role,
    role_label: profile?.role_label || ROLE_LABELS[role],
    permissions,
    workspace_id: profile?.workspace_id || meta.workspace_id,
    current_workspace: profile?.current_workspace ?? null,
    customer_id: profile?.customer_id ?? meta.customer_id,
    customer_status: profile?.customer_status ?? null,
    plan_id: profile?.plan_id ?? null,
    plan_limits: profile?.plan_limits ?? null,
    plan_modules: profile?.plan_modules ?? null,
    impersonation: profile?.impersonation ?? null,
    created_at: profile?.created_at || supabaseUser.created_at || new Date().toISOString(),
    updated_at: profile?.updated_at || supabaseUser.updated_at || new Date().toISOString(),
  };
}

async function loadUserProfile(): Promise<Partial<UserProfile> | null> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Falha ao carregar perfil.");
  return data?.user ?? null;
}

async function writeSecurityEvent(action: "auth.login" | "auth.logout") {
  try {
    await fetch("/api/security/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    // Security event logging must not block authentication UX.
  }
}

function mapProfileUser(profile: Partial<UserProfile>): UserProfile {
  const role = normalizeRole(profile.role);
  const permissions = profile.permissions?.length ? profile.permissions : permissionsForRole(role);
  return {
    id: profile.id || "",
    email: profile.email || "",
    name: profile.name || profile.email?.split("@")[0] || "User",
    avatar: profile.avatar,
    role,
    role_label: profile.role_label || ROLE_LABELS[role],
    permissions,
    workspace_id: profile.workspace_id,
    current_workspace: profile.current_workspace ?? null,
    customer_id: profile.customer_id ?? null,
    customer_status: profile.customer_status ?? null,
    plan_id: profile.plan_id ?? null,
    plan_limits: profile.plan_limits ?? null,
    plan_modules: profile.plan_modules ?? null,
    impersonation: profile.impersonation ?? null,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  supabaseUser: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { error: error.message };

    if (data.user) {
      try {
        const profile = await loadUserProfile();
        const mapped = mapSupabaseUser(data.user, profile);
        await writeSecurityEvent("auth.login");
        set({ user: mapped, supabaseUser: data.user, isAuthenticated: true, isLoading: false });
      } catch (profileError) {
        await supabase.auth.signOut();
        set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
        return { error: profileError instanceof Error ? profileError.message : "Falha ao carregar perfil." };
      }
    }

    return { error: null };
  },

  signInWithGoogle: async () => {
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/dashboard`,
        },
      });

      return { error: error?.message ?? null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Falha ao entrar com Google.",
      };
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) return { error: result?.error || "Falha ao criar conta." };

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      if (data.user) {
        try {
          const profile = await loadUserProfile();
          const mapped = mapSupabaseUser(data.user, profile);
          await writeSecurityEvent("auth.login");
          set({ user: mapped, supabaseUser: data.user, isAuthenticated: true, isLoading: false });
        } catch (profileError) {
          await supabase.auth.signOut();
          set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
          return { error: profileError instanceof Error ? profileError.message : "Falha ao carregar perfil." };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Falha ao criar conta." };
    }
  },

  resetPassword: async (email: string) => {
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login`,
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    const supabase = createClient();
    await writeSecurityEvent("auth.logout");
    await supabase.auth.signOut();
    set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
  },

  getCurrentUser: async () => {
    try {
      const profile = await loadUserProfile();
      if (profile?.id) {
        set({ user: mapProfileUser(profile), supabaseUser: null, isAuthenticated: true, isLoading: false });
        return;
      }
      set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
    } catch {
      set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
}));
