"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { components } from "@/lib/api/schema";
import { formatMonthYear, formatPen } from "@/lib/format";
import { cn } from "@/lib/utils";

type Month = components["schemas"]["MonthlyAmountOut"];

/** Los meses sin pedidos no vienen del backend: se agregan en cero para que el hueco se vea en el gráfico. */
function fillMissingMonths(items: Month[]): Pick<Month, "month" | "amount">[] {
  if (items.length < 2) return items;
  const sorted = [...items].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(sorted.map((item) => [item.month.slice(0, 7), item]));
  const result: Pick<Month, "month" | "amount">[] = [];
  let [year, month] = sorted[0].month.slice(0, 7).split("-").map(Number);
  const last = sorted[sorted.length - 1].month.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push(byMonth.get(key) ?? { month: `${key}-01`, amount: 0 });
    if (key >= last) break;
    month += 1; if (month > 12) { month = 1; year += 1; }
  }
  return result;
}

/** `className` permite que el gráfico llene el alto de su tarjeta (por defecto mide 16rem). */
export function MonthlyChart({ items, className }: { items: Month[]; className?: string }) {
  const data = fillMissingMonths(items).map((item) => ({ label: `${formatMonthYear(item.month).slice(0, 3)} ${item.month.slice(2, 4)}`, amount: item.amount, full: formatMonthYear(item.month) }));
  if (!data.length) return <p className="py-10 text-sm text-ink-muted">No hay pedidos en este período.</p>;
  return <div className={cn("h-64 w-full", className)} role="img" aria-label="Monto de pedidos veterinarios por mes, sin IGV">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#E3E3E3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)} mil`} tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(value) => [formatPen(Number(value)), "Monto sin IGV"]} labelFormatter={(_label, payload) => payload?.[0]?.payload?.full ?? ""} />
        <Bar dataKey="amount" fill="#D01F29" radius={[3, 3, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
