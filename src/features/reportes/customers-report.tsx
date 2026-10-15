"use client";

import { jsPDF } from "jspdf";
import { ArrowLeft, ArrowRight, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatMonthYear, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { compare, StatTile, Status, warningText, yearBefore } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/Clientes-9xcu.dc.html. Montos de pedidos sin IGV, solo veterinarios, sin cancelados.
 *  «Qué hacer» y la prioridad de los dormidos esperan a Gemini y al modelo de predicción: no se inventan. */

const LEVELS = ["A", "B", "C"] as const;
// Niveles ordenados de mayor a menor volumen: una sola tinta, de oscuro a claro (brand.hover, brand, rojo claro).
const LEVEL_COLORS = { A: "#8E1119", B: "#D01F29", C: "#E8959A" } as const;
const share = (part: number, total: number) => (total ? (part / total) * 100 : 0);
const titleCase = (text: string) => text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export function CustomersReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/customers"), [], "No se pudo cargar el reporte de clientes.");
  const period = query.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const previous = useQuery(() => before ? api.GET("/api/v1/reports/customers", { params: { query: before } }) : Promise.resolve({ data: null }),
    [before?.from, before?.to], "No se pudo cargar el año anterior.");
  const sales = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar los pedidos.");
  const atRisk = useQuery(() => api.GET("/api/v1/customers/at-risk", { params: { query: { per_page: 100 } } }), [], "No se pudo cargar los clientes en riesgo.");
  const dormant = useQuery(() => api.GET("/api/v1/customers/dormant", { params: { query: { per_page: 6 } } }), [], "No se pudo cargar los clientes dormidos.");
  // Un pedido por nivel: el total de clientes y su monto de 12 meses salen de la misma lista de Clientes filtrada.
  const levels = useQuery(async () => {
    const results = await Promise.all(LEVELS.map((level) => api.GET("/api/v1/customers", { params: { query: { level, per_page: 1 } } })));
    const failed = results.find((r) => r.error);
    if (failed) return { error: failed.error };
    return { data: LEVELS.map((level, i) => ({ level, customers: results[i].data!.total, amount: results[i].data!.total_amount_12m })) };
  }, [], "Los niveles aparecerán cuando gerencia defina los umbrales en Ajustes.");
  const [channel, setChannel] = useState<ShareChannel | null>(null);

  const data = query.data;
  const active = data?.active_count ?? 0;
  const prevActive = previous.data?.active_count ?? null;
  const activeDelta = compare(data?.active_count, prevActive, "el año anterior");
  const activeDiff = data?.active_count != null && prevActive != null ? data.active_count - prevActive : null;
  const recoverable = dormant.data?.ordered_before_count ?? null;
  const neverOrdered = dormant.data ? dormant.data.dormant_count - dormant.data.ordered_before_count : null;
  const riskItems = atRisk.data?.items ?? [];
  const riskAmount = riskItems.reduce((s, c) => s + c.amount_12m, 0);

  // Los clientes sin pedidos en 12 meses tienen monto 0 y caen en C: se descuentan para comparar solo clientes activos.
  const levelRows = levels.data && data ? levels.data.map((l) => l.level === "C" ? { ...l, customers: Math.max(0, l.customers - (data.no_orders_12m ?? 0)) } : l) : null;
  const levelCustomers = levelRows?.reduce((s, l) => s + l.customers, 0) ?? 0;
  const levelAmount = levelRows?.reduce((s, l) => s + l.amount, 0) ?? 0;
  const levelA = levelRows?.find((l) => l.level === "A" && l.customers > 0);

  const insights = data ? [
    prevActive != null && activeDiff != null
      ? `${activeDiff < 0 ? "Menos" : "Más"} clientes que el año anterior: ${formatInt(active)} activos frente a ${formatInt(prevActive)}${sales.data?.amount != null ? `, con pedidos por ${formatPen(sales.data.amount)}` : ""}.`
      : `${formatInt(active)} clientes con pedidos en el período.`,
    levelA && levelCustomers ? `${formatInt(levelA.customers)} clientes de nivel A, el ${formatPercent(share(levelA.customers, levelCustomers))} de los activos, hacen el ${formatPercent(share(levelA.amount, levelAmount))} de la venta.`
      : `Los 10 mayores clientes hacen el ${formatPercent(data.top_ten_share_pct)} de la venta.`,
    atRisk.data ? `${formatInt(atRisk.data.total)} clientes que ya pasaron su ritmo de compra suman ${formatPen(riskAmount)} de venta en 12 meses.${recoverable != null ? ` Y ${formatInt(recoverable)} clientes que compraban llevan más de 12 meses sin hacerlo.` : ""}` : "",
  ].filter(Boolean) : [];
  const subject = `Clientes: retención y reactivación · datos hasta ${formatDate(period?.data_as_of)}`;

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Clientes: retención y reactivación" origin="real"
      subtitle={`Quién compra, quién se está yendo y a quién recuperar · datos hasta ${period?.data_as_of ? formatMonthYear(period.data_as_of) : "—"} · montos sin IGV`}
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!data} onClick={() => data && downloadCustomersPdf(subject, insights, riskItems, dormant.data?.items ?? [])}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subject} text={insights.map((l) => `• ${l}`).join("\n")} onClose={() => setChannel(null)} />}

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <Card className="flex flex-col gap-4 p-8">
        <ReportGeminiSummary title="Lo que dicen los datos" report="customers" metrics={{ active: data.active_count, previous_active: prevActive, top_ten_share_pct: data.top_ten_share_pct, at_risk: atRisk.data?.total, recoverable }} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Clientes activos" value={formatInt(data.active_count)} tone={activeDelta.tone}
          detail={activeDiff != null ? `${formatInt(Math.abs(activeDiff))} ${activeDiff < 0 ? "menos" : "más"} · ${activeDelta.detail?.split(" frente")[0] ?? ""}` : undefined} />
        <StatTile label="Venta por cliente activo" value={formatPen(active ? (data.amount ?? 0) / active : null)}
          detail={sales.data?.order_count && active ? `${formatNumber(sales.data.order_count / active)} pedidos al año en promedio` : undefined} />
        <StatTile label="En riesgo ahora" value={atRisk.data ? `${formatInt(atRisk.data.total)} clientes` : "—"} tone="warn"
          detail={atRisk.data ? `${formatPen(riskAmount)} de venta en 12 meses` : undefined} />
        <StatTile label="Dormidos recuperables" value={formatInt(recoverable)}
          detail={dormant.data ? `De ${formatInt(dormant.data.dormant_count)} sin compras en 12 meses` : undefined} />
      </div>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">{levelA && levelCustomers
            ? `${formatPercent(share(levelA.customers, levelCustomers), 0)} de los clientes hace el ${formatPercent(share(levelA.amount, levelAmount), 0)} de la venta`
            : `Los 10 mayores clientes hacen el ${formatPercent(data.top_ten_share_pct, 0)} de la venta`}</h2>
            <p className="text-sm text-ink-muted">Clientes activos por nivel de volumen frente a su peso en la venta</p></div>
          <OriginBadge origin="real" className="flex-none" />
        </div>
        {levels.error ? <Notice tone="warn">Los niveles A, B y C aparecerán cuando gerencia defina los umbrales de volumen. <Link href="/ajustes" className="font-semibold">Definir en Ajustes</Link></Notice>
          : !levelRows ? <p className="text-sm text-ink-muted">Cargando niveles…</p>
          : <div className="grid gap-8 lg:grid-cols-2">
            <LevelDonut title="Clientes" center={formatInt(levelCustomers)} centerLabel="clientes"
              rows={levelRows.map((l) => ({ level: l.level, value: l.customers, text: `${formatInt(l.customers)} · ${formatPercent(share(l.customers, levelCustomers))}` }))} format={formatInt} />
            <LevelDonut title="Venta" center={`S/ ${formatNumber(levelAmount / 1_000_000, 2)} M`} centerLabel="venta"
              rows={levelRows.map((l) => ({ level: l.level, value: l.amount, text: formatPercent(share(l.amount, levelAmount)) }))} format={formatPen} />
          </div>}
        <p className="text-[13px] text-ink-muted">Niveles con los umbrales de Ajustes, por monto de pedidos de 12 meses. Solo cuenta clientes con pedidos en el período.</p>
      </Card>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">El maestro de {formatInt(data.master_count)} clientes</h2>
            <p className="text-sm text-ink-muted">Solo {formatPercent(share(active, data.master_count), 0)} compró en los últimos 12 meses</p></div>
          <OriginBadge origin="real" className="flex-none" />
        </div>
        {dormant.data && neverOrdered != null && recoverable != null && <>
          <div role="img" aria-label={`Activos ${active}, dormidos que compraron antes ${recoverable}, sin compras registradas ${neverOrdered}`} className="flex h-8 gap-0.5 overflow-hidden rounded">
            <div className="bg-brand" style={{ flex: active }} /><div className="bg-dormant" style={{ flex: recoverable }} /><div className="bg-line-strong" style={{ flex: neverOrdered }} />
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-brand" /><span><strong>{formatInt(active)} activos</strong> · {formatPercent(share(active, data.master_count))}<br /><span className="text-ink-muted">Compraron en los últimos 12 meses</span></span></li>
            <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-dormant" /><span><strong>{formatInt(recoverable)} dormidos</strong> · {formatPercent(share(recoverable, data.master_count))}<br /><span className="text-ink-muted">Compraron antes; son recuperables</span></span></li>
            <li className="flex gap-2"><span className="mt-1 size-3 flex-none rounded-xs bg-line-strong" /><span><strong>{formatInt(neverOrdered)} sin compras</strong> · {formatPercent(share(neverOrdered, data.master_count))}<br /><span className="text-ink-muted">Sin pedidos en estos archivos</span></span></li>
          </ul>
        </>}
      </Card>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">En riesgo ahora</h2><p className="text-sm text-ink-muted">Pasaron su ritmo habitual de compra · ordenados por soles en juego</p></div>
          <OriginBadge origin="estimated" className="flex-none" />
        </div>
        <Status loading={atRisk.loading && !atRisk.data} error={atRisk.error} reload={atRisk.reload} />
        {atRisk.data && (riskItems.length ? <Table>
          <THead><TR><TH>Cliente</TH><TH numeric>Venta 12 meses</TH><TH numeric>Pedido promedio</TH><TH>Ritmo</TH><TH numeric>Atraso</TH><TH>Qué hacer</TH></TR></THead>
          <TBody>{riskItems.slice(0, 10).map((c) => {
            const late = c.purchase_rhythm_days != null ? Math.max(0, c.days_since_last_order - c.purchase_rhythm_days) : null;
            return <TR key={c.ruc}>
              <TD><Link href={`/reportes/ficha?ruc=${c.ruc}`} className="font-semibold text-ink hover:text-brand">{c.name}</Link></TD>
              <TD numeric>{formatPen(c.amount_12m)}</TD>
              <TD numeric className="font-semibold">{formatPen(c.money_at_stake)}</TD>
              <TD className="text-ink-muted">{c.purchase_rhythm_days != null ? `Cada ${formatNumber(c.purchase_rhythm_days)} días` : `≈ Cada ${formatInt(atRisk.data!.default_rhythm_days)} días`}</TD>
              <TD numeric className="font-semibold text-brand-strong">{late != null ? `${formatNumber(late)} días` : `${formatInt(c.days_since_last_order)} días sin pedir`}</TD>
              <TD className="text-[13px] text-ink-muted">Pendiente</TD>
            </TR>;
          })}</TBody>
        </Table> : <p className="text-sm text-ink-muted">Ningún cliente está atrasado respecto de su ritmo.</p>)}
        {riskItems[0] && <Link href={`/reportes/ficha?ruc=${riskItems[0].ruc}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline">
          Abrir la ficha de {riskItems[0].name} <ArrowRight size={16} aria-hidden /></Link>}
        {atRisk.data && <p className="text-[13px] text-ink-muted">{warningText[atRisk.data.warning]} Las acciones individuales requieren una validación adicional.{riskItems.length > 10 && ` Se muestran 10 de ${formatInt(riskItems.length)}.`}</p>}
      </Card>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Dormidos para reactivar</h2><p className="text-sm text-ink-muted">Sin pedidos en 12 meses, ordenados por venta histórica</p></div>
          <OriginBadge origin="real" className="flex-none" />
        </div>
        <Status loading={dormant.loading && !dormant.data} error={dormant.error} reload={dormant.reload} />
        {dormant.data && <Table>
          <THead><TR><TH>Cliente</TH><TH>Tipo</TH><TH numeric>Venta histórica</TH><TH numeric>Pedidos</TH><TH numeric>Última compra</TH><TH>Prioridad</TH></TR></THead>
          <TBody>{dormant.data.items.map((c) => <TR key={c.ruc}>
            <TD><Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink hover:text-brand">{c.name}</Link></TD>
            <TD className="text-ink-muted">{c.customer_type === "company" ? "Empresa" : c.customer_type === "person" ? "Persona" : "—"}</TD>
            <TD numeric>{formatPen(c.lifetime_amount)}</TD>
            <TD numeric>{formatInt(c.order_count)}</TD>
            <TD numeric className="whitespace-nowrap">{formatDate(c.last_order_date)}</TD>
            <TD className="text-[13px] text-ink-muted">Pendiente del modelo</TD>
          </TR>)}</TBody>
        </Table>}
        {dormant.data && <p className="text-[13px] text-ink-muted">Estos {formatInt(dormant.data.items.length)} suman {formatPen(dormant.data.items.reduce((s, c) => s + c.lifetime_amount, 0))} de venta histórica.
          La prioridad (cuánto compraban, qué tan seguido y hace cuánto se fueron) llegará con el modelo de predicción.
          La lista completa de los {formatInt(recoverable)} recuperables está en <Link href="/clientes" className="font-semibold text-brand">Clientes</Link>.</p>}
      </Card>
    </>}
  </div>;
}

function LevelDonut({ title, center, centerLabel, rows, format }: {
  title: string; center: string; centerLabel: string; rows: { level: "A" | "B" | "C"; value: number; text: string }[]; format: (v: number) => string;
}) {
  return <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
    <div className="relative h-48 w-48 flex-none" role="img" aria-label={`${title} por nivel: ${rows.map((r) => `nivel ${r.level} ${r.text}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="level" innerRadius="62%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.level} fill={LEVEL_COLORS[r.level]} />)}
          </Pie>
          <Tooltip formatter={(v, name) => [format(Number(v)), `Nivel ${name}`]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{center}</span><span className="text-xs text-ink-muted">{centerLabel}</span>
      </div>
    </div>
    <div className="min-w-[200px]">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="flex flex-col gap-2 text-sm">{rows.map((r) => <li key={r.level} className="flex items-center gap-3">
        <span className="size-3 flex-none rounded-xs" style={{ backgroundColor: LEVEL_COLORS[r.level] }} aria-hidden />
        <span className="flex-1">Nivel {r.level}</span><span className="font-semibold tabular-nums">{r.text}</span></li>)}</ul>
    </div>
  </div>;
}

type AtRisk = { name: string; amount_12m: number; money_at_stake: number; days_since_last_order: number; purchase_rhythm_days: number | null };
type Dormant = { name: string; lifetime_amount: number; order_count: number; last_order_date: string | null };

function downloadCustomersPdf(title: string, insights: string[], atRisk: AtRisk[], dormant: Dormant[]) {
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
  y += 2; line("En riesgo ahora", 12, true);
  atRisk.slice(0, 15).forEach((c) => line(`${c.name}: ${formatPen(c.amount_12m)} en 12 meses · pedido promedio ${formatPen(c.money_at_stake)} · ${formatInt(c.days_since_last_order)} días sin pedir${c.purchase_rhythm_days != null ? ` (ritmo ${formatNumber(c.purchase_rhythm_days)} días)` : ""}`, 9));
  y += 2; line("Dormidos para reactivar", 12, true);
  dormant.forEach((c) => line(`${titleCase(c.name)}: ${formatPen(c.lifetime_amount)} históricos · ${formatInt(c.order_count)} pedidos · última compra ${formatDate(c.last_order_date)}`, 9));
  y += 3; line("Montos de pedidos sin IGV, solo veterinarios. Factores de riesgo provisionales hasta que gerencia los confirme.", 8, false, [95, 99, 104]);
  doc.save(`vetchain-clientes-${new Date().toISOString().slice(0, 10)}.pdf`);
}
