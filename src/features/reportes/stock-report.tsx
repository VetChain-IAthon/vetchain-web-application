"use client";

import { jsPDF } from "jspdf";
import { ArrowLeft, BarChart3, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatNumber, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { Pending, PendingTile, StatTile, Status, Warnings } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/Stock-uwfm.dc.html. Lo real: saldo del kardex (POR CONFIRMAR) frente a la demanda de 12 meses.
 *  Valor al costo, lotes, vencimientos y merma quedan pendientes: los archivos no traen costos, lotes ni bajas. */

type Item = components["schemas"]["StockItemOut"];
type StockStatus = Item["status"];

// Orden fijo validado con el validador de paletas (vecinos distinguibles también con daltonismo); el gris separa rojo y verde.
const STATUS: Record<StockStatus, { label: string; color: string; chip: string }> = {
  normal: { label: "Normal", color: "#2E8B4E", chip: "bg-ok-bg text-ok-fg" },
  overstock: { label: "Sobrestock (más de 120 días)", color: "#E8A33D", chip: "bg-warn-bg text-warn-fg" },
  slow: { label: "Lento (sin pedidos en 90 días)", color: "#2A78D6", chip: "bg-info-bg text-info-fg" },
  out_with_demand: { label: "Sin stock y con demanda", color: "#C8323A", chip: "bg-danger-bg text-danger-fg" },
  out: { label: "Sin stock ni demanda", color: "#B5B5B5", chip: "bg-neutral-bg text-neutral-fg" },
};
const ORDER: StockStatus[] = ["normal", "overstock", "slow", "out_with_demand", "out"];
const titleCase = (text: string) => text.replace(/\s+/g, " ").trim();
/** Más de dos años de cobertura se muestra así: con un saldo por confirmar, una cifra de miles de días no aporta. */
const coverageText = (days: number | null | undefined) => days == null ? "—" : days > 730 ? "más de 2 años" : `${formatInt(days)} días`;

export function StockReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/stock"), [], "No se pudo cargar el reporte de stock.");
  const [channel, setChannel] = useState<ShareChannel | null>(null);

  const data = query.data;
  const items = data?.items ?? [];
  const by = (s: StockStatus) => items.filter((i) => i.status === s);
  const overstock = by("overstock").sort((a, b) => (b.coverage_days ?? 0) - (a.coverage_days ?? 0));
  const outWithDemand = by("out_with_demand").sort((a, b) => b.units_12m - a.units_12m);
  const withDemand = items.filter((i) => i.balance > 0 && i.units_12m > 0);
  // Cobertura del conjunto: stock total ÷ demanda diaria total, solo productos con stock y demanda.
  const coverage = withDemand.length ? withDemand.reduce((s, i) => s + i.balance, 0) / (withDemand.reduce((s, i) => s + i.units_12m, 0) / 365) : null;

  const insights = data ? [
    `${formatInt(items.length)} productos en el kardex al ${formatDate(data.stock_as_of)}: ${formatInt(by("normal").length)} con stock normal, ${formatInt(overstock.length)} con sobrestock y ${formatInt(by("slow").length)} sin pedidos en 90 días.`,
    outWithDemand.length ? `${formatInt(outWithDemand.length)} producto${outWithDemand.length === 1 ? "" : "s"} sin stock que los clientes sí piden: ${outWithDemand.slice(0, 3).map((i) => titleCase(i.product_name ?? i.product_code)).join(", ")}.` : "Ningún producto con demanda está sin stock.",
    overstock[0] ? `${titleCase(overstock[0].product_name ?? overstock[0].product_code)} tiene ${coverageText(overstock[0].coverage_days)} de cobertura: conviene revisar su próxima importación.` : "",
  ].filter(Boolean) : [];
  const subject = `Stock, vencimientos y merma · stock al ${formatDate(data?.stock_as_of)}`;

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Stock, vencimientos y merma" origin="estimated"
      subtitle="Qué se puede perder y qué falta · saldo del kardex por confirmar; valor, lotes y merma pendientes hasta recibir costos y el archivo de lotes"
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!data} onClick={() => data && downloadStockPdf(subject, insights, overstock, outWithDemand)}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subject} text={insights.map((l) => `• ${l}`).join("\n")} onClose={() => setChannel(null)} />}

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded bg-brand-soft text-brand"><BarChart3 size={18} aria-hidden /></span>
          <h2 className="text-lg font-semibold">Lo que dicen los datos</h2>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">{insights.map((line) => <li key={line}>{line}</li>)}</ol>
        <ReportGeminiSummary report="stock" metrics={{ products: items.length, normal: by("normal").length, overstock: overstock.length, slow: by("slow").length, out_with_demand: outWithDemand.length, coverage_days: coverage }} />
      </Card>
      <Warnings codes={data.warnings.filter((w) => w === "stock_balance_unconfirmed")} />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <PendingTile label="Valor del stock" kind="data" reason="Faltan costos de compra" />
        <StatTile label="Cobertura promedio" value={coverage != null ? `${formatInt(Math.round(coverage))} días` : "—"} detail="Al ritmo de pedidos de 12 meses" />
        <PendingTile label="Vence en 90 días" kind="data" reason="Falta el archivo de lotes" />
        <PendingTile label="Merma 12 meses" kind="data" reason="Faltan las bajas por vencimiento o daño" />
        <StatTile label="Sin stock con demanda" value={`${formatInt(outWithDemand.length)} producto${outWithDemand.length === 1 ? "" : "s"}`}
          tone={outWithDemand.length ? "bad" : "muted"} detail="Pedidos que se pueden perder" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Pending kind="data" title="Valor que vence, por plazo">
          Valor al costo que vence en 30, 60, 90, 120 y 180 días. Necesita el archivo de lotes con fecha de vencimiento y los costos de compra; sin ellos no se puede saber qué se va a perder.
        </Pending>
        <StatusDonut items={items} />
      </div>

      <Pending kind="data" title="Lotes por vencer y a quién ofrecerlos">
        Por cada lote que vence pronto: unidades, valor, los clientes que compran ese producto y la acción sugerida (promoción, sumarlo a su pedido habitual) sin bajar del margen mínimo. Necesita el archivo de lotes, los costos y Gemini.
      </Pending>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Sobrestock y quiebres</h2><p className="text-sm text-ink-muted">Saldo del kardex frente a los pedidos de 12 meses</p></div>
          <OriginBadge origin="estimated" className="flex-none" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <IssueList status="overstock" title="Sobrestock" empty="Ningún producto pasa de 120 días de cobertura."
            items={overstock.slice(0, 5).map((i) => ({ key: i.product_code, name: i.product_name ?? i.product_code,
              detail: `${coverageText(i.coverage_days)} de cobertura · ${formatNumber(i.balance, 0)} u en stock · ${formatNumber(i.units_12m, 0)} u pedidas en 12 meses` }))} />
          <IssueList status="out_with_demand" title="Sin stock" empty="Ningún producto con demanda está sin stock."
            items={outWithDemand.slice(0, 5).map((i) => ({ key: i.product_code, name: i.product_name ?? i.product_code,
              detail: `${formatNumber(i.units_12m, 0)} u pedidas en 12 meses · último pedido ${formatDate(i.last_sale_date)}` }))} />
        </div>
        <p className="text-[13px] text-ink-muted">La acción sugerida (frenar la importación, ofrecer por volumen, incluir en el próximo pedido) llegará con la IA y la planificación de importación.</p>
      </Card>

      <p className="text-[13px] leading-relaxed text-ink-muted">Cómo se calcula: stock = último saldo del kardex de cada almacén (campo por confirmar con Mederi). Cobertura = stock ÷ unidades pedidas por día en los 12 meses hasta la fecha del stock.
        Sobrestock y lento usan umbrales provisionales (120 y 90 días). Lotes, vencimientos y merma saldrán del archivo de lotes y bajas.</p>
    </>}
  </div>;
}

function StatusDonut({ items }: { items: Item[] }) {
  const rows = ORDER.map((s) => ({ status: s, value: items.filter((i) => i.status === s).length })).filter((r) => r.value > 0);
  const total = items.length;
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Estado del stock</h2><p className="text-sm text-ink-muted">Por cantidad de productos (sin costos no hay valor)</p></div>
      <OriginBadge origin="estimated" className="flex-none" />
    </div>
    <div className="relative mx-auto h-48 w-48" role="img" aria-label={`Estado del stock: ${rows.map((r) => `${STATUS[r.status].label} ${r.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="status" innerRadius="62%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.status} fill={STATUS[r.status].color} />)}
          </Pie>
          <Tooltip formatter={(v, name) => [`${formatInt(Number(v))} productos`, STATUS[name as StockStatus]?.label ?? String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{formatInt(total)}</span><span className="text-xs text-ink-muted">productos</span>
      </div>
    </div>
    <ul className="flex flex-col gap-2 text-sm">{rows.map((r) => <li key={r.status} className="flex items-center gap-3">
      <span className="size-3 flex-none rounded-xs" style={{ backgroundColor: STATUS[r.status].color }} aria-hidden />
      <span className="flex-1">{STATUS[r.status].label}</span>
      <span className="font-semibold tabular-nums">{formatInt(r.value)} · {formatPercent(total ? (r.value / total) * 100 : 0)}</span></li>)}</ul>
  </Card>;
}

function IssueList({ status, title, items, empty }: { status: StockStatus; title: string; items: { key: string; name: string; detail: string }[]; empty: string }) {
  return <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
    <span className={cn("self-start rounded-xs px-2 py-0.5 text-xs font-semibold", STATUS[status].chip)}>{title}</span>
    {items.length ? <ul className="flex flex-col gap-3">{items.map((i) => <li key={i.key}>
      <p className="font-semibold">{i.name}</p><p className="text-sm text-ink-muted">{i.detail}</p></li>)}</ul>
      : <p className="text-sm text-ink-muted">{empty}</p>}
  </div>;
}

function downloadStockPdf(title: string, insights: string[], overstock: Item[], outWithDemand: Item[]) {
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
  y += 2; line("Sobrestock", 12, true);
  overstock.slice(0, 15).forEach((i) => line(`${i.product_name ?? i.product_code}: ${coverageText(i.coverage_days)} de cobertura · ${formatNumber(i.balance, 0)} u en stock`, 9));
  y += 2; line("Sin stock y con demanda", 12, true);
  outWithDemand.slice(0, 15).forEach((i) => line(`${i.product_name ?? i.product_code}: ${formatNumber(i.units_12m, 0)} u pedidas en 12 meses`, 9));
  y += 3; line("Saldo del kardex por confirmar. Valor, lotes, vencimientos y merma pendientes (costos y archivo de lotes).", 8, false, [95, 99, 104]);
  doc.save(`vetchain-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
}
