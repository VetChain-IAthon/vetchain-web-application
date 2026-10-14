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
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}
