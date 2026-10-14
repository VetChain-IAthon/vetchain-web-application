"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";
import { Pending, PendingTile, PeriodText, SectionTitle, Status, Warnings } from "./report-ui";

const NEEDED = [
  ["Relación entre cobros y pedidos", "Los cobros traen el número de comprobante y los pedidos otro número. Sin una tabla que los una no se sabe qué pedido pagó cada cobro."],
  ["Facturas emitidas y su vencimiento", "Para saber cuánto se debe y desde cuándo hace falta la fecha de vencimiento de cada factura."],
  ["Notas de crédito", "Para descontar devoluciones y no contarlas como deuda."],
] as const;

export function ReceivablesReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/receivables"), [], "No se pudo cargar el reporte de cobranza.");
  const data = query.data;
  return <div className="space-y-5">
    <PageHeader title="Cartera y cobranza" subtitle="Quién nos debe y a quién darle crédito" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {data && <>
      <PeriodText from={data.period.from_date} to={data.period.to_date} asOf={data.period.data_as_of} />
      <Warnings codes={data.warnings} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PendingTile label="Por cobrar" kind="data" reason="Falta enlazar cobros con pedidos" />
        <PendingTile label="Deuda vencida" kind="data" reason="Falta el vencimiento de cada factura" />
        <PendingTile label="Días promedio de cobro" kind="data" reason="Falta enlazar cobros con pedidos" />
        <PendingTile label="Facturas pagadas a tiempo" kind="data" reason="Falta el vencimiento de cada factura" />
      </div>

      <Card>
        <SectionTitle>Qué falta para calcular la cobranza</SectionTitle>
        <p className="-mt-2 mb-4 text-sm text-ink-muted">Los 14 082 cobros de Defontana ya están cargados. Para convertirlos en deuda por cliente faltan estos datos de Mederi:</p>
        <ol className="flex flex-col gap-3">
          {NEEDED.map(([title, text], i) => <li key={title} className="flex gap-3">
            <span className="flex size-7 flex-none items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{i + 1}</span>
            <div><strong className="text-sm">{title}</strong><p className="text-sm text-ink-muted">{text}</p></div>
          </li>)}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Pending kind="data" title="Deuda vencida por antigüedad y por cliente">
          Cuánto se debe con 1–30, 31–60, 61–90 y más de 90 días de atraso, y los clientes con más deuda vencida.
        </Pending>
        <Pending kind="ai" title="Crédito según cómo paga">
          Una propuesta de días de crédito para cada cliente según su historial de pago, y qué hacer con los que más deben.
          Necesita primero los datos de deuda y luego la IA para redactar las recomendaciones.
        </Pending>
      </div>
    </>}
  </div>;
}
