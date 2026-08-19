"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  clearStoredUser,
  getServerUserSnapshot,
  getUserSnapshot,
  setStoredUser,
  subscribeUser,
  type StoredUser,
} from "@/lib/storage";

type AuthContextValue = {
  user: StoredUser | null;
  login: (user: StoredUser | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(
    subscribeUser,
    getUserSnapshot,
    getServerUserSnapshot,
  );

  const login = (nextUser: StoredUser | null) => setStoredUser(nextUser);
  const logout = () => clearStoredUser();

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
