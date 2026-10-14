"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { formatInt, formatMonthYear, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { MonthlyChart } from "./monthly-chart";
import { PeriodFilter, rangeQuery, type MonthRange } from "./period-filter";
import { compare, Pending, PendingTile, PeriodText, SectionTitle, ShareBars, StatTile, Status, Warnings, yearBefore } from "./report-ui";

const TOP_PRODUCTS = 8;

/** Meses del período sin ningún pedido cargado (el gráfico los muestra en cero). */
function emptyMonthsNote(months: string[]) {
  const have = new Set(months.map((m) => m.slice(0, 7)));
  const sorted = [...have].sort();
  if (sorted.length < 2) return "";
  const missing: string[] = [];
  let [y, m] = sorted[0].split("-").map(Number);
  while (true) {
    m += 1; if (m > 12) { m = 1; y += 1; }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key >= sorted[sorted.length - 1]) break;
    if (!have.has(key)) missing.push(formatMonthYear(`${key}-01`));
  }
  if (!missing.length) return "";
  return `${missing.join(", ").replace(/^./, (c) => c.toUpperCase())} no ${missing.length === 1 ? "tiene" : "tienen"} pedidos cargados. `;
}

/** Si el período termina antes del fin de mes, el último mes del gráfico está incompleto: se avisa para no leerlo como caída. */
function partialMonthNote(to: string | null | undefined, asOf: string | null | undefined) {
  const end = to && asOf && asOf < to ? asOf : to;
  if (!end) return "";
  const [y, m, d] = end.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d < lastDay ? `${formatMonthYear(end).replace(/^./, (c) => c.toUpperCase())} llega solo hasta el día ${d}. ` : "";
}

export function SalesReportPage() {
  const [range, setRange] = useState<MonthRange>(null);
  const query = useQuery(() => api.GET("/api/v1/reports/sales", { params: { query: rangeQuery(range) } }), [range], "No se pudo cargar el reporte de pedidos.");
  const period = query.data?.period;
  // El mismo período un año antes, para comparar.
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/sales", { params: { query: before } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to], "No se pudo cargar el período anterior.");

  const data = query.data;
  const amount = data?.amount ?? 0;
  const products = data?.products ?? [];
  const top = products.slice(0, TOP_PRODUCTS);
  const topShare = amount ? (top.reduce((sum, item) => sum + item.amount, 0) / amount) * 100 : null;
  const rest = products.slice(TOP_PRODUCTS);
  const categoriesTotal = data?.categories.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const salesDelta = compare(data?.amount, previous.data?.amount, "el mismo período del año anterior");
  const ordersDelta = compare(data?.order_count, previous.data?.order_count, "el año anterior");

  return <div className="space-y-5">
    <PageHeader title="Pedidos y productos" subtitle="Cuánto se pide, qué productos mueven la venta y cómo cambia frente al año anterior" origin="real" />
    {!data && range && <PeriodFilter value={range} onChange={setRange} />}
    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <PeriodText from={data.period.from_date} to={data.period.to_date} asOf={data.period.data_as_of} />

      <Pending kind="ai" title="Lo que dicen los datos">
        Aquí irá un resumen en tres frases: cómo va la venta frente al año anterior, qué productos la explican y qué conviene revisar.
      </Pending>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Monto de pedidos" value={formatPen(data.amount)} detail={salesDelta.detail ?? "Sin IGV, solo productos veterinarios"} tone={salesDelta.tone} origin="real" />
        <StatTile label="Pedidos" value={formatInt(data.order_count)}
          detail={`Ticket promedio ${formatPen(data.order_count ? amount / data.order_count : null)}${ordersDelta.detail ? ` · ${ordersDelta.detail}` : ""}`} origin="real" />
        <PendingTile label="Ganancia estimada" kind="data" reason="Faltan los costos de compra" />
        <PendingTile label="Proyección próximos 6 meses" kind="model" reason="Requiere el modelo de predicción" />
      </div>
      <Warnings codes={data.warnings.filter((code) => code !== "no_cost_data")} />

      <Card className="flex flex-col">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Pedidos por mes</h2><p className="text-[13px] text-ink-muted">Monto sin IGV de cada mes del período elegido</p></div>
          <PeriodFilter value={range} onChange={setRange} periodFrom={data.period.from_date} periodTo={data.period.to_date} asOf={data.period.data_as_of} />
        </div>
        <MonthlyChart items={data.monthly} />
        <p className="mt-3 text-xs text-ink-muted">{emptyMonthsNote(data.monthly.map((m) => m.month))}{partialMonthNote(data.period.to_date, data.period.data_as_of)}La proyección de los próximos meses se agregará a este gráfico cuando esté el modelo de predicción.</p>
      </Card>

      <div className={data.categories.length > 1 ? "grid gap-4 xl:grid-cols-[1.4fr_1fr]" : "grid gap-4"}>
        <Card>
          <SectionTitle>Productos que más se piden</SectionTitle>
          {top.length ? <>
            <p className="-mt-2 mb-4 text-[13px] text-ink-muted">
              {formatInt(top.length)} de {formatInt(products.length)} productos hacen el {formatPercent(topShare)} del monto
            </p>
            <ShareBars valueLabel={formatPen}
              items={top.map((item) => ({ key: item.code, label: <>{item.name} <span className="text-xs text-ink-muted">{item.code}</span></>, value: item.amount, share: amount ? (item.amount / amount) * 100 : null }))} />
            {rest.length > 0 && <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
              Otros {formatInt(rest.length)} productos: {formatPen(rest.reduce((sum, item) => sum + item.amount, 0))}
            </p>}
            {data.categories.length === 1 && <p className="mt-2 text-xs text-ink-muted">Todos los productos veterinarios están en una sola categoría de Defontana ({data.categories[0].code ?? "sin código"}), por eso no se separa por categoría.</p>}
          </> : <p className="text-sm text-ink-muted">No hay productos con pedidos en este período.</p>}
        </Card>
        {data.categories.length > 1 && <Card>
          <SectionTitle>Monto por categoría de Defontana</SectionTitle>
          <p className="-mt-2 mb-4 text-[13px] text-ink-muted">Códigos de categoría tal como vienen del ERP; su nombre está por confirmar con Mederi</p>
          {data.categories.length ? <ShareBars valueLabel={formatPen}
            items={data.categories.map((item, index) => ({ key: `${item.code}-${index}`, label: item.code ? `Categoría ${item.code}` : "Sin categoría", value: item.amount, share: categoriesTotal ? (item.amount / categoriesTotal) * 100 : null }))} />
            : <p className="text-sm text-ink-muted">No hay categorías en este período.</p>}
        </Card>}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Pending kind="data" title="Precio pagado frente al precio de lista">
          Mostrará cuánto bajo su lista se vende cada producto (el descuento que no aparece en la factura). Falta que Mederi
          entregue su lista de precios vigente.
        </Pending>
        <Pending kind="data" title="Ganancia estimada por nivel de cliente">
          Venta de cada nivel × su margen. Necesita los costos de compra validados; sin ellos no se muestra rentabilidad para no dar
          una cifra falsa.
        </Pending>
      </div>
    </>}
  </div>;
}
