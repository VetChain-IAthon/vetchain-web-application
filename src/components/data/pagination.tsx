import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/format";

/** Paginación en servidor: «1–20 de 1 330» y botones Anterior / Siguiente. */
export function Pagination({ page, perPage, total, onPage, label = "resultados" }: {
  page: number; perPage: number; total: number; onPage: (page: number) => void; label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="flex items-center justify-between gap-4 pt-3 text-sm text-ink-muted">
      <span>{formatInt(from)}–{formatInt(to)} de {formatInt(total)} {label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">Anterior</Button>
        <span>Página {page} de {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">Siguiente</Button>
      </div>
    </div>
  );
}
