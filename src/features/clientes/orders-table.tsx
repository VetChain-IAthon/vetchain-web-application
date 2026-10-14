"use client";

import { useState } from "react";
import { Pagination } from "@/components/data/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatPen } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;

export function OrdersTable({ ruc }: { ruc: string }) {
  const [page, setPage] = useState(1);
  const { data, error } = useQuery(
    () => api.GET("/api/v1/customers/{ruc}/orders", { params: { path: { ruc }, query: { page, per_page: PER_PAGE } } }),
    [ruc, page], "No se pudo cargar el historial de pedidos.",
  );
  return (
    <section aria-labelledby="pedidos-titulo" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
      <div>
        <h2 id="pedidos-titulo" className="m-0 text-base font-semibold">Historial de pedidos</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Todos los pedidos, incluidos los cancelados. Los nombres de los estados están por confirmar con Mederi.
        </p>
      </div>
      {error ? <p className="m-0 text-sm text-brand-strong">{error.message}</p>
        : !data ? <p className="m-0 text-sm text-ink-muted">Cargando pedidos…</p>
        : data.total === 0 ? <p className="m-0 text-sm text-ink-muted">Este cliente no tiene pedidos.</p>
        : (
          <>
            <Table>
              <THead>
                <TR><TH>Pedido</TH><TH>Fecha</TH><TH>Estado</TH><TH>Vendedor</TH><TH numeric>Monto sin IGV</TH><TH numeric>Total con IGV</TH></TR>
              </THead>
              <TBody>
                {data.items.map((o) => (
                  <TR key={o.order_no} className={cn(o.status_code === "C" && "text-ink-muted")}>
                    <TD className="font-semibold">{o.order_no}</TD>
                    <TD className="whitespace-nowrap">{formatDate(o.order_date)}</TD>
                    <TD>{orderStatus(o.status_code)}</TD>
                    <TD>{o.salesperson_code}</TD>
                    <TD numeric className={cn(o.status_code === "C" && "line-through")}>{formatPen(o.amount)}</TD>
                    <TD numeric>{formatPen(o.total_with_tax)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPage={setPage} label="pedidos" />
          </>
        )}
    </section>
  );
}
