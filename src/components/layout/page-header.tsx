import { OriginBadge } from "@/components/data/origin-badge";
import type { DataOrigin } from "@/lib/types";

export function PageHeader({ title, subtitle, origin, actions }: { title: string; subtitle?: string; origin?: DataOrigin; actions?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.015em]">{title}</h1>
          {origin && <OriginBadge origin={origin} />}
        </div>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
