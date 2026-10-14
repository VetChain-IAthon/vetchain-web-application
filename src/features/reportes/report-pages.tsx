"use client";

import Link from "next/link";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery, type QueryError } from "@/lib/use-query";
import { MonthlyChart } from "./monthly-chart";

const warningText: Record<string, string> = {
  no_order_data: "No hay pedidos veterinarios para este período.",
  no_cost_data: "No hay costos de compra validados. El margen y la rentabilidad no están disponibles.",
  alerts_unavailable: "Las alertas se mostrarán cuando gerencia defina los factores del ritmo de compra.",
  order_statuses_provisional: "Los montos son de pedidos sin IGV. Se excluyen cancelados; Mederi aún debe confirmar los demás estados. Un pedido no acredita una venta facturada.",
  category_unconfirmed: "La interpretación de las categorías de Defontana está pendiente de confirmación.",
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

export function DashboardPage() {
  const summary = useQuery(() => api.GET("/api/v1/dashboard/summary"), [], "No se pudo cargar el Panel.");
  const sellers = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar la venta por vendedor.");
  return <div className="space-y-5">
    <PageHeader title="Panel gerencial" subtitle="Resumen del negocio en los últimos 12 meses de datos disponibles" origin="real" />
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
        <Card><div className="mb-4 flex items-center justify-between"><SectionTitle>Pedidos por mes</SectionTitle><OriginBadge origin="real" /></div>
          <MonthlyChart items={summary.data.monthly} /></Card>
        <Card><SectionTitle>Principales clientes</SectionTitle>
          {summary.data.top_customers.length ? <Table><THead><TR><TH>Cliente</TH><TH numeric>Monto</TH><TH numeric>Participación</TH></TR></THead>
            <TBody>{summary.data.top_customers.slice(0, 5).map((item) => <TR key={item.ruc}><TD>{item.name}</TD><TD numeric>{formatPen(item.amount)}</TD><TD numeric>{formatPercent(item.share_pct)}</TD></TR>)}</TBody></Table>
            : <p className="text-sm text-ink-muted">Sin clientes con pedidos en el período.</p>}
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><SectionTitle>Clientes en riesgo</SectionTitle><Notice tone="warn">{warningText.alerts_unavailable}</Notice></Card>
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
  const query = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar el reporte de pedidos.");
  return <div className="space-y-5"><PageHeader title="Pedidos y productos" subtitle="Pedidos veterinarios; la rentabilidad espera costos validados" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {query.data && <>
      <PeriodText from={query.data.period.from_date} to={query.data.period.to_date} asOf={query.data.period.data_as_of} />
      <div className="grid gap-4 md:grid-cols-3"><KpiCard label="Monto de pedidos" value={formatPen(query.data.amount)} origin="real" />
        <KpiCard label="Pedidos" value={formatInt(query.data.order_count)} origin="real" />
        <KpiCard label="Margen" value="—" hint="Faltan costos" /></div>
      <Warnings codes={query.data.warnings} />
      <Card><SectionTitle>Pedidos por mes</SectionTitle><MonthlyChart items={query.data.monthly} /></Card>
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
