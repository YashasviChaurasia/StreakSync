"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (user?: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

const MOCK_USERS: User[] = [
  {
    id: "user-1",
    name: "0xa3f",
    avatar_url: "https://api.dicebear.com/9.x/identicon/svg?seed=0xa3f",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    name: "0x7b2",
    avatar_url: "https://api.dicebear.com/9.x/identicon/svg?seed=0x7b2",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "user-3",
    name: "0xd1e",
    avatar_url: "https://api.dicebear.com/9.x/identicon/svg?seed=0xd1e",
    created_at: "2024-01-03T00:00:00Z",
  },
];

const AUTH_KEY = "streaksync_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const signIn = (selectedUser?: User) => {
    const u = selectedUser || MOCK_USERS[0];
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { MOCK_USERS };
