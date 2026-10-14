"use client";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api/client";
import { formatInt, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { compare, PendingTile, PeriodText, StatTile, Status, Warnings, warningText, yearBefore } from "./report-ui";

type Kpi = { code: string; value: number | null; warning?: string | null };

const KPI_INFO: Record<string, { label: string; how: string; format: (v: number | null | undefined) => string; lowerIsBetter?: boolean }> = {
  ordered_amount: { label: "Monto de pedidos", how: "Suma de pedidos sin IGV, solo veterinarios, sin cancelados", format: formatPen },
  order_count: { label: "Pedidos", how: "Pedidos con al menos un producto veterinario", format: formatInt },
  average_order: { label: "Ticket promedio", how: "Monto de pedidos ÷ pedidos", format: formatPen },
  active_customers: { label: "Clientes con pedido", how: "Clientes con al menos un pedido en el período", format: formatInt },
  top_ten_share_pct: { label: "Concentración de los 10 mayores", how: "Parte del monto que hacen los 10 mayores clientes", format: formatPercent, lowerIsBetter: true },
};

const GROUPS: { title: string; question: string; codes: string[] }[] = [
  { title: "Venta", question: "¿Cuánto se pide y cómo cambia?", codes: ["ordered_amount", "order_count", "average_order"] },
  { title: "Clientes", question: "¿Cuántos compran y cuánto dependemos de pocos?", codes: ["active_customers", "top_ten_share_pct"] },
];

export function KpisReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/kpis"), [], "No se pudo cargar los indicadores.");
  const period = query.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/kpis", { params: { query: before } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to], "No se pudo cargar el año anterior.");
  const sellers = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar la venta por vendedor.");

  const data = query.data;
  const byCode = new Map<string, Kpi>((data?.items ?? []).map((k) => [k.code, k]));
  const prevByCode = new Map<string, Kpi>((previous.data?.items ?? []).map((k) => [k.code, k]));
  const leader = sellers.data?.items[0];

  const tile = (code: string) => {
    const info = KPI_INFO[code]; const kpi = byCode.get(code);
    if (!info || !kpi) return null;
    const delta = compare(kpi.value, prevByCode.get(code)?.value, "el año anterior");
    const tone = info.lowerIsBetter && delta.tone !== "muted" ? (delta.tone === "good" ? "bad" : "good") : delta.tone;
    return <div key={code} className="flex flex-col gap-1">
      <StatTile label={info.label} value={info.format(kpi.value)} origin="real" tone={tone}
        detail={kpi.warning ? warningText[kpi.warning] : delta.detail ?? "Sin dato del año anterior"} />
      <p className="px-1 text-xs text-ink-muted">{info.how} · meta sin definir</p>
    </div>;
  };

  return <div className="space-y-5">
    <PageHeader title="Indicadores clave (KPIs)" subtitle="Lo que se puede medir hoy con los archivos de Mederi, frente al año anterior" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {data && <>
      <PeriodText from={data.period.from_date} to={data.period.to_date} asOf={data.period.data_as_of} />
      <Card className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <p className="text-sm text-ink-muted">
          {formatInt(data.items.length + (leader ? 1 : 0))} indicadores con datos reales y 4 que empiezan a medirse con VetChain.
          Gerencia aún no definió metas: por eso se compara contra el año anterior en lugar de mostrar si se cumple la meta.
        </p>
      </Card>
      <Warnings codes={data.warnings.filter((code) => code !== "targets_unconfigured" && code !== "alerts_unavailable")} />

      {GROUPS.map((group) => <section key={group.title} className="space-y-3">
        <div><h2 className="text-lg font-semibold">{group.title}</h2><p className="text-[13px] text-ink-muted">{group.question}</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {group.codes.map(tile)}
          {group.title === "Clientes" && leader && <div className="flex flex-col gap-1">
            <StatTile label="Monto de un solo vendedor" value={formatPercent(leader.share_pct)} origin="real" tone={(leader.share_pct ?? 0) > 40 ? "bad" : "muted"}
              detail="Parte del monto que hace la cartera del vendedor principal" />
            <p className="px-1 text-xs text-ink-muted">Cartera según la ficha del cliente (provisional) · meta sin definir</p>
          </div>}
        </div>
      </section>)}

      <section className="space-y-3">
        <div><h2 className="text-lg font-semibold">Nuevos con VetChain</h2><p className="text-[13px] text-ink-muted">Indicadores que se empiezan a medir al usar la plataforma</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PendingTile label="Margen" kind="data" reason="Faltan los costos de compra" />
          <PendingTile label="Alertas atendidas en 48 horas" kind="data" reason="Faltan las alertas diarias guardadas" />
          <PendingTile label="Cotizaciones que terminan en pedido" kind="data" reason="Falta enlazar cotizaciones con pedidos" />
          <PendingTile label="Clientes dormidos reactivados" kind="data" reason="Se mide desde el inicio del piloto" />
        </div>
      </section>
    </>}
  </div>;
}
