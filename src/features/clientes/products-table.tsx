"use client";

import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatNumber, formatPen } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

export function ProductsTable({ ruc }: { ruc: string }) {
  const { data, error } = useQuery(() => api.GET("/api/v1/customers/{ruc}/products", { params: { path: { ruc } } }), [ruc],
    "No se pudieron cargar los productos.");
  return (
    <section aria-labelledby="productos-titulo" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
      <div>
        <h2 id="productos-titulo" className="m-0 text-base font-semibold">Qué compra</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Productos veterinarios de todo el historial, de mayor a menor monto. El monto no incluye las unidades bonificadas.</p>
      </div>
      {error ? <p className="m-0 text-sm text-brand-strong">{error.message}</p>
        : !data ? <p className="m-0 text-sm text-ink-muted">Cargando productos…</p>
        : data.items.length === 0 ? <p className="m-0 text-sm text-ink-muted">Este cliente no tiene pedidos de productos veterinarios.</p>
        : (
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <THead>
                <TR><TH>Producto</TH><TH numeric>Pedidos</TH><TH numeric>Unidades</TH><TH numeric>Monto</TH><TH>Última compra</TH></TR>
              </THead>
              <TBody>
                {data.items.map((p) => (
                  <TR key={p.product_code}>
                    <TD><div className="font-semibold">{p.product_name}</div><div className="text-xs text-ink-muted">{p.product_code}</div></TD>
                    <TD numeric>{formatInt(p.times_ordered)}</TD>
                    <TD numeric>{formatNumber(p.total_quantity, 2)}</TD>
                    <TD numeric className="font-semibold">{formatPen(p.amount)}</TD>
                    <TD className="whitespace-nowrap text-ink-2">{formatDate(p.last_order_date)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
    </section>
  );
}
