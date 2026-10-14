"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { components } from "@/lib/api/schema";
import { formatMonthYear, formatPen } from "@/lib/format";

type Month = components["schemas"]["MonthlyAmountOut"];

export function MonthlyChart({ items }: { items: Month[] }) {
  const data = items.map((item) => ({ label: formatMonthYear(item.month).slice(0, 3), amount: item.amount, full: formatMonthYear(item.month) }));
  if (!data.length) return <p className="py-10 text-sm text-ink-muted">No hay pedidos en este período.</p>;
  return <div className="h-64 w-full" role="img" aria-label="Monto de pedidos veterinarios por mes, sin IGV">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#E3E3E3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)} mil`} tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(value) => formatPen(Number(value))} labelFormatter={(_label, payload) => payload?.[0]?.payload?.full ?? ""} />
        <Bar dataKey="amount" fill="#D01F29" radius={[3, 3, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
