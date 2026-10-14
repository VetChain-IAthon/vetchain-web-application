"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { asRole, type Role } from "@/lib/types";

type UserOut = components["schemas"]["UserOut"];
export type CurrentUser = {
  id: number; name: string; email: string; phone: string | null; role: Role; salespersonCode: string | null;
};
type AuthState = {
  user: CurrentUser | null; loading: boolean; logout: () => void; setUser: (u: UserOut) => void;
};

export const toCurrentUser = (u: UserOut): CurrentUser => ({
  id: u.id, name: u.full_name || u.email, email: u.email, phone: u.phone, role: asRole(u.role), salespersonCode: u.salesperson_code ?? null,
});

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const Ctx = createContext<AuthState>({ user: null, loading: true, logout: () => {}, setUser: () => {} });
export const useAuth = () => useContext(Ctx);

/** Carga /me con el token guardado; sin token o con 401 manda a /login. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setCurrent] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.GET("/api/v1/me").then(({ data }) => {
      if (!data) { router.replace("/login"); return; }
      setCurrent(toCurrentUser(data));
      setLoading(false);
    }).catch(() => router.replace("/login"));
  }, [router]);

  const logout = useCallback(() => { setToken(null); router.replace("/login"); }, [router]);
  const setUser = useCallback((u: UserOut) => setCurrent(toCurrentUser(u)), []);
  return <Ctx.Provider value={{ user, loading, logout, setUser }}>{children}</Ctx.Provider>;
}
