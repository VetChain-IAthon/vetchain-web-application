import { jsPDF } from "jspdf";
import type { components } from "@/lib/api/schema";
import { formatDate, formatPen, formatPercent } from "@/lib/format";

type Preview = components["schemas"]["QuotationPreviewOut"];
type Quotation = components["schemas"]["QuotationOut"];
type Quote = Preview | Quotation;

export type QuotationExport = {
  quote: Quote;
  customerName: string;
  customerRuc?: string;
  productNames: Map<string, string>;
};

const isIssued = (quote: Quote): quote is Quotation => "id" in quote;
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function saveFile(name: string, content: string | Blob, type: string) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function filename(quote: Quote) {
  return isIssued(quote) ? `vetchain-cotizacion-${quote.id}` : "vetchain-vista-previa-cotizacion";
}

/**
 * CSV para Excel con la configuración regional del Perú: separador coma, punto decimal y UTF-8 con BOM (para las tildes).
 * Los importes van como números sin comillas para que Excel pueda sumarlos; las fechas en formato AAAA-MM-DD.
 */
export function downloadQuotationCsv({ quote, customerName, customerRuc, productNames }: QuotationExport) {
  const money = (value: number) => value.toFixed(2);
  const cell = (value: string | number) => (typeof value === "number" ? String(value) : csvCell(value));
  const igvLabel = "igv_rate_pct" in quote ? `IGV (${formatPercent(quote.igv_rate_pct, 0)})` : "IGV";
  const rows: (string | number)[][] = [
    ["Mederi Pharma · Cotización"],
    ["Documento", isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa (no emitida)"],
    ["Fecha", isIssued(quote) ? quote.issued_on : new Date().toISOString().slice(0, 10)],
    ["Válida hasta", isIssued(quote) ? quote.valid_until : `${quote.quotation_validity_days} días desde la emisión`],
    ["Cliente", customerName],
    ["RUC", customerRuc ?? quote.ruc],
    ...("credit_days" in quote ? [["Condición de pago", `Crédito a ${quote.credit_days} días`]] : []),
    ["Moneda", "Soles (PEN)"],
    [],
    ["N°", "Código", "Producto", "Cantidad", "Precio unitario (sin IGV)", "Importe (sin IGV)"],
    ...quote.lines.map((line, index) => [index + 1, line.product_code, productNames.get(line.product_code) ?? line.product_code,
      line.quantity, money(line.unit_price), money(line.amount)]),
    [],
    ["", "", "", "", "Subtotal", money(quote.subtotal)],
    ["", "", "", "", `Descuento (${formatPercent(quote.discount_pct)})`, money(-quote.discount_amount)],
    ["", "", "", "", "Valor de venta", money(quote.net)],
    ["", "", "", "", igvLabel, money(quote.igv)],
    ["", "", "", "", "Total (con IGV)", money(quote.total_with_tax)],
    [],
    [isIssued(quote) ? "Precios de referencia estimados, en soles." : "Vista previa no emitida: importes sujetos a la validación final de VetChain."],
  ];
  // Los importes ya son texto con 2 decimales: se marcan como número quitándoles las comillas.
  const isAmount = (value: string | number) => typeof value === "string" && /^-?\d+\.\d{2}$/.test(value);
  const csv = rows.map((row) => row.map((value) => (isAmount(value) ? value : cell(value))).join(",")).join("\r\n");
  saveFile(`${filename(quote)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

// Paleta del archivo imprimible (tokens de design/tokens.md).
const INK: [number, number, number] = [22, 22, 22];
const MUTED: [number, number, number] = [95, 99, 104];
const BRAND: [number, number, number] = [208, 31, 41];
const LINE: [number, number, number] = [227, 227, 227];
const HEAD_BG: [number, number, number] = [245, 245, 245];
const DRAFT_BG: [number, number, number] = [253, 241, 220];

/** Helvetica estándar solo tiene Latin-1: se cambian los espacios finos y el signo menos tipográfico. */
const pdfText = (value: string) => value.replace(/[  ]/g, " ").replace(/−/g, "-");

function quotationTitle(quote: Quote) {
  return isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa de cotización";
}

/** Arma el PDF con el diseño del imprimible: encabezado con línea roja, tabla de productos y totales. */
export function buildQuotationPdf({ quote, customerName, productNames }: QuotationExport): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 48, right = pageWidth - 48, bottom = pageHeight - 56;
  const cols = { qty: right - 230, price: right - 110, amount: right - 8 };
  const date = formatDate(isIssued(quote) ? quote.issued_on : new Date().toISOString().slice(0, 10));
  const validity = isIssued(quote) ? `Válida hasta ${formatDate(quote.valid_until)}` : `Vigencia de ${quote.quotation_validity_days} días desde la emisión`;
  const text = (value: string, x: number, y: number, options?: Parameters<typeof doc.text>[3]) => doc.text(pdfText(value), x, y, options);
  let y = 60;

  doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(22);
  text(quotationTitle(quote), left, y);
  doc.setFont("helvetica", "normal").setFontSize(11);
  text("Mederi Pharma · VetChain", left, y + 20);
  doc.setFontSize(10.5);
  text(date, right, y - 4, { align: "right" });
  text(validity, right, y + 11, { align: "right" });
  y += 38;
  doc.setDrawColor(...BRAND).setLineWidth(3).line(left, y, right, y);
  y += 22;

  if (!isIssued(quote)) {
    doc.setFillColor(...DRAFT_BG).rect(left, y, right - left, 30, "F");
    doc.setFont("helvetica", "bold").setFontSize(10.5);
    text("Vista previa no emitida. Los importes están sujetos a la validación final de VetChain.", left + 10, y + 19);
    y += 46;
  }

  doc.setFont("helvetica", "bold").setFontSize(11);
  text("Cliente:", left, y);
  const labelWidth = doc.getTextWidth("Cliente: ");
  doc.setFont("helvetica", "normal");
  text(customerName, left + labelWidth, y);
  y += 20;

  const header = () => {
    doc.setFillColor(...HEAD_BG).rect(left, y, right - left, 26, "F");
    doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(...INK);
    text("Producto", left + 8, y + 17);
    text("Cantidad", cols.qty, y + 17, { align: "right" });
    text("Precio unitario", cols.price, y + 17, { align: "right" });
    text("Importe", cols.amount, y + 17, { align: "right" });
    doc.setDrawColor(...LINE).setLineWidth(0.75).line(left, y + 26, right, y + 26);
    y += 26;
  };
  header();
  doc.setFont("helvetica", "normal").setFontSize(10.5);
  for (const line of quote.lines) {
    const name: string[] = doc.splitTextToSize(pdfText(productNames.get(line.product_code) ?? line.product_code), cols.qty - left - 70);
    const rowHeight = 14 * name.length + 14;
    if (y + rowHeight > bottom) { doc.addPage(); y = 56; header(); doc.setFont("helvetica", "normal").setFontSize(10.5); }
    doc.text(name, left + 8, y + 18);
    text(String(line.quantity), cols.qty, y + 18, { align: "right" });
    text(formatPen(line.unit_price), cols.price, y + 18, { align: "right" });
    text(formatPen(line.amount), cols.amount, y + 18, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(...LINE).line(left, y, right, y);
  }

  const totals: [string, string][] = [
    ["Subtotal", formatPen(quote.subtotal)],
    [`Descuento (${formatPercent(quote.discount_pct)})`, `- ${formatPen(quote.discount_amount)}`],
    ["Valor de venta", formatPen(quote.net)],
    ["IGV", formatPen(quote.igv)],
  ];
  if (y + 150 > bottom) { doc.addPage(); y = 56; }
  y += 26;
  const totalsLeft = right - 230;
  doc.setFont("helvetica", "normal").setFontSize(10.5);
  for (const [label, value] of totals) {
    text(label, totalsLeft, y);
    text(value, right, y, { align: "right" });
    y += 20;
  }
  doc.setDrawColor(...BRAND).setLineWidth(2).line(totalsLeft, y - 6, right, y - 6);
  y += 14;
  doc.setFont("helvetica", "bold").setFontSize(15);
  text("Total", totalsLeft, y);
  text(formatPen(quote.total_with_tax), right, y, { align: "right" });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
    text("Precios de referencia estimados, en soles. Montos sin IGV salvo el total.", left, pageHeight - 32);
    if (pages > 1) text(`Página ${page} de ${pages}`, right, pageHeight - 32, { align: "right" });
  }
  return doc.output("blob");
}

export function downloadQuotationPdf(data: QuotationExport) {
  saveFile(`${filename(data.quote)}.pdf`, buildQuotationPdf(data), "application/pdf");
}

/** Mensaje que acompaña al PDF: lo esencial de la cotización, el detalle va en el archivo. */
export function quotationWhatsAppMessage({ quote, customerName }: QuotationExport) {
  const what = isIssued(quote) ? `la cotización #${quote.id}` : "la vista previa de la cotización";
  const validity = isIssued(quote) ? `Es válida hasta el ${formatDate(quote.valid_until)}.` : "Los importes están sujetos a validación final.";
  const count = quote.lines.length === 1 ? "1 producto" : `${quote.lines.length} productos`;
  return `Hola, te comparto ${what} de Mederi Pharma para ${customerName}: ${count} por un total de *${formatPen(quote.total_with_tax)}* (incluye IGV). ${validity}\n\nTe adjunto el PDF con el detalle. Cualquier consulta, quedo atento.`;
}

/** Mensaje completo para enviar como texto: cliente, cada producto con su cantidad e importe, y los totales. */
export function quotationWhatsAppText({ quote, customerName, productNames }: QuotationExport) {
  const title = isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa de cotización (no emitida)";
  return `*${title} · Mederi Pharma*\nCliente: ${customerName}\n\n${quote.lines.map((line) => `• ${productNames.get(line.product_code) ?? line.product_code} × ${line.quantity}: ${formatPen(line.amount)}`).join("\n")}\n\nSubtotal: ${formatPen(quote.subtotal)}\nDescuento (${formatPercent(quote.discount_pct)}): − ${formatPen(quote.discount_amount)}\nIGV: ${formatPen(quote.igv)}\n*Total: ${formatPen(quote.total_with_tax)}*${isIssued(quote) ? `\nVálida hasta ${formatDate(quote.valid_until)}` : "\nImportes sujetos a validación final."}`;
}

export type WhatsAppResult = "text" | "shared" | "cancelled" | "downloaded";

/**
 * Texto: abre WhatsApp (wa.me) con el mensaje completo.
 * PDF: wa.me no acepta archivos, así que se usa la hoja de compartir del sistema con el PDF adjunto y el mensaje
 * (al elegir WhatsApp, el archivo va en el chat). Si el navegador no comparte archivos, descarga el PDF y abre wa.me.
 * El PDF se arma de forma síncrona para no perder el clic del usuario, que el navegador exige para compartir.
 */
export async function sendQuotationByWhatsApp(data: QuotationExport, format: "text" | "pdf"): Promise<WhatsAppResult> {
  const openWaMe = (message: string) => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  if (format === "text") { openWaMe(quotationWhatsAppText(data)); return "text"; }
  const name = `${filename(data.quote)}.pdf`;
  const pdf = buildQuotationPdf(data);
  const message = quotationWhatsAppMessage(data);
  const file = new File([pdf], name, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message, title: quotationTitle(data.quote) });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Otro fallo (permiso, tamaño): se sigue con la descarga y wa.me.
    }
  }
  saveFile(name, pdf, "application/pdf");
  openWaMe(message);
  return "downloaded";
}
