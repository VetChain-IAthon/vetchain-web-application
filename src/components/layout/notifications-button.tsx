"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CalculatedBadge } from "@/components/data/calculated-badge";
import { daysLate, useAlerts } from "@/features/alertas/use-alerts";
import { formatMonthYear, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Campana: alertas del día pendientes de contactar (clientes que pasaron su ritmo de compra). */
export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const { state, loaded } = useAlerts();
  const items = state?.items ?? [];
  const pending = items.filter((i) => !state?.contacts.get(i.ruc));

  return <div className="relative flex-none">
    <button type="button" aria-label={`Notificaciones${pending.length ? `: ${pending.length} alertas pendientes` : ""}`} aria-expanded={open} aria-haspopup="dialog"
      onClick={() => setOpen((value) => !value)}
      className={cn("relative flex size-10 items-center justify-center rounded border bg-surface hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand",
        pending.length ? "border-brand text-brand" : "border-line text-ink-2")}>
      <Bell size={20} strokeWidth={1.8} aria-hidden />
      {pending.length > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{pending.length}</span>}
    </button>
    {open && <>
      <button type="button" aria-label="Cerrar notificaciones" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <div role="dialog" aria-label="Alertas del día" className="absolute right-0 top-12 z-50 w-[420px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div><h2 className="text-lg font-semibold">Alertas del día</h2>
            <p className="text-sm text-ink-muted">{loaded ? `${pending.length} pendientes de ${items.length}` : "Calculando…"}</p></div>
          <CalculatedBadge text="Calculado" />
        </div>
        {loaded && !state && <p className="p-5 text-sm text-ink-muted">No se pudieron cargar las alertas.</p>}
        {loaded && state && !pending.length && <p className="p-5 text-sm text-ink-muted">{items.length ? "Ya contactaste a todos los clientes con alerta." : "No hay alertas hoy."}</p>}
        <ul className="max-h-[360px] overflow-y-auto">
          {pending.slice(0, 5).map((item) => {
            const late = daysLate(item, state?.defaultRhythm ?? 30);
            return <li key={item.ruc} className="border-b border-line last:border-0">
              <Link href={`/alertas#alerta-${item.ruc}`} onClick={() => setOpen(false)} className="flex items-start justify-between gap-3 px-5 py-4 text-ink no-underline hover:bg-canvas">
                <span className="min-w-0"><span className="block font-semibold">{item.name}</span>
                  <span className="block text-sm text-ink-muted">Pedido promedio de 12 meses · {formatNumber(item.days_since_last_order, 0)} días sin comprar</span></span>
                <span className="flex-none rounded-xs bg-danger-bg px-2 py-0.5 text-sm font-semibold text-danger-fg">+{formatNumber(late, late % 1 ? 1 : 0)} días</span>
              </Link>
            </li>;
          })}
        </ul>
        <div className="border-t border-line p-5">
          <p className="text-[13px] text-ink-muted">Calculadas con el ritmo de compra de cada cliente.{state?.dataAsOf ? ` Datos hasta ${formatMonthYear(state.dataAsOf)}.` : ""}</p>
          <Link href="/alertas" onClick={() => setOpen(false)} className="mt-3 flex h-11 items-center justify-center rounded bg-brand text-sm font-semibold text-white no-underline hover:bg-brand-hover">Ver todas las alertas</Link>
        </div>
      </div>
    </>}
  </div>;
}
