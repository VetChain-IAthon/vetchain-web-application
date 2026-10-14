"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatDate, formatInt, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery, type QueryError } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { MonthlyChart } from "./monthly-chart";
import { PeriodFilter, rangeQuery, type MonthRange } from "./period-filter";

const warningText: Record<string, string> = {
  no_order_data: "No hay pedidos veterinarios para este período.",
  no_cost_data: "No hay costos de compra validados. El margen y la rentabilidad no están disponibles.",
  alerts_unavailable: "Las alertas se mostrarán cuando gerencia defina los factores del ritmo de compra.",
  order_statuses_provisional: "Los montos son de pedidos sin IGV. Se excluyen cancelados; Mederi aún debe confirmar los demás estados. Un pedido no acredita una venta facturada.",
  category_unconfirmed: "La interpretación de las categorías de Defontana está pendiente de confirmación.",
  risk_factors_provisional: "Cálculo provisional: en riesgo es quien pasó más de 1,5 veces su ritmo de compra sin pedir (30 días si tiene un solo pedido). Gerencia aún debe confirmar estos factores.",
  risk_factors_unconfigured: "Los clientes en riesgo y dormidos esperan los factores de ritmo de compra definidos por gerencia.",
  stock_balance_unconfirmed: "El campo de saldo del kardex está por confirmar con Mederi. Revisa estas cantidades antes de usarlas para decidir compras.",
  no_lot_data: "Los archivos no incluyen lotes ni fechas de vencimiento. No se calculan mermas ni próximos vencimientos.",
  no_stock_data: "No se encontraron saldos de kardex para este período.",
  portfolio_provisional: "La asignación de carteras por vendedor es provisional; Mederi debe confirmar las carteras oficiales.",
  receipts_not_linked: "Los cobros no se pueden enlazar con los pedidos. No se calcula deuda pendiente ni antigüedad de saldos.",
  targets_unconfigured: "Gerencia aún no definió metas para estos indicadores; por eso no se muestran estados de desempeño.",
  conversion_unavailable: "La conversión de cotizaciones y el monto recuperado no se pueden calcular todavía.",
};

function Warnings({ codes }: { codes: string[] }) {
  const unique = [...new Set(codes)];
  return <>{unique.map((code) => <Notice key={code} tone="warn">{warningText[code] ?? code}</Notice>)}</>;
}

function Status({ loading, error, reload }: { loading: boolean; error: QueryError | null; reload: () => void }) {
  if (error) return <Notice>{error.message} <Button variant="outline" size="sm" onClick={reload}>Reintentar</Button></Notice>;
  if (loading) return <p className="py-10 text-sm text-ink-muted">Cargando datos…</p>;
  return null;
}

function PeriodText({ from, to, asOf }: { from?: string | null; to?: string | null; asOf?: string | null }) {
  return <p className="text-sm text-ink-muted">Período: {formatDate(from)} – {formatDate(to)} · datos cargados hasta {formatDate(asOf)} · montos de pedidos sin IGV.</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold">{children}</h2>;
}

/** Lo redacta Gemini a partir de cifras agregadas. Vacío hasta que se configure la clave de la API. */
function WeeklySummary() {
  return <section aria-label="Resumen de la semana" className="rounded-lg border border-line border-l-4 border-l-brand bg-surface px-6 py-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold">Resumen de la semana</h2>
      <span className="text-xs text-ink-muted">Propuesta: enviarlo cada lunes por WhatsApp o correo</span>
    </div>
    <p className="mt-2 text-sm text-ink-muted">Todavía no hay resumen. Lo redactará la IA con las cifras de la semana cuando se configure la clave de la API de Gemini.</p>
  </section>;
}

function TopCustomers({ items }: { items: components["schemas"]["CustomerAmountOut"][] }) {
  const top = items.slice(0, 3);
  const maxShare = Math.max(...top.map((item) => item.share_pct ?? 0), 0);
  return <Card>
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-semibold">Principales clientes</h2>
      <span className="text-[13px] text-ink-muted">Los 3 clientes con más venta en 12 meses · <Link href="/clientes" className="font-semibold text-brand hover:text-brand-hover">Ver todos en Clientes</Link></span>
    </div>
    {top.length ? <Table><THead><TR><TH>Cliente</TH><TH numeric>Venta (sin IGV)</TH><TH numeric>Pedidos</TH><TH>Participación en la venta</TH></TR></THead>
      <TBody>{top.map((item) => <TR key={item.ruc}>
        <TD><Link href={`/clientes/${item.ruc}`} className="font-semibold text-ink hover:text-brand">{item.name}</Link></TD>
        <TD numeric>{formatPen(item.amount)}</TD>
        <TD numeric>{formatInt(item.order_count)}</TD>
        <TD><div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${maxShare ? ((item.share_pct ?? 0) / maxShare) * 100 : 0}%` }} />
          </div>
          <span className="w-14 text-right tabular-nums text-ink-2">{formatPercent(item.share_pct)}</span>
        </div></TD>
      </TR>)}</TBody></Table>
      : <p className="text-sm text-ink-muted">Sin clientes con pedidos en el período.</p>}
  </Card>;
}

// Filas fijas del seguimiento: «sin contactar» y los 5 resultados de contacto (pendientes de confirmar con Mederi).
const FOLLOW_UP_ROWS: [string | null, string, string][] = [
  [null, "Sin contactar", "bg-neutral-bg text-neutral-fg"],
  ["Pidió cotización", "Pidió cotización", "bg-ok-bg text-ok-fg"],
  ["Hará pedido directo", "Hará pedido directo", "bg-ok-bg text-ok-fg"],
  ["No necesita", "No necesita", "bg-neutral-bg text-neutral-fg"],
  ["Compró a otro", "Compró a otro", "bg-danger-bg text-danger-fg"],
  ["No contestó", "No contestó", "bg-warn-bg text-warn-fg"],
];

type FollowUpQuery = ReturnType<typeof useQuery<components["schemas"]["AtRiskFollowUpOut"]>>;

function FollowUpBySalesperson({ query }: { query: FollowUpQuery }) {
  const [code, setCode] = useState<string | null>(null);
  const items = query.data?.items ?? [];
  const selected = items.find((item) => item.salesperson_code === code) ?? items[0];
  const known = new Set(FOLLOW_UP_ROWS.map(([outcome]) => outcome));
  const rows = selected ? [
    ...FOLLOW_UP_ROWS.map(([outcome, label, tone]) => {
      const bucket = selected.buckets.find((b) => b.outcome === outcome);
      return { key: label, label, tone, count: bucket?.customer_count ?? 0, amount: bucket?.money_at_stake ?? 0 };
    }),
    // Resultados escritos a mano que no están en la lista fija.
    ...selected.buckets.filter((b) => !known.has(b.outcome)).map((b) => ({ key: `x-${b.outcome}`, label: b.outcome ?? "", tone: "bg-neutral-bg text-neutral-fg", count: b.customer_count, amount: b.money_at_stake })),
  ] : [];
  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="text-lg font-semibold">Seguimiento de alertas por vendedor</h2>
      <span className="rounded-xs bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">Cartera provisional</span>
    </div>
    <p className="mb-4 mt-1 text-[13px] text-ink-muted">Qué pasó con cada cliente en riesgo que el vendedor contactó. Soles en juego = pedido promedio de cada cliente.
      Los soles recuperados se medirán cuando haya pedidos reales después de cada cotización.</p>
    <Status loading={query.loading && !query.data} error={query.error} reload={query.reload} />
    {query.data && (selected ? <Table><THead><TR>
        <TH><select aria-label="Vendedor" value={selected.salesperson_code} onChange={(e) => setCode(e.target.value)}
          className="-ml-1 rounded border border-line-strong bg-surface px-2 py-1 text-xs font-semibold text-ink">
          {items.map((item) => <option key={item.salesperson_code} value={item.salesperson_code}>{item.salesperson_name} ({item.customer_count})</option>)}
        </select></TH>
        <TH numeric>Clientes</TH><TH numeric>Soles en juego</TH></TR></THead>
      <TBody>{rows.map((row) => <TR key={row.key}>
        <TD><span className={`inline-flex rounded-xs px-2 py-0.5 text-xs font-semibold ${row.tone}`}>{row.label}</span></TD>
        <TD numeric className="font-semibold">{formatInt(row.count)}</TD>
        <TD numeric>{formatPen(row.amount)}</TD>
      </TR>)}</TBody></Table>
      : <p className="text-sm text-ink-muted">Ningún vendedor tiene clientes en riesgo.</p>)}
  </Card>;
}

type AtRiskQuery = ReturnType<typeof useQuery<components["schemas"]["AtRiskCustomerPageOut"]>>;

function AtRiskCustomers({ query }: { query: AtRiskQuery }) {
  return <Card>
    <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Clientes en riesgo</h2><OriginBadge origin="estimated" /></div>
    <p className="mt-1 text-[13px] text-ink-muted">Compran menos seguido de lo habitual, ordenados por soles en juego
      {query.data ? ` · ${formatInt(query.data.total)} ${query.data.total === 1 ? "cliente" : "clientes"}` : ""}</p>
    <Status loading={query.loading && !query.data} error={query.error} reload={query.reload} />
    {query.data && (query.data.items.length ? <ul className="mt-3 divide-y divide-line">
      {query.data.items.map((item) => <li key={item.ruc} className="py-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/clientes/${item.ruc}`} className="font-semibold text-ink hover:text-brand">{item.name}</Link>
          <span className="flex-none rounded-xs bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">En riesgo</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Última compra hace {formatInt(item.days_since_last_order)} días al corte de los datos; {item.purchase_rhythm_days != null
            ? `suele comprar cada ${formatNumber(item.purchase_rhythm_days)} días` : "tiene un solo pedido en 12 meses"}. Pedido promedio {formatPen(item.money_at_stake)}.
        </p>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-ink-muted">Ningún cliente está atrasado respecto de su ritmo de compra.</p>)}
    {query.data && <p className="mt-3 text-xs text-ink-muted">{warningText[query.data.warning]}</p>}
  </Card>;
}

export function DashboardPage() {
  const [range, setRange] = useState<MonthRange>(null);
  const summary = useQuery(() => api.GET("/api/v1/dashboard/summary"), [], "No se pudo cargar el Panel.");
  const sellers = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar la venta por vendedor.");
  const followUp = useQuery(() => api.GET("/api/v1/customers/at-risk/follow-up"), [], "No se pudo cargar el seguimiento por vendedor.");
  const atRisk = useQuery(() => api.GET("/api/v1/customers/at-risk", { params: { query: { per_page: 5 } } }), [], "No se pudo cargar los clientes en riesgo.");
  // El filtro de mes y año solo cambia el gráfico: los indicadores siguen siendo de los últimos 12 meses.
  const chart = useQuery(() => range ? api.GET("/api/v1/reports/sales", { params: { query: rangeQuery(range) } }) : Promise.resolve({ data: null }),
    [range], "No se pudo cargar los pedidos del período.");
  const monthly = range ? chart.data?.monthly : summary.data?.monthly;
  return <div className="space-y-5">
    <PageHeader title="Panel gerencial" subtitle="Resumen del negocio en los últimos 12 meses de datos disponibles" origin="real" />
    <WeeklySummary />
    <Status loading={summary.loading} error={summary.error} reload={summary.reload} />
    {summary.data && <>
      <PeriodText from={summary.data.period.from_date} to={summary.data.period.to_date} asOf={summary.data.period.data_as_of} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Monto de pedidos" value={formatPen(summary.data.amount)} hint="Productos veterinarios" origin="real" />
        <KpiCard label="Clientes con pedido" value={formatInt(summary.data.active_customers)} origin="real" />
        <KpiCard label="Pedidos" value={formatInt(summary.data.order_count)} origin="real" />
        <KpiCard label="Ticket promedio" value={formatPen(summary.data.average_order)} origin="real" />
        <KpiCard label="10 mayores clientes" value={formatPercent(summary.data.top_ten_share_pct)} hint="Del monto de pedidos" origin="real" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">Pedidos por mes</h2><OriginBadge origin="real" /></div>
          <PeriodFilter value={range} onChange={setRange} periodFrom={summary.data.period.from_date} periodTo={summary.data.period.to_date} asOf={summary.data.period.data_as_of} /></div>
          {range && chart.error ? <Status loading={false} error={chart.error} reload={chart.reload} />
            : !monthly ? <p className="py-10 text-sm text-ink-muted">Cargando datos…</p>
            : <div className={cn("flex min-h-64 flex-1 flex-col", chart.loading && "opacity-60 transition-opacity")}><MonthlyChart items={monthly} className="h-auto min-h-64 flex-1" /></div>}</Card>
        <AtRiskCustomers query={atRisk} /></div>
      <TopCustomers items={summary.data.top_customers} />
      <div className="grid gap-4 xl:grid-cols-2">
        <FollowUpBySalesperson query={followUp} />
        <Card><SectionTitle>Pedidos por vendedor</SectionTitle>
          <Status loading={sellers.loading} error={sellers.error} reload={sellers.reload} />
          {sellers.data && (sellers.data.items.length ? <Table><THead><TR><TH>Vendedor</TH><TH numeric>Monto</TH><TH numeric>Participación</TH></TR></THead>
            <TBody>{sellers.data.items.slice(0, 5).map((item) => <TR key={item.code}><TD>{item.name}</TD><TD numeric>{formatPen(item.amount)}</TD><TD numeric>{formatPercent(item.share_pct)}</TD></TR>)}</TBody></Table>
            : <p className="text-sm text-ink-muted">Sin pedidos para vendedores en este período.</p>)}
        </Card>
      </div>
      <Warnings codes={summary.data.warnings.filter((code) => code !== "alerts_unavailable")} />
    </>}
  </div>;
}

const reportLinks: Record<string, string> = {
  sales: "/reportes/ventas", customers: "/reportes/clientes", stock: "/reportes/stock",
  salespeople: "/reportes/vendedores", receivables: "/reportes/cobranza", kpis: "/reportes/kpis",
  funnel: "/reportes/vendedores",
};

export function ReportsIndexPage() {
  const query = useQuery(() => api.GET("/api/v1/reports"), [], "No se pudo cargar el catálogo de reportes.");
  return <div className="space-y-5">
    <PageHeader title="Reportes" subtitle="Datos disponibles y límites de cada análisis" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && (query.data.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {query.data.items.map((item) => <Link key={item.code} href={reportLinks[item.code] ?? "/reportes"} className="block rounded-lg border border-line bg-surface p-6 transition-colors hover:border-brand">
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{item.name}</h2>{item.data_origin === "real" && <OriginBadge origin="real" />}</div>
        {item.warning && <p className="mt-3 text-sm text-ink-muted">{warningText[item.warning] ?? item.warning}</p>}
        <span className="mt-5 inline-block text-sm font-semibold text-brand">Abrir reporte →</span>
      </Link>)}
    </div> : <Notice tone="warn">Todavía no hay reportes disponibles.</Notice>)}
  </div>;
}

export function SalesReportPage() {
  const [range, setRange] = useState<MonthRange>(null);
  const query = useQuery(() => api.GET("/api/v1/reports/sales", { params: { query: rangeQuery(range) } }), [range], "No se pudo cargar el reporte de pedidos.");
  return <div className="space-y-5"><PageHeader title="Pedidos y productos" subtitle="Pedidos veterinarios; la rentabilidad espera costos validados" origin="real" />
    {!query.data && range && <PeriodFilter value={range} onChange={setRange} />}
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <>
      <PeriodText from={query.data.period.from_date} to={query.data.period.to_date} asOf={query.data.period.data_as_of} />
      <div className="grid gap-4 md:grid-cols-3"><KpiCard label="Monto de pedidos" value={formatPen(query.data.amount)} origin="real" />
        <KpiCard label="Pedidos" value={formatInt(query.data.order_count)} origin="real" />
        <KpiCard label="Margen" value="—" hint="Faltan costos" /></div>
      <Warnings codes={query.data.warnings} />
      <Card><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold">Pedidos por mes</h2>
        <PeriodFilter value={range} onChange={setRange} periodFrom={query.data.period.from_date} periodTo={query.data.period.to_date} asOf={query.data.period.data_as_of} /></div>
        <MonthlyChart items={query.data.monthly} /></Card>
      <div className="grid gap-4 xl:grid-cols-2"><Card><SectionTitle>Productos con mayor monto</SectionTitle>
        {query.data.products.length ? <Table><THead><TR><TH>Producto</TH><TH numeric>Monto sin IGV</TH></TR></THead>
          <TBody>{query.data.products.slice(0, 12).map((item) => <TR key={item.code}><TD>{item.name}<span className="block text-xs text-ink-muted">{item.code}</span></TD><TD numeric>{formatPen(item.amount)}</TD></TR>)}</TBody></Table>
          : <p className="text-sm text-ink-muted">No hay productos en este período.</p>}</Card>
        <Card><SectionTitle>Categorías de Defontana</SectionTitle>
          {query.data.categories.length ? <Table><THead><TR><TH>Código de categoría</TH><TH numeric>Monto sin IGV</TH></TR></THead>
            <TBody>{query.data.categories.map((item, index) => <TR key={`${item.code}-${index}`}><TD>{item.code ?? "Sin código"}</TD><TD numeric>{formatPen(item.amount)}</TD></TR>)}</TBody></Table>
            : <p className="text-sm text-ink-muted">No hay categorías en este período.</p>}</Card></div>
    </>}
  </div>;
}

export function CustomersReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/customers"), [], "No se pudo cargar el reporte de clientes.");
  return <div className="space-y-5"><PageHeader title="Clientes: retención y reactivación" subtitle="Actividad de la cartera y concentración de pedidos" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <>
      <PeriodText from={query.data.period.from_date} to={query.data.period.to_date} asOf={query.data.period.data_as_of} />
      <div className="grid gap-4 md:grid-cols-4"><KpiCard label="Maestro de clientes" value={formatInt(query.data.master_count)} origin="real" />
        <KpiCard label="Con pedido" value={formatInt(query.data.active_count)} origin="real" />
        <KpiCard label="Sin pedido en el período" value={formatInt(query.data.no_orders_12m)} origin="real" />
        <KpiCard label="10 mayores clientes" value={formatPercent(query.data.top_ten_share_pct)} hint="Del monto de pedidos" origin="real" /></div>
      <Warnings codes={query.data.warnings} />
      <Card><SectionTitle>Clientes con mayor monto pedido</SectionTitle>
        {query.data.top_customers.length ? <Table><THead><TR><TH>Cliente</TH><TH numeric>Monto sin IGV</TH><TH numeric>Participación</TH></TR></THead>
          <TBody>{query.data.top_customers.map((item) => <TR key={item.ruc}><TD><Link href={`/clientes/${item.ruc}`} className="font-semibold text-brand hover:underline">{item.name}</Link><span className="block text-xs text-ink-muted">{item.ruc}</span></TD><TD numeric>{formatPen(item.amount)}</TD><TD numeric>{formatPercent(item.share_pct)}</TD></TR>)}</TBody></Table>
          : <p className="text-sm text-ink-muted">No hay clientes con pedidos en el período.</p>}</Card>
    </>}
  </div>;
}

export function StockReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/stock"), [], "No se pudo cargar el reporte de stock.");
  return <div className="space-y-5"><PageHeader title="Stock" subtitle="Saldos del kardex al último cierre disponible" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <><p className="text-sm text-ink-muted">Último cierre: {formatDate(query.data.stock_as_of)}</p><Warnings codes={query.data.warnings} />
      <Card><SectionTitle>Saldo por producto</SectionTitle>
        {query.data.items.length ? <Table><THead><TR><TH>Producto</TH><TH numeric>Saldo por confirmar</TH><TH>Último período</TH></TR></THead>
          <TBody>{query.data.items.map((item) => <TR key={item.product_code}><TD>{item.product_name ?? item.product_code}<span className="block text-xs text-ink-muted">{item.product_code}</span></TD>
            <TD numeric>{formatNumber(item.balance, 4)}</TD><TD>{formatDate(item.last_period_end)}</TD></TR>)}</TBody></Table>
          : <p className="text-sm text-ink-muted">No hay saldos para este cierre.</p>}</Card>
    </>}
  </div>;
}

export function ReceivablesReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/receivables"), [], "No se pudo cargar el reporte de cobranza.");
  return <div className="space-y-5"><PageHeader title="Cartera y cobranza" subtitle="Estado de los datos de cobros" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <Card><SectionTitle>Deuda pendiente</SectionTitle><Warnings codes={query.data.warnings} />
      <p className="mt-4 text-sm text-ink-muted">Los archivos de cobros identifican comprobantes, pero los pedidos tienen otro número. Se necesita la relación entre ambos para calcular saldos.</p></Card>}
  </div>;
}

export function SalespeopleReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar el reporte de vendedores.");
  const funnel = useQuery(() => api.GET("/api/v1/reports/funnel"), [], "No se pudo cargar el seguimiento comercial.");
  return <div className="space-y-5"><PageHeader title="Vendedores y seguimiento" subtitle="Pedidos veterinarios por vendedor y estado del embudo comercial" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <><PeriodText from={query.data.period.from_date} to={query.data.period.to_date} asOf={query.data.period.data_as_of} />
      <KpiCard label="Monto total de pedidos" value={formatPen(query.data.amount)} origin="real" />
      <Warnings codes={query.data.warnings} />
      <Card><SectionTitle>Pedidos por vendedor</SectionTitle>
        {query.data.items.length ? <Table><THead><TR><TH>Vendedor</TH><TH numeric>Monto</TH><TH numeric>Pedidos</TH><TH numeric>Clientes</TH><TH numeric>Participación</TH></TR></THead>
          <TBody>{query.data.items.map((item) => <TR key={item.code}><TD>{item.name}<span className="block text-xs text-ink-muted">{item.code}</span></TD>
            <TD numeric>{formatPen(item.amount)}</TD><TD numeric>{formatInt(item.order_count)}</TD><TD numeric>{formatInt(item.customer_count)}</TD><TD numeric>{formatPercent(item.share_pct)}</TD></TR>)}</TBody></Table>
          : <p className="text-sm text-ink-muted">No hay pedidos por vendedor en este período.</p>}</Card>
      <Card><SectionTitle>De la alerta al pedido</SectionTitle><Status loading={funnel.loading} error={funnel.error} reload={funnel.reload} />
        {funnel.data && <Warnings codes={funnel.data.warnings} />}</Card>
    </>}
  </div>;
}

const kpiLabels: Record<string, string> = {
  ordered_amount: "Monto de pedidos", order_count: "Pedidos", average_order: "Ticket promedio",
  active_customers: "Clientes con pedido", top_ten_share_pct: "Concentración de los 10 mayores",
};

export function KpisReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/kpis"), [], "No se pudo cargar los indicadores.");
  return <div className="space-y-5"><PageHeader title="Indicadores clave (KPIs)" subtitle="Valores medibles con los archivos disponibles; metas pendientes de gerencia" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <><PeriodText from={query.data.period.from_date} to={query.data.period.to_date} asOf={query.data.period.data_as_of} />
      <Warnings codes={query.data.warnings} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.items.map((item) => <KpiCard key={item.code}
        label={kpiLabels[item.code] ?? item.code}
        value={item.code === "ordered_amount" || item.code === "average_order" ? formatPen(item.value) : item.code.endsWith("share_pct") ? formatPercent(item.value) : formatInt(item.value)}
        hint={item.warning ? warningText[item.warning] : "Meta sin definir"} origin="real" />)}</div>
    </>}
  </div>;
}
