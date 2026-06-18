"use client";

import { useEffect } from "react";
import { createClient, hasBrowserSupabaseConfig } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const getCurrentUser = useAuthStore((state) => state.getCurrentUser);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (!hasBrowserSupabaseConfig()) {
      setUser(null);
      return;
    }

    const supabase = createClient();

    void getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      window.setTimeout(() => void getCurrentUser(), 0);
    });

    return () => subscription.unsubscribe();
  }, [getCurrentUser, setUser]);

  return <>{children}</>;
}
