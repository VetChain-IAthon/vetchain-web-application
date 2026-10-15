"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider, initialsOf, useAuth } from "@/lib/auth";
import { setDemoMode, useDemoMode, useDemoQueryParam } from "@/lib/demo";

/** Aviso fijo mientras el modo demostración está activo (`?demo=1`). */
function DemoBadge() {
  useDemoQueryParam();
  const demo = useDemoMode();
  if (!demo) return null;
  return <div role="status" className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-danger-fg/30 bg-danger-bg px-4 py-2 text-xs font-semibold text-danger-fg shadow">
    Modo demostración: las secciones marcadas «Simulado» usan datos de ejemplo
    <button type="button" onClick={() => setDemoMode(false)} className="underline">Desactivar</button>
  </div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || !user) return <div className="p-12 text-sm text-ink-muted">Cargando…</div>;
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} userName={user.name} initials={initialsOf(user.name)} />
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-12 pb-12 pt-8">{children}</main>
      <DemoBadge />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><Shell>{children}</Shell></AuthProvider>;
}
