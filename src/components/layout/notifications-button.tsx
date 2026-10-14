"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function NotificationsButton() {
  const [open, setOpen] = useState(false);

  return <div className="relative flex-none">
    <button type="button" aria-label="Notificaciones" aria-expanded={open} aria-haspopup="dialog"
      onClick={() => setOpen((value) => !value)}
      className="flex size-10 items-center justify-center rounded border border-line bg-surface text-ink-2 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
      <Bell size={20} strokeWidth={1.8} aria-hidden />
    </button>
    {open && <>
      <button type="button" aria-label="Cerrar notificaciones" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <div role="dialog" aria-label="Notificaciones" className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-line bg-surface p-5 shadow-lg">
        <h2 className="text-base font-semibold">Notificaciones</h2>
        <p className="mt-2 text-sm text-ink-muted">Aún no hay alertas calculadas disponibles en este piloto.</p>
        <Link href="/alertas" onClick={() => setOpen(false)} className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-hover">Ver alertas</Link>
      </div>
    </>}
  </div>;
}
