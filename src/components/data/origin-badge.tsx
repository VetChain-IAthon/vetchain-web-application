import { cn } from "@/lib/utils";
import type { DataOrigin } from "@/lib/types";

const STYLES: Record<DataOrigin, { label: string; cls: string }> = {
  real: { label: "Datos reales", cls: "bg-ok-bg text-ok-fg" },
  synthetic: { label: "Datos sintéticos", cls: "bg-neutral-bg text-neutral-fg" },
  estimated: { label: "Estimado", cls: "bg-warn-bg text-warn-fg" },
  simulated: { label: "Simulado", cls: "bg-danger-bg text-danger-fg" },
};

/** Etiqueta de origen del dato (campo data_origin de la API). Obligatoria en cada módulo con cifras. */
export function OriginBadge({ origin, className }: { origin: DataOrigin; className?: string }) {
  const s = STYLES[origin];
  return <span className={cn("inline-flex items-center rounded-xs px-2 py-0.5 text-xs font-semibold", s.cls, className)}>{s.label}</span>;
}
