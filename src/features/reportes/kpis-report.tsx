"use client";

import { jsPDF } from "jspdf";
import { AlertTriangle, ArrowLeft, Check, Download, Mail, MessageSquare, Minus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatMonthYear, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { Status, yearBefore } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/KPIs-svux.dc.html: 12 indicadores en cuatro grupos, con meta propuesta y estado.
 *
 *  Las metas son la PROPUESTA del prototipo para validar con Mederi (gerencia aún no las definió en Ajustes; el backend
 *  devuelve target = null). Se muestran siempre como «propuesta». Un indicador sin datos queda «Sin dato» con lo que falta. */

type State = "ok" | "warn" | "bad" | "none";
type Origin = "real" | "estimated" | "pending" | "new";

type Indicator = {
  key: string;
  title: string;
  value: number | null;
  format: (v: number) => string;
  /** Meta propuesta y umbral crítico. `higher`: más es mejor. */
  target: number; critical: number; higher: boolean;
  goalText: string;
  explain: string;
  origin: Origin;
  pendingReason?: string;
};

type Group = { title: string; question: string; items: Indicator[] };

const titleCase = (text: string) => text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const signedPct = (v: number) => `${v > 0 ? "+" : ""}${formatPercent(v, 2)}`;
const pct = (v: number) => formatPercent(v);

function stateOf(kpi: Indicator): State {
  if (kpi.value == null) return "none";
  if (kpi.higher) return kpi.value >= kpi.target ? "ok" : kpi.value < kpi.critical ? "bad" : "warn";
  return kpi.value <= kpi.target ? "ok" : kpi.value > kpi.critical ? "bad" : "warn";
}

const STATE = {
  ok: { label: "En meta", icon: Check, chip: "bg-ok-bg text-ok-fg", bar: "bg-status-ok" },
  warn: { label: "Atención", icon: AlertTriangle, chip: "bg-warn-bg text-warn-fg", bar: "bg-status-warn" },
  bad: { label: "Crítico", icon: X, chip: "bg-danger-bg text-danger-fg", bar: "bg-status-bad" },
  none: { label: "Sin dato", icon: Minus, chip: "bg-neutral-bg text-neutral-fg", bar: "bg-line-strong" },
} as const;

const ORIGIN_LABEL: Record<Origin, string> = { real: "Dato real", estimated: "Estimado", pending: "Pendiente", new: "Nuevo con VetChain" };

export function KpisReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/kpis"), [], "No se pudo cargar los indicadores.");
  const period = query.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/kpis", { params: { query: before } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to], "No se pudo cargar el año anterior.");
  const sellers = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar la venta por vendedor.");
  const customers = useQuery(() => api.GET("/api/v1/reports/customers"), [], "");
  const dormant = useQuery(() => api.GET("/api/v1/customers/dormant", { params: { query: { per_page: 1 } } }), [], "");
  const [channel, setChannel] = useState<ShareChannel | null>(null);

  const data = query.data;
  const value = (items: { code: string; value: number | null }[] | undefined, code: string) => items?.find((k) => k.code === code)?.value ?? null;
  const amount = value(data?.items, "ordered_amount");
  const prevAmount = value(previous.data?.items, "ordered_amount");
  const active = value(data?.items, "active_customers");
  const prevActive = value(previous.data?.items, "active_customers");
  const orders = value(data?.items, "order_count");
  const leader = sellers.data?.items[0];
  const biggest = customers.data?.top_customers[0];

  const groups: Group[] = [
    { title: "Crecimiento", question: "¿Vendemos más y a más clientes?", items: [
      { key: "growth", title: "Crecimiento de la venta", value: amount != null && prevAmount ? ((amount - prevAmount) / prevAmount) * 100 : null, format: signedPct,
        target: 8, critical: 2, higher: true, goalText: "Meta ≥ +8 % · crítico bajo +2 %", origin: "real",
        explain: "Pedidos de 12 meses frente a los 12 anteriores, sin IGV. Por debajo de la inflación es una caída real.",
        pendingReason: "Falta el año anterior completo" },
      { key: "active", title: "Clientes activos", value: active, format: (v) => formatInt(v),
        target: prevActive ?? 0, critical: (prevActive ?? 0) * 0.95, higher: true, origin: "real",
        goalText: prevActive != null ? `Meta ≥ ${formatInt(prevActive)} · crítico si cae más de 5 %` : "Meta: igualar el año anterior",
        explain: `Clientes con al menos un pedido en 12 meses.${prevActive != null ? ` El año anterior eran ${formatInt(prevActive)}.` : ""}` },
      { key: "ticket", title: "Ticket promedio", value: value(data?.items, "average_order"), format: (v) => formatPen(v),
        target: 1300, critical: 1100, higher: true, goalText: "Meta ≥ S/ 1,300 · crítico bajo S/ 1,100", origin: "real",
        explain: `Monto de pedidos dividido entre ${orders != null ? `los ${formatInt(orders)} pedidos` : "los pedidos"} del período.` },
    ] },
    { title: "Precio y rentabilidad", question: "¿Cuánto ganamos por cada sol vendido?", items: [
      { key: "margin", title: "Margen bruto", value: null, format: pct, target: 22, critical: 15, higher: true, origin: "pending",
        goalText: "Meta ≥ 22 % · crítico bajo 15 %", explain: "(Venta − costo) ÷ venta.", pendingReason: "Falta el archivo de costos de compra" },
      { key: "discount", title: "Descuento real bajo referencia", value: value(data?.items, "below_reference_pct"), format: pct,
        target: 12, critical: 20, higher: false, origin: "estimated", goalText: "Meta ≤ 12 % · crítico sobre 20 %",
        explain: "1 − precio pagado ÷ precio de referencia (último precio pagado), en los 5 productos principales." },
      { key: "waste", title: "Merma sobre la venta", value: null, format: pct, target: 0.5, critical: 1.5, higher: false, origin: "pending",
        goalText: "Meta ≤ 0,5 % · crítico sobre 1,5 %", explain: "Producto dado de baja por vencimiento o daño, dividido entre la venta.",
        pendingReason: "Falta el archivo de lotes y bajas" },
    ] },
    { title: "Riesgo", question: "¿Qué tan expuestos estamos si algo falla?", items: [
      { key: "top10", title: "Venta en los 10 mayores clientes", value: value(data?.items, "top_ten_share_pct"), format: pct,
        target: 50, critical: 65, higher: false, origin: "real", goalText: "Meta ≤ 50 % · crítico sobre 65 %",
        explain: `Si uno de ellos se va, la venta cae de golpe.${biggest?.share_pct != null ? ` El mayor pesa ${formatPercent(biggest.share_pct)}.` : ""}` },
      { key: "seller", title: "Venta de un solo vendedor", value: leader?.share_pct ?? null, format: pct,
        target: 40, critical: 50, higher: false, origin: "real", goalText: "Meta ≤ 40 % · crítico sobre 50 %",
        explain: leader ? `${titleCase(leader.name)} tiene pedidos por ${formatPen(leader.amount)} de ${formatInt(leader.customer_count)} clientes (cartera provisional).` : "Parte de la venta del vendedor principal." },
      { key: "overdue", title: "Cartera vencida", value: null, format: pct, target: 10, critical: 20, higher: false, origin: "pending",
        goalText: "Meta ≤ 10 % · crítico sobre 20 %", explain: "Deuda vencida dividida entre el total por cobrar.",
        pendingReason: "Los cobros aún no se enlazan con los pedidos" },
    ] },
    { title: "Gestión con VetChain", question: "Se miden desde que el equipo registra resultados", items: [
      { key: "alerts", title: "Alertas atendidas en 48 horas", value: null, format: pct, target: 90, critical: 70, higher: true, origin: "new",
        goalText: "Meta ≥ 90 %", explain: "Alertas con resultado registrado dentro de las 48 horas siguientes.", pendingReason: "Falta registrar las alertas y su seguimiento" },
      { key: "quotes", title: "Cotizaciones que terminan en pedido", value: null, format: pct, target: 40, critical: 20, higher: true, origin: "new",
        goalText: "Meta ≥ 40 %", explain: "Pedidos dividido entre cotizaciones enviadas en el mes.", pendingReason: "Falta enlazar cotizaciones con pedidos" },
      { key: "reactivated", title: "Clientes dormidos reactivados", value: null, format: (v) => formatInt(v), target: 25, critical: 10, higher: true, origin: "new",
        goalText: "Meta 25 por trimestre",
        explain: `Clientes sin compras en 12 meses que vuelven a comprar.${dormant.data ? ` Hay ${formatInt(dormant.data.ordered_before_count)} recuperables.` : ""}`,
        pendingReason: "Se mide desde el inicio del piloto" },
    ] },
  ];

  const all = groups.flatMap((g) => g.items);
  const counts = { ok: 0, warn: 0, bad: 0, none: 0 } as Record<State, number>;
  all.forEach((k) => { counts[stateOf(k)] += 1; });
  const critical = all.filter((k) => stateOf(k) === "bad");
  const pendingNames = all.filter((k) => k.value == null).map((k) => k.title.toLowerCase());
  const summary = [
    `De ${all.length} indicadores, ${counts.ok} ${counts.ok === 1 ? "está" : "están"} en meta, ${counts.warn} en atención, ${counts.bad} en estado crítico y ${counts.none} todavía no ${counts.none === 1 ? "tiene" : "tienen"} dato.`,
    critical.length ? `Lo más urgente: ${critical.map((k) => `${k.title.toLowerCase()} (${k.format(k.value as number)})`).join(", ")}.` : "Ningún indicador con dato está en estado crítico.",
    pendingNames.length ? `Sin dato todavía: ${pendingNames.join(", ")}.` : "",
  ].filter(Boolean);
  const asOf = period?.data_as_of;
  const subjectText = `Indicadores clave (KPIs) · datos hasta ${formatDate(asOf)}`;
  const shareText = [subjectText, "", ...summary.map((l) => `• ${l}`), "", ...all.map((k) => `${k.title}: ${k.value == null ? "sin dato" : k.format(k.value)} (${STATE[stateOf(k)].label.toLowerCase()})`),
    "", "Las metas son una propuesta para validar con Mederi."].join("\n");
  const ready = !!data && !query.loading;

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Indicadores clave (KPIs)"
      subtitle={`${all.length} indicadores para medir el negocio cada mes · datos hasta ${asOf ? formatMonthYear(asOf) : "—"} · las metas son una propuesta para validar con Mederi`}
      badge={<span className="rounded-xs bg-warn-bg px-2 py-0.5 text-[13px] font-semibold text-warn-fg">Parcial</span>}
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!ready} onClick={() => downloadKpisPdf(subjectText, summary, groups)}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!ready} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!ready} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subjectText} text={shareText.split("\n").slice(2).join("\n")} onClose={() => setChannel(null)} />}

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4 p-8">
          <ReportGeminiSummary title="Resumen del mes" report="kpis" metrics={{ indicators: all.length, on_target: counts.ok, attention: counts.warn, critical: counts.bad, missing: counts.none, sales_growth_pct: all.find((item) => item.key === "growth")?.value }} />
        </Card>
        <Card className="flex flex-col gap-4 p-8">
          <h2 className="text-lg font-semibold">Estado de los {all.length} indicadores</h2>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${counts.ok} en meta, ${counts.warn} en atención, ${counts.bad} críticos, ${counts.none} sin dato`}>
            {(["ok", "warn", "bad", "none"] as State[]).map((s) => counts[s] > 0 && <span key={s} className={STATE[s].bar} style={{ flexGrow: counts[s] }} />)}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(["ok", "warn", "bad", "none"] as State[]).map((s) => { const Icon = STATE[s].icon; return <div key={s} className="flex items-center gap-2">
              <Icon size={16} aria-hidden className={cn(s === "ok" && "text-ok-fg", s === "warn" && "text-warn-fg", s === "bad" && "text-danger-fg", s === "none" && "text-ink-muted")} />
              <dt className="flex-1">{STATE[s].label}</dt><dd className="font-semibold tabular-nums">{counts[s]}</dd></div>; })}
          </dl>
          <p className="text-[13px] text-ink-muted">En cada tarjeta, la barra es el valor actual y la línea negra, la meta propuesta.</p>
        </Card>
      </div>

      {groups.map((group) => <section key={group.title} className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3"><h2 className="text-xl font-semibold">{group.title}</h2><p className="text-sm text-ink-muted">{group.question}</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.items.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}</div>
      </section>)}

      <p className="text-[13px] leading-relaxed text-ink-muted">Las metas son una propuesta del equipo VetChain para revisar con Mederi; cuando gerencia las defina en Ajustes, reemplazarán a estas.
        Montos de pedidos sin IGV, solo productos veterinarios y sin cancelados: un pedido no es una venta facturada.</p>
    </>}
  </div>;
}

function KpiCard({ kpi }: { kpi: Indicator }) {
  const state = stateOf(kpi);
  const S = STATE[state];
  const Icon = S.icon;
  const max = Math.max(Math.abs(kpi.value ?? 0), kpi.target, kpi.critical) * 1.25 || 1;
  const width = kpi.value == null ? 0 : Math.max(0, Math.min(100, (kpi.value / max) * 100));
  const marker = Math.min(100, (kpi.target / max) * 100);
  return <Card className="flex flex-col gap-4 p-6">
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-semibold leading-snug">{kpi.title}</h3>
      <span className={cn("inline-flex flex-none items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-semibold", S.chip)}><Icon size={13} aria-hidden />{S.label}</span>
    </div>
    <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", kpi.value == null && "text-ink-muted")}>{kpi.value == null ? "Sin dato" : kpi.format(kpi.value)}</p>
    {kpi.value != null && <div className="relative h-2 rounded-full bg-canvas" aria-hidden>
      <div className={cn("h-full rounded-full", S.bar, width > 0 && width < 1 && "min-w-[3px]")} style={{ width: `${width}%` }} />
      {kpi.target > 0 && <span className="absolute -top-1.5 h-5 w-0.5 bg-ink" style={{ left: `calc(${marker}% - 1px)` }} />}
    </div>}
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">{kpi.goalText} <span className="font-normal text-ink-muted">(propuesta)</span></p>
      <p className="text-sm leading-relaxed text-ink-muted">{kpi.explain}</p>
    </div>
    <div className="mt-auto flex flex-wrap gap-2">
      {kpi.origin !== "pending" && <span className="rounded-xs border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink-2">{ORIGIN_LABEL[kpi.origin]}</span>}
      {kpi.value == null && kpi.pendingReason && <span className="rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg">Pendiente: {kpi.pendingReason.charAt(0).toLowerCase() + kpi.pendingReason.slice(1)}</span>}
    </div>
  </Card>;
}

function downloadKpisPdf(title: string, summary: string[], groups: Group[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;
  const line = (text: string, size = 10, bold = false, color: [number, number, number] = [22, 22, 22]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size).setTextColor(...color);
    for (const part of doc.splitTextToSize(text, 178)) { if (y > 282) { doc.addPage(); y = 18; } doc.text(part, 16, y); y += size * 0.45 + 1.5; }
  };
  line("Mederi Pharma · VetChain", 9, false, [95, 99, 104]);
  line(title, 15, true);
  y += 2; line("Resumen", 12, true);
  summary.forEach((s, i) => line(`${i + 1}. ${s}`));
  for (const group of groups) {
    y += 3; line(group.title, 12, true);
    for (const kpi of group.items) {
      line(`${kpi.title}: ${kpi.value == null ? "Sin dato" : kpi.format(kpi.value)} · ${STATE[stateOf(kpi)].label}`, 10, true);
      line(`${kpi.goalText} (propuesta). ${kpi.explain}${kpi.value == null && kpi.pendingReason ? ` Pendiente: ${kpi.pendingReason}.` : ""}`, 9, false, [95, 99, 104]);
    }
  }
  y += 3; line("Las metas son una propuesta para validar con Mederi. Montos de pedidos sin IGV; un pedido no es una venta facturada.", 8, false, [95, 99, 104]);
  doc.save(`vetchain-kpis-${new Date().toISOString().slice(0, 10)}.pdf`);
}
