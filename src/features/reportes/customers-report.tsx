"use client";

import Link from "next/link";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { TopCustomers } from "./report-pages";
import { compare, Pending, PeriodText, SectionTitle, StatTile, Status, warningText, yearBefore } from "./report-ui";

const LEVELS = ["A", "B", "C"] as const;
const share = (part: number, total: number) => (total ? (part / total) * 100 : 0);

export function CustomersReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/customers"), [], "No se pudo cargar el reporte de clientes.");
  const period = query.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/customers", { params: { query: before } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to], "No se pudo cargar el año anterior.");
  const sales = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar los pedidos.");
  const atRisk = useQuery(() => api.GET("/api/v1/customers/at-risk", { params: { query: { per_page: 6 } } }), [], "No se pudo cargar los clientes en riesgo.");
  const dormant = useQuery(() => api.GET("/api/v1/customers/dormant", { params: { query: { per_page: 6 } } }), [], "No se pudo cargar los clientes dormidos.");
  // Un pedido por nivel: el total de clientes y su monto de 12 meses salen de la misma lista de Clientes filtrada.
  const levels = useQuery(async () => {
    const results = await Promise.all(LEVELS.map((level) => api.GET("/api/v1/customers", { params: { query: { level, per_page: 1 } } })));
    const failed = results.find((r) => r.error);
    if (failed) return { error: failed.error };
    return { data: LEVELS.map((level, i) => ({ level, customers: results[i].data!.total, amount: results[i].data!.total_amount_12m })) };
  }, [], "Los niveles aparecerán cuando gerencia defina los umbrales en Ajustes.");

  const data = query.data;
  const active = data?.active_count ?? 0;
  const activeDelta = compare(data?.active_count, previous.data?.active_count, "el año anterior");
  const activeDiff = data?.active_count != null && previous.data?.active_count != null ? data.active_count - previous.data.active_count : null;
  const recoverable = dormant.data?.ordered_before_count ?? null;
  const neverOrdered = dormant.data ? dormant.data.dormant_count - dormant.data.ordered_before_count : null;

  return <div className="space-y-5">
    <PageHeader title="Clientes: retención y reactivación" subtitle="Quién compra, quién se está yendo y a quién recuperar · montos sin IGV" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {data && <>
      <PeriodText from={data.period.from_date} to={data.period.to_date} asOf={data.period.data_as_of} />

      <Pending kind="ai" title="Lo que dicen los datos">
        Aquí irá un resumen en tres frases: cómo cambia la cantidad de clientes activos, cuánto pesan los grandes y a quién conviene recuperar primero.
      </Pending>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Clientes con pedido" value={formatInt(data.active_count)} origin="real"
          detail={activeDiff != null ? `${activeDiff >= 0 ? "+" : ""}${formatInt(activeDiff)} frente al año anterior (${formatInt(previous.data?.active_count)})` : activeDelta.detail}
          tone={activeDelta.tone} />
        <StatTile label="Monto por cliente activo" value={formatPen(active ? (data.amount ?? 0) / active : null)} origin="real"
          detail={sales.data?.order_count && active ? `${formatNumber(sales.data.order_count / active)} pedidos al año en promedio` : undefined} />
        <StatTile label="En riesgo ahora" value={atRisk.data ? `${formatInt(atRisk.data.total)} clientes` : "—"} origin="estimated"
          detail="Pasaron 1,5 veces su ritmo de compra sin pedir" tone="warn" />
        <StatTile label="Dormidos recuperables" value={formatInt(recoverable)} origin="real"
          detail={dormant.data ? `De ${formatInt(dormant.data.dormant_count)} sin pedidos en 12 meses` : undefined} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Pocos clientes hacen la mayor parte del monto</h2><OriginBadge origin="real" /></div>
          <p className="mb-4 text-[13px] text-ink-muted">Clientes de cada nivel de volumen frente a su peso en el monto de 12 meses</p>
          {levels.error ? <Notice tone="warn">
            Los niveles A, B y C aparecerán cuando gerencia defina los umbrales de volumen. <Link href="/ajustes" className="font-semibold">Definir en Ajustes</Link>
          </Notice> : !levels.data ? <p className="text-sm text-ink-muted">Cargando niveles…</p> : (() => {
            // Los clientes sin pedidos en 12 meses tienen monto 0 y caen en C: se descuentan para comparar solo clientes activos.
            const rows = levels.data.map((l) => l.level === "C" ? { ...l, customers: Math.max(0, l.customers - (data.no_orders_12m ?? 0)) } : l);
            const totalCustomers = rows.reduce((s, l) => s + l.customers, 0);
            const totalAmount = levels.data.reduce((s, l) => s + l.amount, 0);
            return <Table><THead><TR><TH>Nivel</TH><TH numeric>Clientes activos</TH><TH numeric>% de clientes</TH><TH numeric>Monto 12 meses</TH><TH numeric>% del monto</TH></TR></THead>
              <TBody>{rows.map((l) => <TR key={l.level}>
                <TD className="font-semibold">Nivel {l.level}</TD><TD numeric>{formatInt(l.customers)}</TD><TD numeric>{formatPercent(share(l.customers, totalCustomers))}</TD>
                <TD numeric>{formatPen(l.amount)}</TD><TD numeric className="font-semibold">{formatPercent(share(l.amount, totalAmount))}</TD>
              </TR>)}</TBody></Table>;
          })()}
          <p className="mt-3 text-xs text-ink-muted">Los 10 mayores clientes hacen el {formatPercent(data.top_ten_share_pct)} del monto. Solo cuenta clientes con pedidos en 12 meses; los umbrales de cada nivel se definen en Ajustes.</p>
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">El maestro de {formatInt(data.master_count)} clientes</h2><OriginBadge origin="real" /></div>
          <p className="mb-4 text-[13px] text-ink-muted">Solo {formatPercent(share(active, data.master_count))} compró en los últimos 12 meses</p>
          {dormant.data && neverOrdered != null && recoverable != null && <>
            <div role="img" aria-label={`Activos ${active}, dormidos que compraron antes ${recoverable}, sin compras registradas ${neverOrdered}`} className="flex h-7 gap-0.5 overflow-hidden rounded">
              <div className="bg-brand" style={{ flex: active }} /><div className="bg-dormant" style={{ flex: recoverable }} /><div className="bg-line-strong" style={{ flex: neverOrdered }} />
            </div>
            <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-brand" /><span><strong>{formatInt(active)} activos</strong> · {formatPercent(share(active, data.master_count))}<br /><span className="text-ink-muted">Pidieron en 12 meses</span></span></li>
              <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-dormant" /><span><strong>{formatInt(recoverable)} dormidos</strong> · {formatPercent(share(recoverable, data.master_count))}<br /><span className="text-ink-muted">Pidieron antes; recuperables</span></span></li>
              <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-line-strong" /><span><strong>{formatInt(neverOrdered)} sin pedidos</strong> · {formatPercent(share(neverOrdered, data.master_count))}<br /><span className="text-ink-muted">Sin pedidos en estos archivos</span></span></li>
            </ul>
          </>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">En riesgo: llamar esta semana</h2><OriginBadge origin="estimated" /></div>
          <p className="mb-4 text-[13px] text-ink-muted">Compran menos seguido de lo habitual, ordenados por pedido promedio</p>
          <Status loading={atRisk.loading && !atRisk.data} error={atRisk.error} reload={atRisk.reload} />
          {atRisk.data && (atRisk.data.items.length ? <Table><THead><TR><TH>Cliente</TH><TH numeric>Días sin pedir</TH><TH numeric>Suele pedir cada</TH><TH numeric>Pedido promedio</TH></TR></THead>
            <TBody>{atRisk.data.items.map((c) => <TR key={c.ruc}>
              <TD><Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink hover:text-brand">{c.name}</Link></TD>
              <TD numeric>{formatInt(c.days_since_last_order)}</TD><TD numeric>{c.purchase_rhythm_days != null ? `${formatNumber(c.purchase_rhythm_days)} días` : "—"}</TD>
              <TD numeric>{formatPen(c.money_at_stake)}</TD></TR>)}</TBody></Table>
            : <p className="text-sm text-ink-muted">Ningún cliente está atrasado respecto de su ritmo.</p>)}
          {atRisk.data && <p className="mt-3 text-xs text-ink-muted">{warningText[atRisk.data.warning]} La probabilidad de recompra de cada cliente llegará con el modelo de predicción.</p>}
        </Card>
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Dormidos con más historia</h2><OriginBadge origin="real" /></div>
          <p className="mb-4 text-[13px] text-ink-muted">Sin pedidos en 12 meses, ordenados por monto histórico · <Link href="/clientes" className="font-semibold text-brand">Ver todos en Clientes</Link></p>
          <Status loading={dormant.loading && !dormant.data} error={dormant.error} reload={dormant.reload} />
          {dormant.data && <Table><THead><TR><TH>Cliente</TH><TH numeric>Pedidos</TH><TH numeric>Monto histórico</TH><TH numeric>Última compra</TH></TR></THead>
            <TBody>{dormant.data.items.map((c) => <TR key={c.ruc}>
              <TD><Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink hover:text-brand">{c.name}</Link></TD>
              <TD numeric>{formatInt(c.order_count)}</TD><TD numeric>{formatPen(c.lifetime_amount)}</TD><TD numeric className="whitespace-nowrap">{formatDate(c.last_order_date)}</TD></TR>)}</TBody></Table>}
        </Card>
      </div>

      <TopCustomers items={data.top_customers} />
      <Pending kind="model" title="Probabilidad de que vuelvan a comprar">
        Para cada cliente en riesgo o dormido, la probabilidad de que haga un pedido en los próximos 30 días. Sirve para decidir a quién llamar primero cuando dos clientes tienen el mismo monto en juego.
      </Pending>
    </>}
  </div>;
}
