import { jsPDF } from "jspdf";
import type { components } from "@/lib/api/schema";
import { formatDate, formatInt, formatNumber, formatPen, formatPercent } from "@/lib/format";

type Brief = components["schemas"]["CustomerBriefOut"];
type Version = "internal" | "customer";

/** Lo que puede leer el cliente: sus compras, productos principales y ahorro. Sin ranking, atraso ni notas internas. */
function customerLines(brief: Brief): string[] {
  const top = brief.amount > 0 ? brief.products.slice(0, 2) : [];
  return [
    `• Entre el ${formatDate(brief.date_from)} y el ${formatDate(brief.date_to)} compró ${formatPen(brief.amount)} sin IGV en ${formatInt(brief.order_count)} pedidos` +
      (brief.order_count ? ` (pedido promedio ${formatPen(brief.average_order_amount)}).` : "."),
    ...(top.length ? [`• Sus productos principales: ${top.map((p) => `${p.product_name} (${formatPercent((p.amount / brief.amount) * 100, 0)})`).join(" y ")}.`] : []),
    ...(brief.below_reference_pct != null && brief.below_reference_pct > 0 ? [`• Pagó en promedio ${formatPercent(brief.below_reference_pct)} menos que el precio de referencia.`] : []),
  ];
}

/** Resumen en texto plano con las cifras reales de la ficha, para correo o WhatsApp (versión interna). */
export function briefSummaryText(brief: Brief, version: Version = "internal"): string {
  if (version === "customer") {
    return [`Estimado cliente de ${brief.name}:`, "", "Le compartimos el resumen de sus compras en Mederi Pharma (montos sin IGV):", ...customerLines(brief),
      "", "Quedamos atentos.", "Mederi Pharma"].join("\n");
  }
  const lines = [
    `${brief.name} · período ${formatDate(brief.date_from)} – ${formatDate(brief.date_to)} (montos sin IGV)`,
    `• Pedidos por ${formatPen(brief.amount)} en ${formatInt(brief.order_count)} pedidos (${formatPercent(brief.share_pct)} de la venta de Mederi)` +
      (brief.rank != null ? `; cliente n.° ${formatInt(brief.rank)} de ${formatInt(brief.ranked_customers)}.` : "."),
  ];
  if (brief.purchase_rhythm_days != null && brief.days_since_last_order != null) {
    const late = brief.days_late ? `: va ${brief.days_late} días atrasado` : ": va al día";
    lines.push(`• Suele comprar cada ${formatNumber(brief.purchase_rhythm_days, 0)} días y lleva ${brief.days_since_last_order} sin comprar${late}.`);
  }
  if (brief.below_reference_pct != null) {
    lines.push(`• Pagó en promedio ${formatPercent(Math.abs(brief.below_reference_pct))} ${brief.below_reference_pct >= 0 ? "bajo" : "sobre"} el precio de referencia.`);
  }
  if (brief.salesperson_name) lines.push(`• Vendedor: ${brief.salesperson_name}.`);
  lines.push("", "Versión interna. Proyección, ganancia, ofertas y guion pendientes (modelo de predicción e IA).");
  return lines.join("\n");
}

/** PDF de la ficha (versión interna) con las cifras reales y lo que sigue pendiente. */
export function downloadBriefPdf(brief: Brief, projectionLabel: string, version: Version = "internal") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16, right = 194;
  let y = 18;
  const line = (text: string, size = 10, bold = false, color: [number, number, number] = [22, 22, 22]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size).setTextColor(...color);
    for (const part of doc.splitTextToSize(text, right - left)) {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(part, left, y); y += size * 0.45 + 1.5;
    }
  };
  const gap = (mm = 3) => { y += mm; };

  if (version === "customer") return customerPdf(doc, brief, line, gap, () => y, (v) => { y = v; });
  line("Mederi Pharma · Ficha de cliente para reunión", 9, false, [95, 99, 104]);
  line(brief.name, 16, true); line(`RUC ${brief.ruc} · versión interna`, 9, false, [95, 99, 104]);
  line(`Período: ${formatDate(brief.date_from)} – ${formatDate(brief.date_to)} · montos sin IGV · datos hasta ${formatDate(brief.data_as_of)}`, 9, false, [95, 99, 104]);
  gap();
  line("Resumen", 12, true);
  for (const text of briefSummaryText(brief).split("\n").slice(1, -2)) line(text);
  gap();
  line("Cifras del período", 12, true);
  const discountPct = brief.list_amount > 0 ? (brief.invoice_discount / brief.list_amount) * 100 : 0;
  [
    ["Venta del período", formatPen(brief.amount)],
    ["Pedidos", `${formatInt(brief.order_count)} · promedio ${formatPen(brief.average_order_amount)}`],
    ["Ritmo de compra", brief.purchase_rhythm_days != null ? `Cada ${formatNumber(brief.purchase_rhythm_days, 0)} días` : "—"],
    ["Descuento en factura", `${formatPen(brief.invoice_discount)} (${formatPercent(discountPct)})`],
    ["Nivel", brief.level ?? "Sin definir"],
    ["Ganancia estimada", "Pendiente: faltan costos validados"],
    [`Proyección ${projectionLabel.toLowerCase()}`, "Pendiente del modelo de predicción"],
  ].forEach(([label, value]) => { line(`${label}: ${value}`); });
  gap();
  line("Qué compró y a qué precio", 12, true);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(95, 99, 104);
  const cols = [left, 108, 128, 150, 170, right];
  ["Producto", "Unid.", "Pagado", "Referencia", "Venta"].forEach((h, i) => doc.text(h, i === 0 ? cols[0] : cols[i + 1], y, { align: i === 0 ? "left" : "right" }));
  y += 5;
  doc.setFont("helvetica", "normal").setTextColor(22, 22, 22);
  for (const p of brief.products.slice(0, 15)) {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.text(doc.splitTextToSize(p.product_name, 88)[0], cols[0], y);
    doc.text(formatNumber(p.quantity, 0), cols[2], y, { align: "right" });
    doc.text(formatPen(p.average_price), cols[3], y, { align: "right" });
    doc.text(formatPen(p.reference_price), cols[4], y, { align: "right" });
    doc.text(formatPen(p.amount), cols[5], y, { align: "right" });
    y += 5;
  }
  if (brief.products.length > 15) line(`… y ${brief.products.length - 15} productos más.`, 8, false, [95, 99, 104]);
  gap();
  line("Precio de referencia: último precio pagado por cualquier cliente (estimado). Un pedido no es una venta facturada. " +
    "Pendientes: resumen, ofertas y guion (IA), proyección (modelo), ganancia (costos) y cobranza (cobros sin enlazar).", 8, false, [95, 99, 104]);

  doc.save(`vetchain-ficha-${brief.ruc}-${brief.date_to}.pdf`);
}

type Line = (text: string, size?: number, bold?: boolean, color?: [number, number, number]) => void;

/** PDF para el cliente: resumen de compras y qué compró a qué precio. Sin datos internos. */
function customerPdf(doc: jsPDF, brief: Brief, line: Line, gap: (mm?: number) => void, getY: () => number, setY: (y: number) => void) {
  const muted: [number, number, number] = [95, 99, 104];
  line("Mederi Pharma · Resumen de sus compras", 9, false, muted);
  line(brief.name, 16, true);
  line(`RUC ${brief.ruc} · período ${formatDate(brief.date_from)} – ${formatDate(brief.date_to)} · montos sin IGV`, 9, false, muted);
  if (brief.salesperson_name) line(`Su vendedor: ${brief.salesperson_name}`, 9, false, muted);
  gap();
  line("Resumen", 12, true);
  for (const text of customerLines(brief)) line(text);
  gap();
  line("Qué compró y a qué precio", 12, true);
  const left = 16, right = 194;
  const cols = [left, 120, 145, 170, right];
  let y = getY();
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...muted);
  ["Producto", "Unidades", "Precio pagado", "Su ahorro", "Venta"].forEach((h, i) => doc.text(h, cols[i], y, { align: i === 0 ? "left" : "right" }));
  y += 5;
  doc.setFont("helvetica", "normal").setTextColor(22, 22, 22);
  for (const p of brief.products.slice(0, 20)) {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.text(doc.splitTextToSize(p.product_name, 90)[0], cols[0], y);
    doc.text(formatNumber(p.quantity, 0), cols[1], y, { align: "right" });
    doc.text(formatPen(p.average_price), cols[2], y, { align: "right" });
    doc.text(p.below_reference_pct != null && p.below_reference_pct > 0 ? formatPercent(p.below_reference_pct) : "—", cols[3], y, { align: "right" });
    doc.text(formatPen(p.amount), cols[4], y, { align: "right" });
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Total", cols[0], y + 1); doc.text(formatPen(brief.amount), cols[4], y + 1, { align: "right" });
  setY(y + 8);
  if (brief.products.length > 20) line(`Incluye ${brief.products.length - 20} productos más en el total.`, 8, false, muted);
  line("Precio de referencia: último precio de venta registrado del producto. Montos sin IGV.", 8, false, muted);
  doc.save(`mederi-resumen-compras-${brief.ruc}-${brief.date_to}.pdf`);
}
