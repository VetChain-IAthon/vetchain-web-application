"use client";

import { BarChart3, Bell, FileText, LayoutDashboard, Package, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/config/nav";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard, bell: Bell, users: Users, "file-text": FileText,
  package: Package, "bar-chart-3": BarChart3, "sliders-horizontal": SlidersHorizontal,
};

export function Sidebar({ role, userName, initials }: { role: Role; userName: string; initials: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sticky top-0 flex h-screen w-sidebar flex-none flex-col gap-7 overflow-y-auto border-r border-line bg-surface px-4 py-6">
      <div className="px-2">
        <div className="text-lg font-semibold tracking-tight">VetChain</div>
        <div className="text-[13px] text-ink-muted">Mederi Pharma · piloto</div>
      </div>
      <nav aria-label="Secciones" className="flex flex-col gap-0.5">
        {NAV.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.title} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1.5 pt-3.5 text-xs font-semibold text-ink-muted">{g.title}</div>
              {items.map((i) => {
                const Icon = ICONS[i.icon] ?? LayoutDashboard;
                const on = isActive(i.href);
                return (
                  <div key={i.href}>
                    <Link href={i.href} aria-current={on ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 rounded px-3 py-[9px] text-sm font-semibold no-underline", on ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas hover:text-ink-2")}>
                      <Icon size={18} strokeWidth={1.8} aria-hidden />
                      <span>{i.label}</span>
                    </Link>
                    {on && i.children && (
                      <div className="ml-[38px] mt-0.5 flex flex-col gap-0.5">
                        {i.children.map((c) => (
                          <Link key={c.href} href={c.href} className={cn("rounded-sm px-2 py-1 text-[13px] no-underline", pathname === c.href ? "font-semibold text-brand" : "text-ink-muted hover:text-ink")}>{c.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line pt-4">
        <Link href="/perfil" aria-label="Ver mi perfil" className="flex items-center gap-2.5 rounded p-1.5 text-ink no-underline hover:text-ink">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{initials}</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{userName}</span>
            <span className="text-xs text-ink-muted">Ver mi perfil</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
