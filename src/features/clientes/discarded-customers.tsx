"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { Pagination } from "@/components/data/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api/client";
import { formatDate, formatInt, formatPen } from "@/lib/format";
import { DISCARD_REASONS, discardReasonLabel, type DiscardReason } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;
const FILTERS: [DiscardReason | "", string, "all" | DiscardReason][] = [
  ["", "Todos", "all"], ...DISCARD_REASONS.map((r) => [r.value, r.label, r.value] as [DiscardReason, string, DiscardReason]),
];

/** Clientes dormidos descartados: por qué, quién y cuándo. Se pueden restaurar a la lista de dormidos. */
export function DiscardedCustomers() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<DiscardReason | "">("");
  const [page, setPage] = useState(1);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: React.ReactNode } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, error, loading, reload } = useQuery(
    () => api.GET("/api/v1/customers/discarded", { params: { query: { search: search || undefined, reason: reason || undefined, page, per_page: PER_PAGE } } }),
    [search, reason, page],
    "No se pudo cargar los clientes descartados.",
  );

  // Si se restauró el último cliente de la página, vuelve a la anterior.
  useEffect(() => { if (data && data.items.length === 0 && page > 1) setPage(page - 1); }, [data, page]);

  async function restore(ruc: string, name: string) {
    setRestoring(ruc); setMessage(null);
    const { error: err, response } = await api.DELETE("/api/v1/customers/{ruc}/discard", { params: { path: { ruc } } });
    setRestoring(null);
    if (response.status !== 204) { setMessage({ ok: false, text: errorMessage(err, "No se pudo restaurar el cliente. Inténtalo de nuevo.") }); return; }
    setMessage({ ok: true, text: <><span className="font-semibold">{name}</span> volvió a la lista de clientes dormidos.</> });
    reload();
  }

  return (
    <section aria-label="Clientes descartados" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-lg font-semibold">Clientes descartados</h2>
          <OriginBadge origin="real" />
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          Clientes dormidos que ya no se gestionan porque cerraron, cambiaron de datos o dejaron de ser viables.
          {data && <> Hay {formatInt(data.discarded_count)} {data.discarded_count === 1 ? "descartado" : "descartados"}, del más reciente al más antiguo.</>}
          {" "}Si alguno vuelve a operar, restáuralo.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex w-[360px] items-center">
          <span className="sr-only">Buscar cliente descartado</span>
          <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nombre o departamento" className="pl-9" maxLength={100} />
        </label>
        <div role="group" aria-label="Motivo de descarte" className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label, key]) => (
            <button key={value} type="button" aria-pressed={reason === value} onClick={() => { setReason(value); setPage(1); }}
              className={cn("h-10 rounded-full border px-3.5 text-sm font-semibold",
                reason === value ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink hover:bg-canvas")}>
              {label}{data ? ` (${formatInt(data.reason_counts[key])})` : ""}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div role="status" className={cn("flex items-center justify-between gap-3 rounded border px-4 py-3 text-sm",
          message.ok ? "border-ok-fg/20 bg-ok-bg" : "border-brand-softBorder bg-brand-soft")}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Cerrar aviso" className="px-1 text-ink-muted hover:text-ink">×</button>
        </div>
      )}

      {error ? (
        <Notice className="flex items-center justify-between gap-4">
          <span>{error.message} Revisa tu conexión e inténtalo de nuevo.</span>
          <Button variant="outline" onClick={reload}>Reintentar</Button>
        </Notice>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando clientes descartados…</p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          {search || reason ? "Ningún cliente descartado coincide con la búsqueda." : "Aún no hay clientes descartados. Puedes descartarlos desde «Clientes dormidos»."}
        </p>
      ) : (
        <div className={cn(loading && "opacity-60 transition-opacity")} aria-busy={loading}>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Motivo</TH>
                <TH>Descartado</TH>
                <TH numeric>Venta histórica</TH>
                <TH numeric>Última compra</TH>
                <TH><span className="sr-only">Acciones</span></TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((c) => (
                <TR key={c.ruc} className="hover:bg-canvas">
                  <TD>
                    <Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink no-underline hover:text-brand">{c.name}</Link>
                    <div className="text-xs text-ink-muted">RUC {c.ruc}{c.region ? ` · ${c.region}` : ""}</div>
                  </TD>
                  <TD className="max-w-[320px]">
                    <span className="inline-flex rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg">{discardReasonLabel(c.reason)}</span>
                    {c.note && <p className="mt-1 text-[13px] leading-snug text-ink-2">{c.note}</p>}
                  </TD>
                  <TD className="whitespace-nowrap">
                    <div className="text-ink-2">{formatDate(c.discarded_on)}</div>
                    <div className="text-xs text-ink-muted">{c.discarded_by_name ?? "Usuario eliminado"}</div>
                  </TD>
                  <TD numeric className="font-semibold">{c.order_count ? formatPen(c.lifetime_amount) : <span className="font-normal text-ink-muted">Sin pedidos</span>}</TD>
                  <TD numeric className="whitespace-nowrap text-ink-2">
                    {formatDate(c.last_order_date)}
                    {c.ordered_after_discard && <div className="mt-1"><span className="inline-flex rounded-xs bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">Volvió a pedir</span></div>}
                  </TD>
                  <TD className="text-right">
                    <Button size="sm" variant="outline" disabled={restoring === c.ruc} onClick={() => restore(c.ruc, c.name)}
                      aria-label={`Restaurar a ${c.name}`}>{restoring === c.ruc ? "Restaurando…" : "Restaurar"}</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPage={setPage} label="clientes descartados" />
        </div>
      )}
    </section>
  );
}
