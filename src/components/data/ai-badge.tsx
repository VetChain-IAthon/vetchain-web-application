import { cn } from "@/lib/utils";

const LABELS = { generative: "IA generativa", predictive: "IA predictiva" } as const;

/** Etiqueta para lo que produce la IA: texto redactado (generativa) o cifra del modelo predictivo (predictiva).
 *  Misma forma que OriginBadge; no nombra el proveedor ni el modelo. */
export function AiBadge({ kind = "generative", className }: { kind?: keyof typeof LABELS; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-xs bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand", className)}>{LABELS[kind]}</span>;
}
