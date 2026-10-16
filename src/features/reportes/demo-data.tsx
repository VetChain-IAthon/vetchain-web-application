/** Dibuja los bloques simulados que guarda el backend (`simulated_sections`). Todo lleva la etiqueta «Simulado». */
import type { SimBlock, SimFormat } from "@/lib/demo";
import { formatInt, formatPen } from "@/lib/format";

export function formatSim(value: number | string, format: SimFormat): string {
  if (typeof value === "string" || format === "text") return String(value);
  if (format === "pen") return formatPen(value);
  if (format === "pct") return `${value} %`;
  if (format === "days") return `${formatInt(value)} días`;
  return formatInt(value);
}

export function SimBlockView({ block }: { block: SimBlock }) {
  if (block.type === "bars") {
    const max = Math.max(...block.items.map((i) => i.value));
    return <ul className="flex flex-col gap-3">
      {block.items.map((item) => <li key={item.label}>
        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{item.label}</span>
          <span className="tabular-nums text-ink-2">{formatPen(item.value)}{item.note ? ` · ${item.note}` : ""}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-canvas" aria-hidden><div className="h-full rounded-full bg-brand" style={{ width: `${(item.value / max) * 100}%` }} /></div>
      </li>)}
    </ul>;
  }
  if (block.type === "table") {
    return <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="border-b border-line text-left text-xs text-ink-muted">{block.head.map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{block.rows.map((r) => <tr key={r.join()} className="border-b border-line last:border-0">{r.map((c, i) => <td key={i} className="py-2 pr-4 text-ink-2">{c}</td>)}</tr>)}</tbody>
    </table></div>;
  }
  if (block.type === "stats") {
    return <div className="grid gap-4 sm:grid-cols-3">{block.items.map((s) => <div key={s.label} className="rounded bg-canvas p-4">
      <p className="text-sm text-ink-muted">{s.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{formatSim(s.value, s.format)}</p></div>)}</div>;
  }
  if (block.type === "list") {
    return <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">{block.items.map((i) => <li key={i}>{i}</li>)}</ol>;
  }
  return <p className="text-[15px] leading-relaxed text-ink-2">{block.text}</p>;
}
