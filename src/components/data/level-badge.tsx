import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = { A: "bg-brand-soft text-brand-strong", B: "bg-warn-bg text-warn-fg", C: "bg-neutral-bg text-neutral-fg" };

/** Nivel de volumen A, B o C. Sin umbrales definidos se muestra «Sin nivel». */
export function LevelBadge({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-xs text-ink-muted">Sin nivel</span>;
  return <span className={cn("inline-flex rounded-xs px-2 py-0.5 text-xs font-semibold", STYLES[level])}>Nivel {level}</span>;
}
