import { OriginBadge } from "@/components/data/origin-badge";
import type { DataOrigin } from "@/lib/types";
import { NotificationsButton } from "./notifications-button";

export function PageHeader({ title, subtitle, origin, badge, actions }: { title: string; subtitle?: string; origin?: DataOrigin; badge?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.015em]">{title}</h1>
          {origin && <OriginBadge origin={origin} />}
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">{actions}<NotificationsButton /></div>
    </header>
  );
}
