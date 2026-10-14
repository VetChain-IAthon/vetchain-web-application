"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatNumber, formatPen } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { Pending, PendingTile, StatTile, Status, Warnings } from "./report-ui";

type Filter = "all" | "out" | "in";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["out", "Sin saldo"], ["in", "Con saldo"]];

export function StockReportPage() {
  const query = useQuery(() => api.GET("/api/v1/reports/stock"), [], "No se pudo cargar el reporte de stock.");
  const sales = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar los pedidos de 12 meses.");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const data = query.data;
  const demand = new Map((sales.data?.products ?? []).map((p) => [p.code, p.amount]));
  const items = (data?.items ?? []).map((item) => ({ ...item, amount12m: demand.get(item.product_code) ?? 0 }));
  const outOfStock = items.filter((item) => item.balance <= 0);
  const outWithDemand = outOfStock.filter((item) => item.amount12m > 0).sort((a, b) => b.amount12m - a.amount12m);
  const text = search.trim().toLowerCase();
  const shown = items
    .filter((item) => filter === "all" || (filter === "out" ? item.balance <= 0 : item.balance > 0))
    .filter((item) => !text || (item.product_name ?? "").toLowerCase().includes(text) || item.product_code.toLowerCase().includes(text))
    .sort((a, b) => b.amount12m - a.amount12m);

  return <div className="space-y-5">
    <PageHeader title="Stock" subtitle="Saldo por producto al último cierre del kardex, cruzado con los pedidos de 12 meses" origin="real" />
    <Status loading={query.loading} error={query.error} reload={query.reload} />
    {data && <>
      <p className="text-sm text-ink-muted">Último cierre del kardex: {formatDate(data.stock_as_of)} · pedidos de 12 meses hasta {formatDate(data.period.data_as_of)}</p>
      <Warnings codes={data.warnings} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Productos con saldo" value={formatInt(items.length - outOfStock.length)} detail={`De ${formatInt(items.length)} productos en el kardex`} origin="real" />
        <StatTile label="Sin saldo y con pedidos" value={formatInt(outWithDemand.length)} origin="real" tone={outWithDemand.length ? "bad" : "muted"}
          detail={outWithDemand.length ? `Tuvieron ${formatPen(outWithDemand.reduce((s, i) => s + i.amount12m, 0))} en pedidos en 12 meses` : "Ningún quiebre de stock"} />
        <PendingTile label="Valor del stock" kind="data" reason="Faltan los costos de compra" />
        <PendingTile label="Vence en 90 días" kind="data" reason="Falta el archivo de lotes" />
      </div>

      {outWithDemand.length > 0 && <Card>
        <div className="mb-1 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Quiebres: sin saldo pero con pedidos</h2><OriginBadge origin="real" /></div>
        <p className="mb-4 text-[13px] text-ink-muted">Conviene revisarlos en Planificación de importación antes de que los clientes los pidan a otro proveedor</p>
        <Table><THead><TR><TH>Producto</TH><TH numeric>Saldo</TH><TH numeric>Pedidos en 12 meses</TH></TR></THead>
          <TBody>{outWithDemand.slice(0, 8).map((item) => <TR key={item.product_code}>
            <TD>{item.product_name ?? item.product_code}<span className="block text-xs text-ink-muted">{item.product_code}</span></TD>
            <TD numeric className="font-semibold text-brand-strong">{formatNumber(item.balance)}</TD><TD numeric>{formatPen(item.amount12m)}</TD></TR>)}</TBody></Table>
      </Card>}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Saldo por producto</h2><p className="text-[13px] text-ink-muted">Ordenado por monto de pedidos de 12 meses</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex w-72 items-center"><span className="sr-only">Buscar producto</span>
              <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o código" className="pl-9" maxLength={100} /></label>
            <div role="group" aria-label="Filtrar por saldo" className="flex gap-1 rounded border border-line bg-surface p-1">
              {FILTERS.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                className={cn("rounded-sm px-3 py-1.5 text-sm font-semibold", filter === value ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas")}>{label}</button>)}
            </div>
          </div>
        </div>
        {shown.length ? <Table><THead><TR><TH>Producto</TH><TH numeric>Saldo por confirmar</TH><TH numeric>Pedidos en 12 meses</TH><TH>Estado</TH></TR></THead>
          <TBody>{shown.map((item) => <TR key={item.product_code}>
            <TD>{item.product_name ?? item.product_code}<span className="block text-xs text-ink-muted">{item.product_code}</span></TD>
            <TD numeric>{formatNumber(item.balance, 0)}</TD><TD numeric>{item.amount12m ? formatPen(item.amount12m) : "—"}</TD>
            <TD>{item.balance <= 0
              ? <span className="rounded-xs bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger-fg">{item.amount12m ? "Quiebre" : "Sin saldo"}</span>
              : item.amount12m ? <span className="rounded-xs bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok-fg">Con saldo</span>
              : <span className="rounded-xs bg-neutral-bg px-2 py-0.5 text-xs font-semibold text-neutral-fg">Sin pedidos</span>}</TD></TR>)}</TBody></Table>
          : <p className="py-6 text-center text-sm text-ink-muted">Ningún producto coincide con la búsqueda.</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Pending kind="data" title="Lotes por vencer y a quién ofrecerlos">
          Lotes que vencen en los próximos 90 días y los clientes que compran ese producto, para ofrecerlos sin bajar del margen mínimo.
          Falta que Mederi entregue el archivo de lotes con sus fechas de vencimiento.
        </Pending>
        <Pending kind="model" title="Cobertura y sobrestock">
          Días que alcanza el saldo de cada producto al ritmo de venta esperado, para frenar importaciones de lo que sobra y adelantar lo que falta.
          Necesita el pronóstico de demanda del modelo y los costos para valorizar.
        </Pending>
      </div>
    </>}
  </div>;
}
