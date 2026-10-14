import type { components } from "@/lib/api/schema";
import { formatDate, formatPen, formatPercent } from "@/lib/format";

type Preview = components["schemas"]["QuotationPreviewOut"];
type Quotation = components["schemas"]["QuotationOut"];
type Quote = Preview | Quotation;

export type QuotationExport = {
  quote: Quote;
  customerName: string;
  productNames: Map<string, string>;
};

const isIssued = (quote: Quote): quote is Quotation => "id" in quote;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const amount = (value: number) => value.toFixed(2).replace(".", ",");

function saveFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
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

export function downloadQuotationCsv({ quote, customerName, productNames }: QuotationExport) {
  const rows: (string | number)[][] = [
    [isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa de cotización · no emitida"],
    ["Cliente", customerName],
    ["Fecha", isIssued(quote) ? quote.issued_on : new Date().toISOString().slice(0, 10)],
    ["Vigencia", isIssued(quote) ? quote.valid_until : `${quote.quotation_validity_days} días desde la emisión`],
    [],
    ["Producto", "Código", "Cantidad", "Precio unitario sin IGV", "Importe sin IGV"],
    ...quote.lines.map((line) => [productNames.get(line.product_code) ?? line.product_code, line.product_code, line.quantity, amount(line.unit_price), amount(line.amount)]),
    [],
    ["Subtotal", "", "", "", amount(quote.subtotal)],
    [`Descuento ${formatPercent(quote.discount_pct)}`, "", "", "", amount(-quote.discount_amount)],
    ["Valor de venta", "", "", "", amount(quote.net)],
    ["IGV", "", "", "", amount(quote.igv)],
    ["Total con IGV", "", "", "", amount(quote.total_with_tax)],
  ];
  saveFile(`${filename(quote)}.csv`, `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}

export function downloadQuotationPrintable({ quote, customerName, productNames }: QuotationExport) {
  const title = isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa de cotización";
  const date = isIssued(quote) ? formatDate(quote.issued_on) : formatDate(new Date().toISOString().slice(0, 10));
  const validity = isIssued(quote) ? `Válida hasta ${formatDate(quote.valid_until)}` : `Vigencia de ${quote.quotation_validity_days} días desde la emisión`;
  const lines = quote.lines.map((line) => `<tr><td>${escapeHtml(productNames.get(line.product_code) ?? line.product_code)}</td><td class="number">${line.quantity}</td><td class="number">${escapeHtml(formatPen(line.unit_price))}</td><td class="number">${escapeHtml(formatPen(line.amount))}</td></tr>`).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)} · VetChain</title><style>
    body{font-family:Arial,sans-serif;color:#161616;max-width:820px;margin:36px auto;padding:0 24px}header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #D01F29;padding-bottom:18px}h1{margin:0 0 6px;font-size:25px}.muted{color:#5F6368}.draft{margin:18px 0;padding:12px;background:#FDF1DC;font-weight:bold}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{padding:11px 8px;border-bottom:1px solid #E3E3E3;text-align:left;font-size:14px}th{background:#F5F5F5}.number{text-align:right;white-space:nowrap}.totals{margin-left:auto;max-width:310px}.totals div{display:flex;justify-content:space-between;gap:20px;padding:6px 0}.totals .total{border-top:2px solid #D01F29;margin-top:7px;padding-top:11px;font-size:19px;font-weight:bold}footer{margin-top:36px;font-size:12px;color:#5F6368}@media print{body{margin:0;max-width:none}.draft{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><header><div><h1>${escapeHtml(title)}</h1><div>Mederi Pharma · VetChain</div></div><div class="number">${escapeHtml(date)}<br>${escapeHtml(validity)}</div></header>
  ${isIssued(quote) ? "" : '<p class="draft">Vista previa no emitida. Los importes están sujetos a la validación final de VetChain.</p>'}
  <p><strong>Cliente:</strong> ${escapeHtml(customerName)}</p>
  <table><thead><tr><th>Producto</th><th class="number">Cantidad</th><th class="number">Precio unitario</th><th class="number">Importe</th></tr></thead><tbody>${lines}</tbody></table>
  <div class="totals"><div><span>Subtotal</span><span>${escapeHtml(formatPen(quote.subtotal))}</span></div><div><span>Descuento (${escapeHtml(formatPercent(quote.discount_pct))})</span><span>− ${escapeHtml(formatPen(quote.discount_amount))}</span></div><div><span>Valor de venta</span><span>${escapeHtml(formatPen(quote.net))}</span></div><div><span>IGV</span><span>${escapeHtml(formatPen(quote.igv))}</span></div><div class="total"><span>Total</span><span>${escapeHtml(formatPen(quote.total_with_tax))}</span></div></div>
  <footer>Precios de referencia estimados, en soles. Para guardar como PDF, abre este archivo en el navegador y usa Imprimir.</footer></body></html>`;
  saveFile(`${filename(quote)}.html`, html, "text/html;charset=utf-8");
}

export function quotationWhatsAppText({ quote, customerName, productNames }: QuotationExport) {
  const title = isIssued(quote) ? `Cotización #${quote.id}` : "Vista previa de cotización (no emitida)";
  return `*${title} · Mederi Pharma*\nCliente: ${customerName}\n\n${quote.lines.map((line) => `• ${productNames.get(line.product_code) ?? line.product_code} × ${line.quantity}: ${formatPen(line.amount)}`).join("\n")}\n\nSubtotal: ${formatPen(quote.subtotal)}\nDescuento (${formatPercent(quote.discount_pct)}): − ${formatPen(quote.discount_amount)}\nIGV: ${formatPen(quote.igv)}\n*Total: ${formatPen(quote.total_with_tax)}*${isIssued(quote) ? `\nVálida hasta ${formatDate(quote.valid_until)}` : "\nImportes sujetos a validación final."}`;
}
