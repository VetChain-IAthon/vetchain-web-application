"use client";

import { jsPDF } from "jspdf";
import { ArrowLeft, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { formatInt, formatMonthYear, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { PeriodFilter, rangeQuery, type MonthRange } from "./period-filter";
import { compare, Pending, PendingTile, ShareBars, StatTile, Status, yearBefore } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/Ventas-ubd8.dc.html. Montos de pedidos sin IGV, solo veterinarios, sin cancelados.
 *  Ganancia, proyección y categorías quedan pendientes hasta tener costos, el modelo de predicción y categorías confirmadas. */

const TOP_PRODUCTS = 5;
const SELECT = "h-11 rounded border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand focus:outline focus:outline-2 focus:outline-brand";
const BAR = "#D01F29";
const BAR_PARTIAL = "#B5B5B5"; // token chart-other: mes incompleto

type PeriodChoice = "last12" | `year-${number}` | "custom";

const monthLabel = (iso: string) => { const s = formatMonthYear(iso); return s.charAt(0).toUpperCase() + s.slice(1); };

export function SalesReportPage() {
  const [choice, setChoice] = useState<PeriodChoice>("last12");
  const [custom, setCustom] = useState<MonthRange>(null);
  const [compareOn, setCompareOn] = useState(true);
  const [seller, setSeller] = useState("");
  const [channel, setChannel] = useState<ShareChannel | null>(null);

  const range: MonthRange = choice === "last12" ? null : choice === "custom" ? custom : { from: `${choice.slice(5)}-01`, to: `${choice.slice(5)}-12` };
  const query = useQuery(() => api.GET("/api/v1/reports/sales", { params: { query: { ...rangeQuery(range), salesperson_code: seller || undefined } } }),
    [range?.from, range?.to, seller], "No se pudo cargar el reporte de ventas.");
  const period = query.data?.period;
  const before = compareOn && period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/sales", { params: { query: { ...before, salesperson_code: seller || undefined } } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to, seller], "");
  const customers = useQuery(() => !seller && period?.from_date ? api.GET("/api/v1/reports/customers", { params: { query: { from: period.from_date, to: period.to_date ?? undefined } } }) : Promise.resolve({ data: null }),
    [seller, period?.from_date, period?.to_date], "");
  const prevCustomers = useQuery(() => !seller && before ? api.GET("/api/v1/reports/customers", { params: { query: before } }) : Promise.resolve({ data: null }),
    [seller, before?.from, before?.to], "");
  const sellers = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "");

  const data = query.data;
  const asOfYear = Number((period?.data_as_of ?? "2026").slice(0, 4));
  const years = Array.from({ length: 4 }, (_, i) => asOfYear - i);
  const sellerName = sellers.data?.items.find((s) => s.code === seller)?.name;
  const delta = compare(data?.amount, previous.data?.amount, "el año anterior");
  const invoicePct = data?.list_amount ? ((data.invoice_discount ?? 0) / data.list_amount) * 100 : null;
  const activeDiff = customers.data?.active_count != null && prevCustomers.data?.active_count != null ? customers.data.active_count - prevCustomers.data.active_count : null;

  const insights = data ? [
    `Se vendieron ${formatPen(data.amount)} en el período${delta.detail ? ` (${delta.detail})` : ""}` +
      (activeDiff != null ? `, con ${formatInt(Math.abs(activeDiff))} clientes activos ${activeDiff < 0 ? "menos" : "más"} que el año anterior.` : "."),
    data.below_reference_pct != null
      ? `El descuento en factura es ${formatPen(data.invoice_discount)} (${formatPercent(invoicePct)}), pero los ${TOP_PRODUCTS} productos principales se venden en promedio ${formatPercent(data.below_reference_pct)} bajo su precio de referencia: el descuento real está dentro del precio.`
      : "",
    "La proyección de importes queda pendiente; el pronóstico de cantidades por producto está disponible por separado.",
  ].filter(Boolean) : [];
  const periodText = period?.from_date && period.to_date ? `${monthLabel(period.from_date)} a ${formatMonthYear(period.to_date)}` : "";
  const subject = `Ventas y rentabilidad · ${periodText}${sellerName ? ` · ${sellerName}` : ""}`;

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Ventas y rentabilidad" origin="real"
      subtitle={`${periodText}${periodText ? " · " : ""}montos sin IGV · la ganancia queda pendiente hasta cargar los costos`}
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!data} onClick={() => data && downloadSalesPdf(subject, insights, data)}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subject} text={insights.map((l) => `• ${l}`).join("\n")} onClose={() => setChannel(null)} />}

    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Período
        <select className={SELECT} value={choice} onChange={(e) => setChoice(e.target.value as PeriodChoice)}>
          <option value="last12">Últimos 12 meses</option>
          {years.map((y) => <option key={y} value={`year-${y}`}>Año {y}</option>)}
          <option value="custom">Elegir meses…</option>
        </select></label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Comparar con
        <select className={SELECT} value={compareOn ? "prev" : "none"} onChange={(e) => setCompareOn(e.target.value === "prev")}>
          <option value="prev">Mismo período del año anterior</option><option value="none">Sin comparar</option>
        </select></label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Vendedor
        <select className={`${SELECT} min-w-56`} value={seller} onChange={(e) => setSeller(e.target.value)}>
          <option value="">Todos</option>
          {(sellers.data?.items ?? []).map((s) => <option key={s.code} value={s.code}>{titleCase(s.name)}</option>)}
        </select></label>
      {choice === "custom" && <PeriodFilter value={custom} periodFrom={period?.from_date} periodTo={period?.to_date} asOf={period?.data_as_of} onChange={(r) => { setCustom(r); if (!r) setChoice("last12"); }} />}
    </div>

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <Card className="flex flex-col gap-4 p-8">
        {!seller && <ReportGeminiSummary title="Lo que dicen los datos" report="sales" metrics={{ amount_pen: data.amount, orders: data.order_count, invoice_discount_pen: data.invoice_discount, below_reference_pct: data.below_reference_pct }} />}
        {sellerName && <p className="text-[13px] text-ink-muted">Vista filtrada por {titleCase(sellerName)}. El resumen redactado está disponible en la vista de todos los vendedores.</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Venta neta" value={formatPen(data.amount)} detail={delta.detail} tone={delta.tone} />
        <PendingTile label="Ganancia estimada" kind="data" reason="Faltan costos de compra validados" />
        <StatTile label="Pedidos" value={formatInt(data.order_count)} detail={data.amount && data.order_count ? `Ticket promedio ${formatPen(data.amount / data.order_count)}` : undefined} />
        <StatTile label="Descuento real bajo referencia" value={formatPercent(data.below_reference_pct)} detail={`En factura: ${formatPen(data.invoice_discount)}`} />
        <PendingTile label="Proyección en soles" kind="data" reason="Pendiente de una conversión validada de cantidades a importes" />
      </div>

      <MonthlyCard data={data} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TopProducts data={data} />
        {data.categories.length > 1
          ? <Card className="flex flex-col gap-4 p-8"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Venta por categoría</h2>
              <p className="text-sm text-ink-muted">Códigos de categoría de Defontana, por confirmar</p></div><OriginBadge origin="real" className="flex-none" /></div>
              <ShareBars items={data.categories.map((c) => ({ key: c.code ?? "sin-categoria", label: c.code ? `Categoría ${c.code}` : "Sin categoría", value: c.amount, share: data.amount ? (c.amount / data.amount) * 100 : null }))} valueLabel={formatPen} /></Card>
          : <Pending kind="data" title="Venta por categoría">Todos los productos veterinarios tienen la misma categoría en los archivos de Defontana. Falta que Mederi confirme cómo agruparlos (nutrición, dermatología, antibióticos…).</Pending>}
      </div>

      <PriceCard data={data} />

      <Pending kind="data" title="Ganancia estimada por nivel de cliente">
        Venta y ganancia por nivel A, B y C. Se calculará con los costos de compra de cada producto; mientras no estén cargados no se muestra ninguna ganancia para no dar una cifra que no se puede respaldar.
      </Pending>

      <p className="text-[13px] leading-relaxed text-ink-muted">Fuentes: pedidos y detalle de Mederi, solo productos veterinarios, sin IGV, sin bonificadas ni cancelados. Un pedido no es una venta facturada: Mederi aún debe confirmar los demás estados.</p>
    </>}
  </div>;
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

type Sales = components["schemas"]["SalesReportOut"];

function MonthlyCard({ data }: { data: Sales }) {
  const end = data.period.to_date && data.period.data_as_of && data.period.data_as_of < data.period.to_date ? data.period.data_as_of : data.period.to_date;
  const [ey, em, ed] = (end ?? "").split("-").map(Number);
  const partialKey = end && ed < new Date(Date.UTC(ey, em, 0)).getUTCDate() ? end.slice(0, 7) : null;
  const rows = fillMonths(data.monthly.map((m) => ({ key: m.month.slice(0, 7), amount: m.amount, orders: m.order_count })), data.period.from_date, end);
  const chart = rows.map((r, i) => {
    const label = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(`${r.key}-01`)).replace(".", "");
    return { ...r, label: `${label.charAt(0).toUpperCase()}${label.slice(1)}${i === 0 || r.key.endsWith("-01") ? ` ${r.key.slice(2, 4)}` : ""}`, partial: r.key === partialKey, full: monthLabel(`${r.key}-01`) };
  });
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Venta por mes y proyección</h2>
        <p className="text-sm text-ink-muted">En miles de soles.{partialKey && ` ${monthLabel(`${partialKey}-01`)} llega solo hasta el día ${ed}.`}</p></div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-xs" style={{ backgroundColor: BAR }} />Venta real</span>
        {partialKey && <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-xs" style={{ backgroundColor: BAR_PARTIAL }} />Mes incompleto</span>}
      </div>
    </div>
    <div className="h-72 w-full" role="img" aria-label="Venta por mes, sin IGV">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E3E3E3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={{ stroke: "#CFCFCF" }} tickLine={false} interval={0} />
          <YAxis hide />
          <Tooltip cursor={{ fill: "#F5F5F5" }} labelFormatter={(_l, p) => p?.[0]?.payload?.full ?? ""}
            formatter={(v, _n, item) => [`${formatPen(Number(v))} · ${formatInt(item.payload.orders)} pedidos${item.payload.partial ? " (mes incompleto)" : ""}`, "Venta sin IGV"]} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chart.map((r) => <Cell key={r.key} fill={r.partial ? BAR_PARTIAL : BAR} />)}
            <LabelList dataKey="amount" position="top" fill="#3A3A3A" fontSize={11} formatter={(v: unknown) => formatNumber(Number(v) / 1000, 0)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="rounded bg-canvas p-4 text-sm text-ink-muted">La proyección en soles permanece pendiente. <Link href="/reportes/stock#pronostico" className="font-semibold text-brand">Consultar pronóstico de cantidades por producto</Link>.</p>
  </Card>;
}

function fillMonths(rows: { key: string; amount: number; orders: number }[], from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return rows;
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const out: typeof rows = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const last = to.slice(0, 7);
  for (let i = 0; i < 240; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(byKey.get(key) ?? { key, amount: 0, orders: 0 });
    if (key >= last) break;
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function TopProducts({ data }: { data: Sales }) {
  const amount = data.amount ?? 0;
  const top = data.products.slice(0, TOP_PRODUCTS);
  const rest = data.products.slice(TOP_PRODUCTS);
  const topShare = amount ? (top.reduce((s, p) => s + p.amount, 0) / amount) * 100 : null;
  const restAmount = rest.reduce((s, p) => s + p.amount, 0);
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Productos que más venden</h2>
        <p className="text-sm text-ink-muted">{top.length} de {formatInt(data.products.length)} productos hacen el {formatPercent(topShare)} de la venta</p></div>
      <OriginBadge origin="real" className="flex-none" />
    </div>
    <ShareBars items={top.map((p) => ({ key: p.code, label: p.name, value: p.amount, share: amount ? (p.amount / amount) * 100 : null }))} valueLabel={formatPen} />
    {rest.length > 0 && <p className="flex justify-between border-t border-line pt-3 text-sm text-ink-muted"><span>Otros {formatInt(rest.length)} productos</span>
      <span className="tabular-nums">{formatPen(restAmount)} · {formatPercent(amount ? (restAmount / amount) * 100 : null)}</span></p>}
  </Card>;
}

function PriceCard({ data }: { data: Sales }) {
  const points = data.price_points ?? [];
  const highest = points.filter((p) => p.below_reference_pct != null).sort((a, b) => (b.below_reference_pct ?? 0) - (a.below_reference_pct ?? 0))[0];
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Precio pagado frente al precio de referencia</h2>
        <p className="text-sm text-ink-muted">Precio de referencia = último precio pagado por cualquier cliente hasta el fin del período (no hay lista oficial).</p></div>
      <OriginBadge origin="estimated" className="flex-none" />
    </div>
    {points.length ? <Table>
      <THead><TR><TH>Producto</TH><TH numeric>Unidades</TH><TH numeric>Precio promedio</TH><TH numeric>Precio de referencia</TH><TH numeric>Bajo referencia</TH><TH numeric>Venta</TH></TR></THead>
      <TBody>{points.map((p) => <TR key={p.code}>
        <TD className="font-semibold">{p.name}</TD>
        <TD numeric>{formatNumber(p.quantity, 0)}</TD>
        <TD numeric>{formatPen(p.average_price)}</TD>
        <TD numeric className="text-ink-muted">{formatPen(p.reference_price)}</TD>
        <TD numeric className="font-semibold">{formatPercent(p.below_reference_pct)}</TD>
        <TD numeric>{formatPen(p.amount)}</TD>
      </TR>)}</TBody>
    </Table> : <p className="py-6 text-sm text-ink-muted">No hay pedidos en este período.</p>}
    {highest && (highest.below_reference_pct ?? 0) > 0 && <p className="rounded border border-warn-fg/20 bg-warn-bg px-5 py-3 text-sm text-warn-fg">
      {highest.name} se vende {formatPercent(highest.below_reference_pct)} bajo su referencia, el más alto de los {points.length}. Revisar si es precio por volumen a distribuidoras o una referencia desactualizada.</p>}
  </Card>;
}

function downloadSalesPdf(title: string, insights: string[], data: Sales) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;
  const line = (text: string, size = 10, bold = false, color: [number, number, number] = [22, 22, 22]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size).setTextColor(...color);
    for (const part of doc.splitTextToSize(text, 178)) { if (y > 282) { doc.addPage(); y = 18; } doc.text(part, 16, y); y += size * 0.45 + 1.5; }
  };
  line("Mederi Pharma · VetChain", 9, false, [95, 99, 104]);
  line(title, 15, true);
  y += 2; line("Lo que dicen los datos", 12, true);
  insights.forEach((s, i) => line(`${i + 1}. ${s}`));
  y += 2; line("Cifras", 12, true);
  line(`Venta neta: ${formatPen(data.amount)} · Pedidos: ${formatInt(data.order_count)} · Descuento en factura: ${formatPen(data.invoice_discount)} · Bajo referencia: ${formatPercent(data.below_reference_pct)}`);
  line("Ganancia y proyección: pendientes (costos y modelo de predicción).", 9, false, [95, 99, 104]);
  y += 2; line("Venta por mes", 12, true);
  data.monthly.forEach((m) => line(`${monthLabel(m.month)}: ${formatPen(m.amount)} (${formatInt(m.order_count)} pedidos)`, 9));
  y += 2; line("Precio pagado frente a la referencia (5 principales)", 12, true);
  (data.price_points ?? []).forEach((p) => line(`${p.name}: ${formatNumber(p.quantity, 0)} u · promedio ${formatPen(p.average_price)} · referencia ${formatPen(p.reference_price)} · ${formatPercent(p.below_reference_pct)} bajo · ${formatPen(p.amount)}`, 9));
  y += 3; line("Montos de pedidos sin IGV, solo veterinarios. Un pedido no es una venta facturada. Referencia = último precio pagado (estimado).", 8, false, [95, 99, 104]);
  doc.save(`vetchain-ventas-${data.period.to_date ?? "periodo"}.pdf`);
}
