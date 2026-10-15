"use client";

import Link from "next/link";
import { useState } from "react";
import { OriginBadge } from "@/components/data/origin-badge";
import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatInt, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { MonthlyChart } from "./monthly-chart";
import { PeriodFilter, rangeQuery, type MonthRange } from "./period-filter";
import { PeriodText, SectionTitle, Status, Warnings, warningText } from "./report-ui";
import { ReportGeminiSummary } from "./report-gemini-summary";


function DashboardSummary({ data }: { data: components["schemas"]["DashboardSummaryOut"] }) {
  return <section aria-label="Resumen del período" className="rounded-lg border border-line border-l-4 border-l-brand bg-surface px-6 py-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold">Resumen del período</h2>
    </div>
    <ReportGeminiSummary report="dashboard" metrics={{ amount_pen: data.amount, orders: data.order_count, active_customers: data.active_customers, average_order_pen: data.average_order, top_ten_share_pct: data.top_ten_share_pct }} />
  </section>;
}

export function TopCustomers({ items }: { items: components["schemas"]["CustomerAmountOut"][] }) {
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

export function FollowUpBySalesperson({ query }: { query: FollowUpQuery }) {
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

export function AtRiskCustomers({ query }: { query: AtRiskQuery }) {
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
    <Status loading={summary.loading} error={summary.error} reload={summary.reload} />
    {summary.data && <>
      <DashboardSummary data={summary.data} />
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
