"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatPen } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { compare, Pending, PendingTile, StatTile, Status, warningText, yearBefore } from "./report-ui";

const REPORTS: { code: string; href: string; title: string; question: string }[] = [
  { code: "kpis", href: "/reportes/kpis", title: "Indicadores clave", question: "¿Cómo va el negocio frente al año anterior?" },
  { code: "sales", href: "/reportes/ventas", title: "Pedidos y productos", question: "¿Qué se pide, cuánto y qué productos mueven la venta?" },
  { code: "customers", href: "/reportes/clientes", title: "Clientes: retención y reactivación", question: "¿Quién compra, quién se va y a quién recuperar?" },
  { code: "stock", href: "/reportes/stock", title: "Stock", question: "¿Qué hay en almacén y qué falta con pedidos?" },
  { code: "receivables", href: "/reportes/cobranza", title: "Cartera y cobranza", question: "¿Quién nos debe y a quién darle crédito?" },
  { code: "salespeople", href: "/reportes/vendedores", title: "Vendedores y seguimiento", question: "¿Cuánto pide cada cartera y qué pasa con los clientes en riesgo?" },
];

export function ReportsIndexPage() {
  const catalog = useQuery(() => api.GET("/api/v1/reports"), [], "No se pudo cargar el catálogo de reportes.");
  const sales = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar el pulso del negocio.");
  const customers = useQuery(() => api.GET("/api/v1/reports/customers"), [], "No se pudo cargar los clientes.");
  const period = sales.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const prevSales = useQuery(() => before ? api.GET("/api/v1/reports/sales", { params: { query: before } }) : Promise.resolve({ data: null }), [before?.from, before?.to], "");
  const prevCustomers = useQuery(() => before ? api.GET("/api/v1/reports/customers", { params: { query: before } }) : Promise.resolve({ data: null }), [before?.from, before?.to], "");
  const atRisk = useQuery(() => api.GET("/api/v1/customers/at-risk", { params: { query: { per_page: 1 } } }), [], "");

  const salesDelta = compare(sales.data?.amount, prevSales.data?.amount);
  const activeDelta = compare(customers.data?.active_count, prevCustomers.data?.active_count, "el año anterior");
  const warnings = new Map((catalog.data?.items ?? []).map((item) => [item.code, item]));

  return <div className="space-y-6">
    <PageHeader title="Reportes" subtitle={period ? `Inteligencia comercial sobre el historial de Mederi · datos hasta el ${formatDate(period.data_as_of)} · montos sin IGV` : "Inteligencia comercial sobre el historial de Mederi"} />

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pulso del negocio</h2>
      <Status loading={sales.loading && !sales.data} error={sales.error} reload={sales.reload} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Monto de pedidos, 12 meses" value={formatPen(sales.data?.amount)} detail={salesDelta.detail} tone={salesDelta.tone} origin="real" />
        <StatTile label="Clientes con pedido" value={formatInt(customers.data?.active_count)} origin="real" tone={activeDelta.tone}
          detail={prevCustomers.data?.active_count != null ? `${formatInt(prevCustomers.data.active_count)} el año anterior` : undefined} />
        <StatTile label="Clientes en riesgo" value={formatInt(atRisk.data?.total)} origin="estimated" tone="warn" detail="Para llamar esta semana · ver Panel" />
        <PendingTile label="Por vencer en 90 días" kind="data" reason="Falta el archivo de lotes" />
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      <CustomerBriefCard />
      <Pending kind="ai" title="Pregúntale a tus datos">
        Escribe como le preguntarías a un analista («¿qué clientes dejaron de comprar shampoo este año?») y la respuesta dirá de qué datos sale.
      </Pending>
    </div>

    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Reportes de negocio</h2><p className="text-[13px] text-ink-muted">Cada uno responde una pregunta y dice qué datos le faltan</p></div>
      <Status loading={catalog.loading && !catalog.data} error={catalog.error} reload={catalog.reload} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const info = warnings.get(report.code);
          return <Link key={report.code} href={report.href} className="flex flex-col rounded-lg border border-line bg-surface p-6 no-underline transition-colors hover:border-brand">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-ink">{report.title}</h3>
              {(info?.data_origin === "real" || report.code === "kpis") && <OriginBadge origin="real" />}</div>
            <p className="mt-2 text-sm text-ink-2">{report.question}</p>
            {info?.warning && <p className="mt-3 text-[13px] text-ink-muted">{warningText[info.warning] ?? info.warning}</p>}
            <span className="mt-auto pt-5 text-sm font-semibold text-brand">Abrir reporte →</span>
          </Link>;
        })}
      </div>
    </section>

    <Pending kind="feature" title="Envíos programados">
      Los reportes llegarán solos a quien los necesita (por ejemplo, el resumen semanal de gerencia cada lunes por WhatsApp o correo), sin entrar a VetChain.
    </Pending>
  </div>;
}

/** Buscar un cliente y abrir su ficha antes de una reunión. */
function CustomerBriefCard() {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 350); return () => clearTimeout(t); }, [text]);
  const results = useQuery(() => search ? api.GET("/api/v1/customers", { params: { query: { search, per_page: 5 } } }) : Promise.resolve({ data: null }),
    [search], "No se pudo buscar clientes.");
  return <Card className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Ficha de cliente para reunión</h2><OriginBadge origin="real" /></div>
    <p className="text-sm text-ink-muted">Cuánto te pidió, qué productos compra, cada cuánto y sus condiciones comerciales. La proyección de lo que comprará llegará con el modelo de predicción.</p>
    <label className="relative flex items-center"><span className="sr-only">Buscar cliente</span>
      <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar cliente por nombre o RUC" className="pl-9" maxLength={100} /></label>
    {search && (results.error ? <p className="text-sm text-brand-strong">{results.error.message}</p>
      : !results.data ? <p className="text-sm text-ink-muted">Buscando…</p>
      : results.data.items.length ? <ul className="divide-y divide-line rounded border border-line">
        {results.data.items.map((c) => <li key={c.ruc}><Link href={`/clientes/${c.ruc}`} className="flex justify-between gap-3 px-3 py-2 text-sm text-ink no-underline hover:bg-canvas">
          <span className="font-semibold">{c.name}</span><span className="text-ink-muted">Abrir ficha →</span></Link></li>)}
      </ul> : <p className="text-sm text-ink-muted">No se encontraron clientes.</p>)}
  </Card>;
}
