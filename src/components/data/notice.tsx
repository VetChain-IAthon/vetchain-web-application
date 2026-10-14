import { cn } from "@/lib/utils";

/** Aviso sobrio (p. ej. «Todavía no hay costos de compra cargados…»). */
export function Notice({ tone = "danger", children, className }: { tone?: "danger" | "warn"; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded border px-6 py-4 text-sm leading-relaxed", tone === "danger" ? "border-brand-softBorder bg-brand-soft" : "border-warn-fg/20 bg-warn-bg", className)}>
      {children}
    </section>
  );
}
