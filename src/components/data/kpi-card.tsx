import { Card } from "@/components/ui/card";
import { OriginBadge } from "./origin-badge";
import type { DataOrigin } from "@/lib/types";

/** El número es lo primero que se lee: grande, con etiqueta pequeña y origen del dato. */
export function KpiCard({ label, value, hint, origin }: { label: string; value: string; hint?: string; origin?: DataOrigin }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-3xl font-semibold tracking-tight">{value}</span>
      <div className="flex items-center justify-between gap-2">
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : <span />}
        {origin && <OriginBadge origin={origin} />}
      </div>
    </Card>
  );
}
