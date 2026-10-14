"use client";

import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatInt, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { FollowUpBySalesperson } from "./report-pages";
import { Pending, PendingTile, PeriodText, SectionTitle, ShareBars, StatTile, Status, Warnings } from "./report-ui";

/** Nombres del ERP en mayúsculas: «MIGUEL ANGEL GARCIA MEDINA» → «Miguel Angel Garcia Medina». */
const titleCase = (name: string) => name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export function SalespeopleReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar el reporte de vendedores.");
  const followUp = useQuery(() => api.GET("/api/v1/customers/at-risk/follow-up"), [], "No se pudo cargar el seguimiento por vendedor.");
  const data = query.data;
  const leader = data?.items[0];
  const contacted = followUp.data?.items.reduce((sum, f) => sum + f.buckets.filter((b) => b.outcome != null).reduce((s, b) => s + b.customer_count, 0), 0) ?? null;
  const atRiskTotal = followUp.data?.items.reduce((sum, f) => sum + f.customer_count, 0) ?? null;

  return <div className="space-y-5">
    <PageHeader title="Vendedores y seguimiento" subtitle="Cuánto pide la cartera de cada vendedor y qué pasa con sus clientes en riesgo" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {data && <>
      <PeriodText from={data.period.from_date} to={data.period.to_date} asOf={data.period.data_as_of} />

      <Pending kind="ai" title="Lo que dicen los datos">
        Aquí irá un resumen en tres frases: cuánto depende la empresa de un solo vendedor, qué carteras crecen o caen y qué seguimiento falta.
      </Pending>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Monto de un solo vendedor" value={formatPercent(leader?.share_pct)} origin="real" tone={leader && (leader.share_pct ?? 0) > 40 ? "bad" : "muted"}
          detail={leader ? `${titleCase(leader.name)} · ${formatInt(leader.customer_count)} clientes` : undefined} />
        <StatTile label="Clientes en riesgo contactados" value={contacted != null && atRiskTotal ? formatPercent((contacted / atRiskTotal) * 100) : "—"} origin="estimated"
          detail={contacted != null && atRiskTotal != null ? `${formatInt(contacted)} de ${formatInt(atRiskTotal)} desde su último pedido` : undefined} />
        <PendingTile label="Cotizaciones que terminan en pedido" kind="data" reason="Falta enlazar cotizaciones con pedidos" />
        <PendingTile label="Monto recuperado con alertas" kind="data" reason="Falta enlazar cotizaciones con pedidos" />
      </div>
      <Warnings codes={data.items.length ? ["portfolio_provisional"] : ["no_order_data"]} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2"><SectionTitle>Monto de 12 meses por vendedor</SectionTitle><OriginBadge origin="real" /></div>
          <p className="-mt-3 mb-4 text-[13px] text-ink-muted">Sin IGV · cartera según la ficha del cliente en Defontana</p>
          <ShareBars valueLabel={formatPen}
            items={data.items.map((item) => ({ key: item.code, label: titleCase(item.name), value: item.amount, share: item.share_pct }))} />
        </Card>
        <Card>
          <SectionTitle>Detalle por vendedor</SectionTitle>
          <Table><THead><TR><TH>Vendedor</TH><TH numeric>Pedidos</TH><TH numeric>Clientes</TH><TH numeric>Ticket promedio</TH></TR></THead>
            <TBody>{data.items.map((item) => <TR key={item.code}>
              <TD>{titleCase(item.name)}<span className="block text-xs text-ink-muted">Código {item.code}</span></TD>
              <TD numeric>{formatInt(item.order_count)}</TD><TD numeric>{formatInt(item.customer_count)}</TD>
              <TD numeric>{formatPen(item.order_count ? item.amount / item.order_count : null)}</TD></TR>)}</TBody></Table>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <FollowUpBySalesperson query={followUp} />
        <Pending kind="data" title="De la alerta al pedido">
          El embudo completo del equipo: clientes en riesgo → contactados → cotizaciones → pedidos → monto recuperado.
          Los contactos ya se registran; faltan las alertas diarias guardadas y saber qué pedido salió de cada cotización.
        </Pending>
      </div>

      <Pending kind="feature" title="Vendedor de respaldo para los clientes A">
        Los clientes de nivel A concentran la mayor parte del monto. La propuesta es que cada uno tenga un segundo vendedor que reciba sus alertas
        si el principal no responde en 48 horas. Requiere definir con Mederi las carteras oficiales.
      </Pending>
    </>}
  </div>;
}
