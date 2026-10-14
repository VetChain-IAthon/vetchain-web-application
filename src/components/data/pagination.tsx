"use client";

import { ChevronFirst, ChevronLast } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/format";

/** Paginación en servidor: «1–20 de 1 330», primera / anterior / siguiente / última y un campo para ir a una página. */
export function Pagination({ page, perPage, total, onPage, label = "resultados" }: {
  page: number; perPage: number; total: number; onPage: (page: number) => void; label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  const go = () => {
    const target = Math.min(pages, Math.max(1, Math.round(Number(draft))));
    if (!Number.isFinite(target) || draft.trim() === "") { setDraft(String(page)); return; }
    setDraft(String(target));
    if (target !== page) onPage(target);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-sm text-ink-muted">
      <span>{formatInt(from)}–{formatInt(to)} de {formatInt(total)} {label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="px-2" disabled={page <= 1} onClick={() => onPage(1)} aria-label="Primera página" title="Primera página">
          <ChevronFirst size={16} aria-hidden /></Button>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">Anterior</Button>
        <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); go(); }}>
          <label htmlFor="pagination-page">Página</label>
          <input id="pagination-page" type="number" inputMode="numeric" min={1} max={pages} value={draft} disabled={pages <= 1}
            onChange={(e) => setDraft(e.target.value)} onBlur={go} aria-label={`Ir a la página (1 a ${pages})`}
            className="h-8 w-16 rounded-sm border border-line-strong bg-surface px-2 text-center text-sm tabular-nums text-ink [appearance:textfield] focus:border-brand focus:outline focus:outline-2 focus:outline-brand disabled:bg-canvas [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span>de {formatInt(pages)}</span>
        </form>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">Siguiente</Button>
        <Button variant="outline" size="sm" className="px-2" disabled={page >= pages} onClick={() => onPage(pages)} aria-label="Última página" title="Última página">
          <ChevronLast size={16} aria-hidden /></Button>
      </div>
    </div>
  );
}
