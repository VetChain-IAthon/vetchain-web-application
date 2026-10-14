"use client";

import Link from "next/link";
import { LevelBadge } from "@/components/data/level-badge";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/** Condiciones del nivel del cliente. Sin reglas en Ajustes se explica qué falta, sin inventar valores. */
export function CommercialTermsCard({ ruc, levelsConfigured }: { ruc: string; levelsConfigured: boolean }) {
  const { user } = useAuth();
  const { data, error, loading } = useQuery(
    () => api.GET("/api/v1/customers/{ruc}/commercial-terms", { params: { path: { ruc } } }), [ruc],
  );
  const missing = !levelsConfigured || error?.code === "thresholds_not_configured" || error?.code === "levels_not_configured";

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
      <h2 className="m-0 text-base font-semibold">Condiciones comerciales</h2>
      {loading && !data && !error ? <p className="m-0 text-sm text-ink-muted">Cargando…</p>
        : missing ? (
          <p className="m-0 text-sm text-ink-2">
            Todavía no se pueden calcular: gerencia debe definir los umbrales de volumen y las reglas de los niveles A, B y C.{" "}
            {user?.role === "manager" && <Link href="/ajustes" className="font-semibold">Ir a Ajustes</Link>}
          </p>
        ) : error ? <p className="m-0 text-sm text-brand-strong">{error.message}</p>
        : data && (
          <>
            <dl className="m-0 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-muted">Nivel de volumen</dt><dd className="m-0"><LevelBadge level={data.level} /></dd>
              <dt className="text-ink-muted">Margen de ganancia</dt><dd className="m-0 font-semibold">{formatPercent(data.margin_pct)}</dd>
              <dt className="text-ink-muted">Descuento máximo</dt><dd className="m-0 font-semibold">{formatPercent(data.max_discount_pct)}</dd>
              <dt className="text-ink-muted">Crédito</dt><dd className="m-0 font-semibold">{data.credit_days} días</dd>
            </dl>
            <p className="m-0 text-xs text-ink-muted">Nivel calculado con {formatPen(data.amount_12m)} en pedidos de 12 meses y las reglas de Ajustes.</p>
          </>
        )}
    </section>
  );
}
