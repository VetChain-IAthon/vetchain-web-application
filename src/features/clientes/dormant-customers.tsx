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
import { useAuth } from "@/lib/auth";
import { formatDate, formatInt, formatPen } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { DiscardDialog } from "./discard-dialog";

const PER_PAGE = 10;
const TYPES = [["", "Todos", "all"], ["company", "Empresas", "company"], ["person", "Personas", "person"]] as const;
type TypeFilter = (typeof TYPES)[number][0];
const TYPE_BADGE: Record<string, [string, string]> = {
  company: ["Empresa", "bg-info-bg text-info-fg"], person: ["Persona", "bg-neutral-bg text-neutral-fg"], other: ["Otro", "bg-neutral-bg text-neutral-fg"],
};

type Done = { ruc: string; name: string; undone?: boolean; error?: string };

/** Clientes sin pedidos en los últimos 12 meses, incluidos los que nunca pidieron, por venta histórica.
 *  Gerencia puede descartar cada fila (cerró, cambió de datos o ya no es viable); el descarte se deshace o se restaura después.
 *  El vendedor solo consulta: el backend rechaza el descarte con 403. */
export function DormantCustomers({ onShowDiscarded }: { onShowDiscarded?: () => void }) {
  const manager = useAuth().user?.role === "manager";
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("");
  const [page, setPage] = useState(1);
  const [discarding, setDiscarding] = useState<{ ruc: string; name: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, error, loading, reload } = useQuery(
    () => api.GET("/api/v1/customers/dormant", { params: { query: { search: search || undefined, customer_type: type || undefined, page, per_page: PER_PAGE } } }),
    [search, type, page],
    "No se pudo cargar los clientes dormidos.",
  );

  // Si se descartó el último cliente de la página, vuelve a la anterior.
  useEffect(() => { if (data && data.items.length === 0 && page > 1) setPage(page - 1); }, [data, page]);

  async function undo(target: Done) {
    const { error: err, response } = await api.DELETE("/api/v1/customers/{ruc}/discard", { params: { path: { ruc: target.ruc } } });
    if (response.status !== 204) { setDone({ ...target, error: errorMessage(err, "No se pudo deshacer. Restáuralo desde «Clientes descartados».") }); return; }
    setDone({ ...target, undone: true }); reload();
  }

  return (
    <section aria-label="Clientes dormidos" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-lg font-semibold">Clientes dormidos</h2>
          <OriginBadge origin="real" />
        </div>
        {data && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {formatInt(data.dormant_count)} de los {formatInt(data.customer_count)} clientes del maestro no compraron en los últimos 12 meses.{" "}
            {formatInt(data.ordered_before_count)} de ellos sí compraron antes y {formatInt(data.dormant_count - data.ordered_before_count)} no tienen
            pedidos en estos archivos. Ordenados por venta histórica (sin IGV, solo productos veterinarios).
            {data.discarded_count > 0 && <>{" "}No incluye {formatInt(data.discarded_count)} {data.discarded_count === 1 ? "cliente descartado" : "clientes descartados"}.</>}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex w-[360px] items-center">
          <span className="sr-only">Buscar cliente dormido</span>
          <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nombre o departamento" className="pl-9" maxLength={100} />
        </label>
        <div role="group" aria-label="Tipo de cliente" className="flex gap-2">
          {TYPES.map(([value, label, key]) => (
            <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); setPage(1); }}
              className={cn("h-10 rounded-full border px-3.5 text-sm font-semibold",
                type === value ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink hover:bg-canvas")}>
              {label}{data ? ` (${formatInt(data.type_counts[key])})` : ""}
            </button>
          ))}
        </div>
      </div>

      {done && (
        <div role="status" className={cn("flex flex-wrap items-center justify-between gap-3 rounded border px-4 py-3 text-sm",
          done.error ? "border-brand-softBorder bg-brand-soft" : "border-ok-fg/20 bg-ok-bg")}>
          <span>
            {done.error ?? (done.undone
              ? <><span className="font-semibold">{done.name}</span> volvió a la lista de dormidos.</>
              : <><span className="font-semibold">{done.name}</span> se movió a «Clientes descartados».</>)}
          </span>
          <span className="flex gap-2">
            {!done.undone && !done.error && <Button size="sm" variant="outline" onClick={() => undo(done)}>Deshacer</Button>}
            {!done.undone && onShowDiscarded && <Button size="sm" variant="ghost" onClick={onShowDiscarded}>Ver descartados</Button>}
            <button type="button" onClick={() => setDone(null)} aria-label="Cerrar aviso" className="px-1 text-ink-muted hover:text-ink">×</button>
          </span>
        </div>
      )}

      {error ? (
        <Notice className="flex items-center justify-between gap-4">
          <span>{error.message} Revisa tu conexión e inténtalo de nuevo.</span>
          <Button variant="outline" onClick={reload}>Reintentar</Button>
        </Notice>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando clientes dormidos…</p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          {search || type ? "Ningún cliente coincide con la búsqueda. Prueba con otra parte del nombre." : "Todos los clientes compraron en los últimos 12 meses."}
        </p>
      ) : (
        <div className={cn(loading && "opacity-60 transition-opacity")} aria-busy={loading}>
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Tipo</TH>
                <TH>Departamento</TH>
                <TH numeric>Pedidos</TH>
                <TH numeric>Venta histórica</TH>
                <TH numeric>Última compra</TH>
                {manager && <TH><span className="sr-only">Acciones</span></TH>}
              </TR>
            </THead>
            <TBody>
              {data.items.map((c) => {
                const [typeLabel, typeClass] = TYPE_BADGE[c.customer_type ?? "other"] ?? TYPE_BADGE.other;
                return (
                  <TR key={c.ruc} className="hover:bg-canvas">
                    <TD>
                      <Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink no-underline hover:text-brand">{c.name}</Link>
                      <div className="text-xs text-ink-muted">RUC {c.ruc}</div>
                    </TD>
                    <TD><span className={cn("inline-flex rounded-xs px-2 py-0.5 text-xs font-semibold", typeClass)}>{typeLabel}</span></TD>
                    <TD className="text-ink-2">{c.region ?? "—"}</TD>
                    <TD numeric>{c.order_count ? formatInt(c.order_count) : "—"}</TD>
                    <TD numeric className="font-semibold">{c.order_count ? formatPen(c.lifetime_amount) : <span className="font-normal text-ink-muted">Sin pedidos</span>}</TD>
                    <TD numeric className="whitespace-nowrap text-ink-2">{formatDate(c.last_order_date)}</TD>
                    {manager && <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setDone(null); setDiscarding({ ruc: c.ruc, name: c.name }); }}
                        aria-label={`Descartar a ${c.name}`}>Descartar</Button>
                    </TD>}
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination page={data.page} perPage={data.per_page} total={data.total} onPage={setPage} label="clientes dormidos" />
        </div>
      )}

      {manager && discarding && (
        <DiscardDialog customer={discarding} onClose={() => setDiscarding(null)}
          onDiscarded={() => { setDone({ ...discarding }); setDiscarding(null); reload(); }} />
      )}
    </section>
  );
}
