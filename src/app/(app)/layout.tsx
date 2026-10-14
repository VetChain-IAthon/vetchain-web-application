"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || !user) return <div className="p-12 text-sm text-ink-muted">Cargando…</div>;
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} userName={user.name} initials={initials} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-12 pb-12 pt-8">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Shell>{children}</Shell></AuthProvider>;
}
