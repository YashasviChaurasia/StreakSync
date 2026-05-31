"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as AppUser } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { registerUser } from "@/lib/store/local-store";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  refresh: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: () => {},
  signOut: () => {},
});

function mapUser(supabaseUser: SupabaseUser): AppUser {
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    name: meta.display_name || meta.hex_id || "anon",
    avatar_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${meta.avatar_seed || supabaseUser.id}`,
    created_at: supabaseUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUser = async () => {
    const { data: { user: sUser } } = await supabase.auth.getUser();
    const appUser = sUser ? mapUser(sUser) : null;
    if (appUser) registerUser(appUser);
    setUser(appUser);
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ? mapUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
