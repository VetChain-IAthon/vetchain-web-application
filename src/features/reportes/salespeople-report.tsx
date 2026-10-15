"use client";

import { jsPDF } from "jspdf";
import { ArrowLeft, Database, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatInt, formatPen, formatPercent } from "@/lib/format";
import { useSimulated } from "@/lib/demo";
import { useQuery } from "@/lib/use-query";
import { PendingTile, StatTile, Status } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/Vendedores-45z4.dc.html. Real: venta de 12 meses por vendedor (cartera según la ficha
 *  del cliente, provisional). El embudo de alertas y el seguimiento esperan el registro de resultados. */

const FUNNEL = ["Alertas generadas", "Clientes contactados", "Cotizaciones enviadas", "Pedidos"];
/** Fila de seguimiento simulada: alertas, contactados, cotizaciones, pedidos y venta recuperada. */
function followUp(row: number[] | undefined): string[] {
  if (!row) return Array(6).fill("—");
  const [alerts, contacted, quotes, orders, recovered] = row;
  return [formatInt(alerts), formatInt(contacted), formatInt(quotes), formatInt(orders), `${alerts ? Math.round((orders / alerts) * 100) : 0} %`, formatPen(recovered)];
}
const titleCase = (text: string) => text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export function SalespeopleReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/salespeople"), [], "No se pudo cargar la venta por vendedor.");
  const levelA = useQuery(() => api.GET("/api/v1/customers", { params: { query: { level: "A", per_page: 1 } } }), [], "");
  const all = useQuery(() => api.GET("/api/v1/customers", { params: { query: { per_page: 1 } } }), [], "");
  const [channel, setChannel] = useState<ShareChannel | null>(null);
  const sim = useSimulated()?.salespeople;
  const demo = !!sim;
  const funnel = sim?.funnel ?? [];
  const chip = demo ? <OriginBadge origin="simulated" className="flex-none" /> : <PendingChip />;

  const data = query.data;
  const sellers = data?.items ?? [];
  const leader = sellers[0];
  const aCount = levelA.data?.total ?? null;
  const aShare = levelA.data && all.data?.total_amount_12m ? (levelA.data.total_amount_12m / all.data.total_amount_12m) * 100 : null;

  const insights = data ? [
    leader ? `${titleCase(leader.name)} tiene pedidos por ${formatPen(leader.amount)} de ${formatInt(leader.customer_count)} clientes: el ${formatPercent(leader.share_pct)} de la venta. Si se ausenta, la empresa pierde su principal canal de venta.` : "",
    aCount ? `Propuesta: asignar un vendedor de respaldo a cada uno de los ${formatInt(aCount)} clientes de nivel A.` : "Propuesta: asignar un vendedor de respaldo a los clientes que más compran.",
    "Con VetChain se medirá el embudo completo: de cada alerta, cuántas terminan en pedido y cuántos soles se recuperan.",
  ].filter(Boolean) : [];
  const subject = "Vendedores y seguimiento";

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Vendedores y seguimiento"
      badge={<span className="rounded-xs bg-warn-bg px-2 py-0.5 text-[13px] font-semibold text-warn-fg">Parcial</span>}
      subtitle="Cuánto vende cada uno y qué pasa con cada alerta · la venta por vendedor es real; el embudo y el seguimiento esperan el registro de alertas"
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!data} onClick={() => downloadSellersPdf(subject, insights, sellers)}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subject} text={insights.map((l) => `• ${l}`).join("\n")} onClose={() => setChannel(null)} />}

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <Card className="flex flex-col gap-4 p-8">
        <ReportGeminiSummary title="Lo que dicen los datos" report="salespeople" metrics={{ salespeople: sellers.length, leader_share_pct: leader?.share_pct, leader_customers: leader?.customer_count, level_a_customers: aCount }} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Venta de un solo vendedor" value={formatPercent(leader?.share_pct)} origin="real"
          tone={(leader?.share_pct ?? 0) > 40 ? "bad" : "muted"} detail="Meta 40 % (propuesta)" />
        <PendingTile label="Alertas atendidas en 48 horas" kind="data" reason="Falta registrar el seguimiento de alertas" />
        <PendingTile label="Cotizaciones que terminan en pedido" kind="data" reason="Falta enlazar cotizaciones con pedidos" />
        <PendingTile label="Venta recuperada con alertas" kind="data" reason="Falta vincular alertas y pedidos" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-4 p-8">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">De la alerta al pedido</h2><p className="text-sm text-ink-muted">Todo el equipo</p></div>
            {chip}
          </div>
          <ul className="flex flex-col gap-4" aria-hidden>
            {FUNNEL.map((label, i) => <li key={label}>
              <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{label}</span><span className={demo ? "font-semibold tabular-nums" : "font-semibold text-ink-muted"}>{demo ? formatInt(funnel[i] ?? 0) : "—"}</span></div>
              <div className={demo ? "h-6 rounded bg-brand" : "h-6 rounded border-2 border-dashed border-line-strong bg-canvas"} style={{ width: `${demo ? ((funnel[i] ?? 0) / (funnel[0] || 1)) * 100 : 100 - i * 20}%` }} />
            </li>)}
          </ul>
          <div className="flex items-center justify-between rounded bg-canvas px-5 py-4"><span className="font-semibold text-ink-muted">Venta recuperada</span><span className={demo ? "text-lg font-semibold" : "text-lg font-semibold text-ink-muted"}>{demo ? formatPen(sim.recovered) : "—"}</span></div>
          {!demo && <PendingNote>Pendiente: se medirá cuando existan alertas registradas y el equipo registre sus resultados.</PendingNote>}
        </Card>

        <Card className="flex flex-col gap-4 p-8">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Venta de 12 meses por vendedor</h2><p className="text-sm text-ink-muted">Sin IGV · cartera según la ficha del cliente (provisional)</p></div>
            <OriginBadge origin="real" className="flex-none" />
          </div>
          <ul className="flex flex-col gap-4">{sellers.map((s, i) => <li key={s.code}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{titleCase(s.name)}</span>
              <span className="flex-none tabular-nums">{formatPen(s.amount)} · {formatPercent(s.share_pct)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
              <div className={i === 0 ? "h-full rounded-full bg-brand" : "h-full rounded-full bg-line-strong"} style={{ width: `${leader ? (s.amount / leader.amount) * 100 : 0}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">{formatInt(s.customer_count)} clientes · {formatInt(s.order_count)} pedidos</p>
          </li>)}</ul>
          <p className="text-[13px] text-ink-muted">Total: {formatPen(data.amount)} en 12 meses. El vendedor principal se resalta en rojo.</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Seguimiento por vendedor</h2><p className="text-sm text-ink-muted">Saldrá de «Registrar resultado» en la pantalla Hoy de cada vendedor</p></div>
          {chip}
        </div>
        <Table>
          <THead><TR><TH>Vendedor</TH><TH numeric>Alertas</TH><TH numeric>Contactados en 48 h</TH><TH numeric>Cotizaciones</TH><TH numeric>Pedidos</TH><TH numeric>Conversión</TH><TH numeric>Venta recuperada</TH></TR></THead>
          <TBody>{sellers.map((s, row) => <TR key={s.code}>
            <TD className="font-semibold">{titleCase(s.name)}</TD>
            {sim ? followUp(sim.follow_up[row]).map((value, i) => <TD key={i} numeric>{value}</TD>)
              : Array.from({ length: 6 }, (_, i) => <TD key={i} numeric className="text-ink-muted">—</TD>)}
          </TR>)}</TBody>
        </Table>
        {!demo && <PendingNote>Pendiente: las columnas se llenarán con las alertas y los resultados que registre cada vendedor.</PendingNote>}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-6 p-8">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-lg font-semibold">Vendedor de respaldo para los clientes A</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{aCount
            ? `Los ${formatInt(aCount)} clientes de nivel A hacen el ${formatPercent(aShare)} de la venta. Cada uno debería tener un segundo vendedor que lo conozca y reciba sus alertas si el principal no responde en 48 horas.`
            : "Cada cliente de nivel A debería tener un segundo vendedor que lo conozca y reciba sus alertas si el principal no responde en 48 horas. Los niveles se definen en Ajustes."}</p>
        </div>
        <Button disabled title="Pendiente: la asignación de respaldos aún no está disponible">Asignar respaldos</Button>
      </Card>
    </>}
  </div>;
}

function PendingChip() {
  return <span className="flex-none rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg">Pendiente</span>;
}

function PendingNote({ children }: { children: React.ReactNode }) {
  return <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><Database size={14} aria-hidden />{children}</p>;
}

type Seller = { name: string; amount: number; share_pct: number | null; customer_count: number };

function downloadSellersPdf(title: string, insights: string[], sellers: Seller[]) {
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
  y += 2; line("Venta de 12 meses por vendedor", 12, true);
  sellers.forEach((s) => line(`${titleCase(s.name)}: ${formatPen(s.amount)} · ${formatPercent(s.share_pct)} · ${formatInt(s.customer_count)} clientes`, 9));
  y += 3; line("Embudo de alertas y seguimiento: pendientes del registro de resultados. Cartera según la ficha del cliente (provisional).", 8, false, [95, 99, 104]);
  doc.save(`vetchain-vendedores-${new Date().toISOString().slice(0, 10)}.pdf`);
}
