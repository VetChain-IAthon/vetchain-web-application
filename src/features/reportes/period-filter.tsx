"use client";

import { Button } from "@/components/ui/button";

/** Meses elegidos como «AAAA-MM». null = período por defecto del backend (12 meses hasta el último pedido). */
export type MonthRange = { from: string; to: string } | null;

// Los archivos de Defontana traen pedidos desde 2018.
const FIRST_YEAR = 2018;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SELECT = "h-10 rounded border border-line-strong bg-surface px-2 text-sm text-ink focus:border-brand focus:outline focus:outline-2 focus:outline-brand";

/** Parámetros `from` / `to` del backend: primer día del mes inicial y último día del mes final. */
export function rangeQuery(range: MonthRange): { from?: string; to?: string } {
  if (!range) return {};
  const [year, month] = range.to.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${range.from}-01`, to: `${range.to}-${String(lastDay).padStart(2, "0")}` };
}

function MonthYear({ label, value, maxYear, onChange }: { label: string; value: string; maxYear: number; onChange: (value: string) => void }) {
  const [year, month] = value.split("-");
  const years = Array.from({ length: maxYear - FIRST_YEAR + 1 }, (_, i) => String(maxYear - i));
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <select aria-label={`${label}: mes`} className={SELECT} value={month} onChange={(e) => onChange(`${year}-${e.target.value}`)}>
        {MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>)}
      </select>
      <select aria-label={`${label}: año`} className={SELECT} value={year} onChange={(e) => onChange(`${e.target.value}-${month}`)}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </span>
  );
}

/** Filtro por mes y año. Sin elegir nada muestra el período que devolvió el backend. */
export function PeriodFilter({ value, periodFrom, periodTo, asOf, onChange }: {
  value: MonthRange; periodFrom?: string | null; periodTo?: string | null; asOf?: string | null; onChange: (range: MonthRange) => void;
}) {
  const from = value?.from ?? periodFrom?.slice(0, 7);
  const to = value?.to ?? periodTo?.slice(0, 7);
  if (!from || !to) return null;
  const maxYear = Number((asOf ?? to).slice(0, 4));
  // Si el inicio queda después del fin, se mueve el otro extremo para que el rango siga siendo válido.
  const setFrom = (next: string) => onChange({ from: next, to: next > to ? next : to });
  const setTo = (next: string) => onChange({ from: next < from ? next : from, to: next });
  return (
    <div role="group" aria-label="Período del reporte" className="flex flex-wrap items-center gap-3">
      <MonthYear label="Desde" value={from} maxYear={maxYear} onChange={setFrom} />
      <MonthYear label="Hasta" value={to} maxYear={maxYear} onChange={setTo} />
      {value && <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>Últimos 12 meses</Button>}
    </div>
  );
}
