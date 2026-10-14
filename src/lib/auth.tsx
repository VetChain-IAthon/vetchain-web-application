"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api/client";
import type { Role } from "@/lib/types";

export type CurrentUser = { name: string; role: Role; salespersonCode: string | null };
type AuthState = { user: CurrentUser | null; loading: boolean; logout: () => void };

const Ctx = createContext<AuthState>({ user: null, loading: true, logout: () => {} });
export const useAuth = () => useContext(Ctx);

/** Carga /me con el token guardado; sin token o con 401 manda a /login. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.GET("/api/v1/me").then(({ data }) => {
      const me = data;
      if (!me) { router.replace("/login"); return; }
      setUser({ name: me.full_name ?? me.email, role: me.role, salespersonCode: me.salesperson_code ?? null });
      setLoading(false);
    }).catch(() => router.replace("/login"));
  }, [router]);

  const logout = useCallback(() => { setToken(null); router.replace("/login"); }, [router]);
  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>;
}
