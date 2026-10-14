"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LevelBadge } from "@/components/data/level-badge";
import { Notice } from "@/components/data/notice";
import { Pagination } from "@/components/data/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { formatDate, formatInt, formatMonthYear, formatPen, formatPercent, twelveMonthStart } from "@/lib/format";
import { CUSTOMER_TYPE } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { DormantCustomers } from "./dormant-customers";

const PER_PAGE = 20;
const LEVELS = [["", "Todos"], ["A", "Nivel A"], ["B", "Nivel B"], ["C", "Nivel C"]] as const;
type LevelFilter = (typeof LEVELS)[number][0];
type View = "volume" | "dormant";

export function CustomerList() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LevelFilter>("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("volume");
  const views: [View, string][] = [["volume", "Clientes por volumen"], ["dormant", "Clientes dormidos"]];

  // Se busca medio segundo después de dejar de escribir, para no pedir una página por cada letra.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, error, loading, reload } = useQuery(
    () => api.GET("/api/v1/customers", { params: { query: { search: search || undefined, level: level || undefined, page, per_page: PER_PAGE } } }),
    [search, level, page],
    "No se pudo cargar la lista de clientes.",
  );

  const asOf = data?.data_as_of;
  const period = asOf ? `entre ${formatMonthYear(twelveMonthStart(asOf))} y ${formatMonthYear(asOf)}` : "de los últimos 12 meses";

  return (
    <>
      <PageHeader title={isManager ? "Clientes" : "Mis clientes"} origin="real"
        subtitle={asOf ? `Datos reales hasta el ${formatDate(asOf)} · montos sin IGV` : "Montos sin IGV"} />

      <div role="tablist" aria-label="Vista de clientes" className="flex self-start border-b border-line">
        {views.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
            className={cn("border-b-2 px-4 py-2.5 text-sm font-semibold", view === key ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-brand")}>
            {label}
          </button>
        ))}
      </div>

      {view === "dormant" ? <DormantCustomers /> : <>
      {data && !data.levels_configured && (
        <Notice tone="warn">
          Los niveles A, B y C aparecerán cuando gerencia defina los umbrales de volumen.{" "}
          {isManager && <Link href="/ajustes" className="font-semibold">Definir umbrales en Ajustes</Link>}
        </Notice>
      )}

      <section aria-label="Clientes por volumen de pedidos" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
        <div>
          <h2 className="m-0 text-lg font-semibold">{isManager ? "Clientes por volumen de pedidos" : "Mis clientes por volumen de pedidos"}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Ordenados por el monto de sus pedidos {period} (sin IGV, solo productos veterinarios). Un pedido no es una venta facturada.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative flex w-[360px] items-center">
            <span className="sr-only">Buscar cliente</span>
            <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nombre o RUC" className="pl-9" maxLength={100} />
          </label>
          <div role="group" aria-label="Filtrar por nivel" className="flex gap-1 rounded border border-line bg-surface p-1">
            {LEVELS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={level === value}
                disabled={!!value && data?.levels_configured === false}
                onClick={() => { setLevel(value); setPage(1); }}
                className={cn("rounded-sm px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                  level === value ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas")}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <Notice className="flex items-center justify-between gap-4">
            <span>{error.message} Revisa tu conexión e inténtalo de nuevo.</span>
            <Button variant="outline" onClick={reload}>Reintentar</Button>
          </Notice>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-ink-muted">Cargando clientes…</p>
        ) : data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            {search ? "Ningún cliente coincide con la búsqueda. Prueba con otra parte del nombre o del RUC." : "No hay clientes en esta cartera."}
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
                  <TH numeric>Monto 12 meses</TH>
                  <TH numeric>{isManager ? "% del total" : "% de tu venta"}</TH>
                  <TH>Nivel de volumen</TH>
                  <TH>Última compra</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map((c, i) => (
                  <TR key={c.ruc} className="hover:bg-canvas">
                    <TD>
                      <Link href={`/clientes/${c.ruc}`} className="font-semibold text-ink no-underline hover:text-brand">
                        {(data.page - 1) * data.per_page + i + 1}. {c.name}
                      </Link>
                      <div className="text-xs text-ink-muted">RUC {c.ruc}</div>
                    </TD>
                    <TD className="text-ink-2">{c.customer_type ? CUSTOMER_TYPE[c.customer_type] ?? c.customer_type : "—"}</TD>
                    <TD className="text-ink-2">{c.region ?? "—"}</TD>
                    <TD numeric>{formatInt(c.order_count_12m)}</TD>
                    <TD numeric className="font-semibold">{formatPen(c.amount_12m)}</TD>
                    <TD numeric>{formatPercent(c.share_pct)}</TD>
                    <TD><LevelBadge level={c.level} /></TD>
                    <TD className="whitespace-nowrap text-ink-2">{formatDate(c.last_order_date)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-ink-muted">Monto total de la cartera filtrada</span>
              <span className="font-semibold tabular-nums">{formatPen(data.total_amount_12m)}</span>
            </div>
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPage={setPage} label="clientes" />
          </div>
        )}
      </section>
      </>}
    </>
  );
}
