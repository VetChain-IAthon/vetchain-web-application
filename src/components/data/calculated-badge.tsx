/** Etiqueta de las alertas calculadas con datos reales (se distinguen de las secciones simuladas). */
export function CalculatedBadge({ text = "Calculado con datos reales" }: { text?: string }) {
  return <span className="inline-flex items-center rounded-xs bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok-fg">{text}</span>;
}
