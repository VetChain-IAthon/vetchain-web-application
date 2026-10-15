"use client";

import { jsPDF } from "jspdf";
import { ArrowLeft, Database, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatInt, formatMonthYear, formatNumber, formatPen } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { PendingTile, Status } from "./report-ui";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { ReportGeminiSummary } from "./report-gemini-summary";

/** Estructura de design/prototipo/Cobranza-6f07.dc.html. Lo real son los cobros registrados (cuánto y quién pagó).
 *  La deuda pendiente, vencida y su antigüedad quedan pendientes: los cobros no se enlazan con pedidos ni facturas. */

const CREDIT_RULES = [
  ["Paga a tiempo 6 meses seguidos", "Mantiene su crédito o sube al siguiente plazo."],
  ["Atraso de 1 a 30 días", "Mantiene el crédito. Recordatorio automático por WhatsApp."],
  ["Atraso de 31 a 60 días", "El crédito baja a 15 días hasta regularizar."],
  ["Atraso de más de 60 días", "Solo al contado y aviso a Gerencia."],
] as const;

const monthLabel = (iso: string) => { const s = formatMonthYear(iso); return s.charAt(0).toUpperCase() + s.slice(1); };

export function ReceivablesReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/receivables"), [], "No se pudo cargar el reporte de cobranza.");
  const [channel, setChannel] = useState<ShareChannel | null>(null);
  const data = query.data;
  const payers = data?.top_payers ?? [];
  const topShare = data?.collected_amount ? (payers.slice(0, 5).reduce((s, p) => s + p.amount, 0) / data.collected_amount) * 100 : null;

  const insights = data ? [
    `Se registraron ${formatInt(data.receipt_count)} cobros por ${formatPen(data.collected_amount)} en el período${payers[0] && topShare != null ? `; los 5 clientes que más pagaron suman el ${formatNumber(topShare, 1)} %` : ""}.`,
    "Cuánto se debe, cuánto está vencido y quién se atrasa queda pendiente: los cobros aún no se pueden enlazar con las facturas y falta su fecha de vencimiento.",
    "Propuesta: que el crédito dependa de cómo paga cada cliente y no solo de cuánto compra.",
  ].filter(Boolean) : [];
  const subject = `Cartera y cobranza · ${data?.period.from_date ? `${monthLabel(data.period.from_date)} a ${formatMonthYear(data.period.to_date)}` : ""}`;

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Cartera y cobranza"
      badge={<span className="rounded-xs bg-warn-bg px-2 py-0.5 text-[13px] font-semibold text-warn-fg">Parcial</span>}
      subtitle={`Quién nos debe y a quién darle crédito · cobros reales de cobros.csv; la deuda se calculará al enlazar cobros con facturas`}
      actions={<div className="flex flex-none gap-2">
        <Button disabled={!data} onClick={() => data && downloadReceivablesPdf(subject, insights, payers)}><Download size={16} aria-hidden />Descargar PDF</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("email")}><Mail size={16} aria-hidden />Correo</Button>
        <Button variant="outline" disabled={!data} onClick={() => setChannel("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
      </div>} />
    {channel && <ShareDialog channel={channel} version="internal" subject={subject} text={insights.map((l) => `• ${l}`).join("\n")} onClose={() => setChannel(null)} />}

    <Status loading={query.loading && !data} error={query.error} reload={query.reload} />
    {data && <>
      <Card className="flex flex-col gap-4 p-8">
        <ReportGeminiSummary title="Lo que dicen los datos" report="receivables" metrics={{ receipts: data.receipt_count, collected_pen: data.collected_amount, top_five_share_pct: topShare }} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PendingTile label="Por cobrar" kind="data" reason="Falta enlazar cobros con facturas" />
        <PendingTile label="Vencida" kind="data" reason="Falta el vencimiento de cada factura" />
        <PendingTile label="Días promedio de cobro" kind="data" reason="Falta enlazar cobros con facturas" />
        <PendingTile label="Facturas pagadas a tiempo" kind="data" reason="Falta el vencimiento de cada factura" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4 p-8">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Deuda vencida por antigüedad</h2><p className="text-sm text-ink-muted">Días de atraso desde el vencimiento de la factura</p></div>
            <PendingChip />
          </div>
          <div className="relative grid h-56 grid-cols-4 items-end gap-6 border-b border-line-strong px-4" aria-hidden>
            {[78, 46, 20, 20].map((h, i) => <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-ink-muted">—</span>
              <div className="w-full max-w-[80px] rounded-t border-2 border-dashed border-line-strong bg-canvas" style={{ height: `${h * 1.6}px` }} />
            </div>)}
          </div>
          <div className="grid grid-cols-4 gap-6 px-4 text-center text-sm text-ink-muted">{AGING.map((label) => <span key={label}>{label}</span>)}</div>
          <PendingNote>Pendiente: falta enlazar los cobros con las facturas y la fecha de vencimiento de cada una.</PendingNote>
        </Card>

        <Card className="flex flex-col gap-4 p-8">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Vencida por nivel de cliente</h2><p className="text-sm text-ink-muted">Cuánto deben los clientes A, B y C</p></div>
            <PendingChip />
          </div>
          <div className="relative mx-auto size-44" aria-hidden>
            <div className="absolute inset-0 rounded-full border-[26px] border-line" />
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-semibold text-ink-muted">—</span><span className="text-xs text-ink-muted">vencido</span></div>
          </div>
          <ul className="flex flex-col gap-2 text-sm">{LEVELS.map(([level, color]) => <li key={level} className="flex items-center gap-3">
            <span className="size-3 flex-none rounded-xs" style={{ backgroundColor: color }} aria-hidden />
            <span className="flex-1">Nivel {level}</span><span className="font-semibold text-ink-muted">—</span></li>)}</ul>
          <PendingNote>Pendiente: se calculará con la deuda por cliente.</PendingNote>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Clientes con deuda vencida</h2><p className="text-sm text-ink-muted">Los 5 mayores</p></div>
          <PendingChip />
        </div>
        <Table>
          <THead><TR><TH>Cliente</TH><TH>Nivel</TH><TH numeric>Vencido</TH><TH numeric>Atraso</TH><TH numeric>Facturas</TH><TH>Qué hacer</TH></TR></THead>
          <TBody><TR><TD colSpan={6} className="py-8 text-center text-sm text-ink-muted">
            Pendiente: la lista de clientes con deuda vencida aparecerá al enlazar cobros con facturas y validar las fechas de vencimiento.
          </TD></TR></TBody>
        </Table>
      </Card>

      <Card className="flex flex-col gap-4 p-8">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Crédito según cómo paga</h2><p className="text-sm text-ink-muted">Propuesta de regla · se configurará en Ajustes</p></div>
          <span className="flex-none rounded-xs bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Propuesta</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CREDIT_RULES.map(([title, text]) => <div key={title} className="rounded bg-canvas p-5"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-ink-2">{text}</p></div>)}
        </div>
        <p className="text-[13px] text-ink-muted">El cotizador avisará antes de vender a un cliente con deuda vencida, y la ficha de cliente mostrará su comportamiento de pago, cuando exista la deuda por cliente.</p>
      </Card>
    </>}
  </div>;
}

const AGING = ["1 a 30 días", "31 a 60 días", "61 a 90 días", "Más de 90 días"];
const LEVELS = [["A", "#8E1119"], ["B", "#D01F29"], ["C", "#E8959A"]] as const; // tokens chart-level-*

function PendingChip() {
  return <span className="flex-none rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg">Pendiente</span>;
}

function PendingNote({ children }: { children: React.ReactNode }) {
  return <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><Database size={14} aria-hidden />{children}</p>;
}

type PayerRow = { name: string; amount: number; count: number };

function downloadReceivablesPdf(title: string, insights: string[], payers: PayerRow[]) {
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
  y += 2; line("Clientes que más pagaron", 12, true);
  payers.forEach((p) => line(`${p.name}: ${formatPen(p.amount)} en ${formatInt(p.count)} cobros`, 9));
  y += 3; line("Deuda por cobrar, vencida y su antigüedad: pendientes hasta enlazar cobros con facturas.", 8, false, [95, 99, 104]);
  doc.save(`vetchain-cobranza-${new Date().toISOString().slice(0, 10)}.pdf`);
}
