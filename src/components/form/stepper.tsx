"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Convierte el texto del campo a número («12,5» y «12.5» valen igual). Vacío o inválido = null. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const iconBtn = "flex size-10 flex-none items-center justify-center rounded border border-line-strong bg-surface text-ink hover:bg-canvas disabled:opacity-40";

/** Valor numérico con botones − / + y campo editable. Vacío significa «sin definir». */
export function Stepper({ value, onChange, label, suffix, step = 1, min = 0, max, size = "md" }: {
  value: string; onChange: (v: string) => void; label: string; suffix: string;
  step?: number; min?: number; max?: number; size?: "md" | "lg";
}) {
  const n = parseNumber(value);
  const clamp = (x: number) => Math.min(max ?? Infinity, Math.max(min, x));
  const bump = (d: number) => onChange(String(clamp(Math.round(((n ?? min) + d) * 100) / 100)));
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Bajar ${label}`} className={cn(iconBtn, size === "lg" && "size-11")} disabled={n != null && n <= min} onClick={() => bump(-step)}>
        <Minus size={16} strokeWidth={2} aria-hidden />
      </button>
      <span className="flex items-baseline gap-1">
        <input type="text" inputMode="decimal" aria-label={label} placeholder="—" value={value} onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-16 rounded-sm border border-transparent bg-transparent text-center font-semibold tabular-nums hover:border-line-strong focus:border-brand focus:outline focus:outline-2 focus:outline-brand",
            size === "lg" ? "h-11 text-[26px] tracking-[-0.02em]" : "h-10 text-sm",
          )} />
        <span className={cn("font-semibold", size === "lg" ? "text-lg" : "text-sm")}>{suffix}</span>
      </span>
      <button type="button" aria-label={`Subir ${label}`} className={cn(iconBtn, size === "lg" && "size-11")} disabled={n != null && max != null && n >= max} onClick={() => bump(step)}>
        <Plus size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
