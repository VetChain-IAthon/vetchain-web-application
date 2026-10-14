const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Soles con separador de miles y dos decimales: S/ 1,234.50. Un valor nulo se muestra como guion. */
export function formatPen(value: number | null | undefined): string {
  return value == null ? "—" : pen.format(value);
}

/** Número con miles y dos decimales, sin símbolo. */
export function formatDecimal(value: number | null | undefined): string {
  return value == null ? "—" : num.format(value);
}

export function formatInt(value: number | null | undefined): string {
  return value == null ? "—" : new Intl.NumberFormat("es-PE").format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  return value == null ? "—" : `${value.toFixed(digits)} %`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Una fecha sin hora («2026-03-02») se lee en UTC; en hora de Lima saldría el día anterior.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", ...(dateOnly && { timeZone: "UTC" }) }).format(new Date(iso));
}

/** «febrero de 2025». */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** Inicio de la ventana de 12 meses que termina en `asOf` (igual que el backend). */
export function twelveMonthStart(asOf: string): string {
  const d = new Date(asOf + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Número con miles y hasta `maxDigits` decimales, sin ceros de relleno: 17.6, 1,250. */
export function formatNumber(value: number | null | undefined, maxDigits = 1): string {
  return value == null ? "—" : new Intl.NumberFormat("es-PE", { maximumFractionDigits: maxDigits }).format(value);
}
