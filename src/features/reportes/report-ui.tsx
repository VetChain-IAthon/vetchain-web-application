"use client";

import { BrainCircuit, Clock, Database, Sparkles } from "lucide-react";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatPercent } from "@/lib/format";
import type { DataOrigin } from "@/lib/types";
import type { QueryError } from "@/lib/use-query";
import { cn } from "@/lib/utils";

/** Piezas comunes de los reportes: avisos, estados de carga, cifras y lo que aún falta para completar una sección. */

export const warningText: Record<string, string> = {
  no_order_data: "No hay pedidos veterinarios para este período.",
  no_cost_data: "No hay costos de compra validados. El margen y la rentabilidad no están disponibles.",
  alerts_unavailable: "Las alertas se mostrarán cuando gerencia defina los factores del ritmo de compra.",
  order_statuses_provisional: "Los montos son de pedidos sin IGV. Se excluyen cancelados; Mederi aún debe confirmar los demás estados. Un pedido no acredita una venta facturada.",
  category_unconfirmed: "La interpretación de las categorías de Defontana está pendiente de confirmación.",
  risk_factors_provisional: "Cálculo provisional: en riesgo es quien pasó más de 1,5 veces su ritmo de compra sin pedir (30 días si tiene un solo pedido). Gerencia aún debe confirmar estos factores.",
  risk_factors_unconfigured: "«En riesgo» usa factores de ritmo de compra provisionales hasta que gerencia los confirme.",
  stock_balance_unconfirmed: "El campo de saldo del kardex está por confirmar con Mederi. Revisa estas cantidades antes de usarlas para decidir compras.",
  no_lot_data: "Los archivos no incluyen lotes ni fechas de vencimiento. No se calculan mermas ni próximos vencimientos.",
  no_stock_data: "No se encontraron saldos de kardex para este período.",
  portfolio_provisional: "La asignación de carteras por vendedor es provisional; Mederi debe confirmar las carteras oficiales.",
  receipts_not_linked: "Los cobros no se pueden enlazar con los pedidos. No se calcula deuda pendiente ni antigüedad de saldos.",
  targets_unconfigured: "Gerencia aún no definió metas para estos indicadores; por eso no se muestran estados de desempeño.",
  conversion_unavailable: "La conversión de cotizaciones y el monto recuperado no se pueden calcular todavía.",
};

export function Warnings({ codes }: { codes: string[] }) {
  const unique = [...new Set(codes)];
  return <>{unique.map((code) => <Notice key={code} tone="warn">{warningText[code] ?? code}</Notice>)}</>;
}

export function Status({ loading, error, reload }: { loading: boolean; error: QueryError | null; reload: () => void }) {
  if (error) return <Notice>{error.message} <Button variant="outline" size="sm" onClick={reload}>Reintentar</Button></Notice>;
  if (loading) return <p className="py-10 text-sm text-ink-muted">Cargando datos…</p>;
  return null;
}

export function PeriodText({ from, to, asOf }: { from?: string | null; to?: string | null; asOf?: string | null }) {
  return <p className="text-sm text-ink-muted">Período: {formatDate(from)} – {formatDate(to)} · datos cargados hasta {formatDate(asOf)} · montos de pedidos sin IGV.</p>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold">{children}</h2>;
}


export function ReportHeaderNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

/** Cifra principal con etiqueta, comparación opcional y origen del dato. */
export function StatTile({ label, value, detail, tone = "muted", origin }: {
  label: string; value: string; detail?: React.ReactNode; tone?: "muted" | "good" | "bad" | "warn"; origin?: DataOrigin;
}) {
  const toneClass = { muted: "text-ink-muted", good: "text-ok-fg", bad: "text-brand-strong", warn: "text-warn-fg" }[tone];
  return <Card className="flex flex-col gap-2 p-5">
    <div className="flex items-start justify-between gap-2"><span className="text-sm text-ink-muted">{label}</span>{origin && <OriginBadge origin={origin} />}</div>
    <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
    {detail && <span className={cn("text-[13px]", toneClass)}>{detail}</span>}
  </Card>;
}

/** Variación porcentual frente a otro período, con texto y tono listos para StatTile. */
export function compare(current: number | null | undefined, previous: number | null | undefined, what = "los 12 meses anteriores") {
  if (current == null || previous == null || previous === 0) return { detail: undefined, tone: "muted" as const };
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  const tone = Math.abs(pct) < 1 ? "muted" as const : pct > 0 ? "good" as const : "bad" as const;
  return { detail: `${sign}${formatPercent(pct)} frente a ${what}`, tone };
}

/** El mismo rango un año antes («AAAA-MM-DD»). */
export function yearBefore(from: string, to: string) {
  const shift = (iso: string) => `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}`.replace(/-02-29$/, "-02-28");
  return { from: shift(from), to: shift(to) };
}

/** Barras horizontales de participación: la mayor ocupa todo el ancho. */
export function ShareBars({ items, valueLabel }: { items: { key: string; label: React.ReactNode; value: number; share?: number | null }[]; valueLabel: (value: number) => string }) {
  const max = Math.max(...items.map((item) => item.value), 0);
  return <ul className="flex flex-col gap-3">
    {items.map((item) => <li key={item.key}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{item.label}</span>
        <span className="flex-none tabular-nums text-ink-2">{valueLabel(item.value)}{item.share != null && <span className="ml-2 text-ink-muted">{formatPercent(item.share)}</span>}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-canvas" aria-hidden><div className="h-full rounded-full bg-brand" style={{ width: `${max ? (item.value / max) * 100 : 0}%` }} /></div>
    </li>)}
  </ul>;
}

const PENDING = {
  model: { icon: BrainCircuit, badge: "Requiere el modelo de predicción", hint: "Se completará cuando se entrene el modelo XGBoost con el historial de pedidos." },
  ai: { icon: Sparkles, badge: "Requiere IA (Gemini)", hint: "Se completará cuando se configure la clave de la API de Gemini. Solo se le envían cifras agregadas, nunca nombres ni RUC." },
  data: { icon: Database, badge: "Faltan datos de Mederi", hint: "" },
  feature: { icon: Clock, badge: "Próximamente", hint: "" },
} as const;

/** Sección que todavía no se puede mostrar: dice qué falta (modelo, IA, datos) en vez de inventar cifras. */
export function Pending({ kind, title, children, className }: { kind: keyof typeof PENDING; title: string; children?: React.ReactNode; className?: string }) {
  const p = PENDING[kind];
  const Icon = p.icon;
  return <Card className={cn("flex flex-col gap-3 border-dashed bg-canvas/40", className)}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="inline-flex items-center gap-1.5 rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg"><Icon size={14} aria-hidden />{p.badge}</span>
    </div>
    {children && <div className="text-sm leading-relaxed text-ink-muted">{children}</div>}
    {p.hint && <p className="text-xs text-ink-muted">{p.hint}</p>}
  </Card>;
}

/** Tarjeta de cifra que aún no se puede calcular. */
export function PendingTile({ label, kind, reason }: { label: string; kind: keyof typeof PENDING; reason: string }) {
  const Icon = PENDING[kind].icon;
  return <Card className="flex flex-col gap-2 border-dashed bg-canvas/40 p-5">
    <span className="text-sm text-ink-muted">{label}</span>
    <span className="text-3xl font-semibold tracking-tight text-ink-muted">—</span>
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><Icon size={14} aria-hidden />{reason}</span>
  </Card>;
}
