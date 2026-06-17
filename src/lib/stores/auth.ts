import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserRole = "master" | "admin" | "agent" | "viewer";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  workspace_id?: string;
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
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

function mapSupabaseUser(supabaseUser: SupabaseUser, profile?: Partial<UserProfile> | null): UserProfile {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: profile?.id || supabaseUser.id,
    email: profile?.email || supabaseUser.email || "",
    name: profile?.name || meta.name || meta.full_name || supabaseUser.email?.split("@")[0] || "User",
    avatar: profile?.avatar || meta.avatar_url,
    role: (profile?.role || meta.role || "agent") as UserRole,
    workspace_id: profile?.workspace_id || meta.workspace_id,
    created_at: profile?.created_at || supabaseUser.created_at || new Date().toISOString(),
    updated_at: profile?.updated_at || supabaseUser.updated_at || new Date().toISOString(),
  };
}

async function loadUserProfile(): Promise<Partial<UserProfile> | null> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.user ?? null;
  } catch {
    return null;
  }
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
      const profile = await loadUserProfile();
      const mapped = mapSupabaseUser(data.user, profile);
      set({ user: mapped, supabaseUser: data.user, isAuthenticated: true, isLoading: false });
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
        const profile = await loadUserProfile();
        const mapped = mapSupabaseUser(data.user, profile);
        set({ user: mapped, supabaseUser: data.user, isAuthenticated: true, isLoading: false });
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Falha ao criar conta." };
    }
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
  },

  getCurrentUser: async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await loadUserProfile();
      const mapped = mapSupabaseUser(session.user, profile);
      set({ user: mapped, supabaseUser: session.user, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, supabaseUser: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
}));
