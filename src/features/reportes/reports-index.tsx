"use client";

import { ArrowRight, Check, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatPen, twelveMonthStart } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { CustomerPicker, type PickedCustomer } from "./customer-picker";
import { compare, Pending, PendingTile, StatTile, Status, warningText, yearBefore } from "./report-ui";

/** Estructura tomada de design/prototipo/Main-nsyj.dc.html. La ficha es el reporte 1; aquí se listan del 2 al 7. */
const REPORTS: { n: number; code: string; href: string; title: string; question: string }[] = [
  { n: 2, code: "kpis", href: "/reportes/kpis", title: "Indicadores clave (KPIs)", question: "¿Cómo vamos frente a las metas?" },
  { n: 3, code: "sales", href: "/reportes/ventas", title: "Ventas y rentabilidad", question: "¿Qué vendemos, a qué precio y con cuánta ganancia?" },
  { n: 4, code: "customers", href: "/reportes/clientes", title: "Clientes: retención y reactivación", question: "¿Quién deja de comprar y a quién recuperar?" },
  { n: 5, code: "stock", href: "/reportes/stock", title: "Stock, vencimientos y merma", question: "¿Qué podemos perder y a quién ofrecerlo?" },
  { n: 6, code: "receivables", href: "/reportes/cobranza", title: "Cartera y cobranza", question: "¿Quién nos debe y a quién darle crédito?" },
  { n: 7, code: "salespeople", href: "/reportes/vendedores", title: "Vendedores y seguimiento", question: "¿Qué pasa con cada alerta, de la llamada al pedido?" },
];

/** Qué trae la ficha; `pending` dice qué falta para incluir ese punto. */
const BRIEF_INCLUDES: { text: string; pending?: "model" | "ai" | "data" }[] = [
  { text: "Compras y precios por producto, con su evolución mensual" },
  { text: "Descuento en factura y descuento real frente al precio de lista" },
  { text: "Ganancia estimada y proyección a 1, 6 o 12 meses", pending: "model" },
  { text: "Ofertas según stock y lotes por vencer", pending: "data" },
  { text: "Guion de preguntas para la reunión", pending: "ai" },
  { text: "PDF para el cliente, correo y WhatsApp" },
];

const PENDING_LABEL = { model: "Pendiente del modelo de predicción y de costos", ai: "Pendiente de IA (Gemini)", data: "Faltan datos de lotes" } as const;

export function ReportsIndexPage() {
  const catalog = useQuery(() => api.GET("/api/v1/reports"), [], "No se pudo cargar el catálogo de reportes.");
  const sales = useQuery(() => api.GET("/api/v1/reports/sales"), [], "No se pudo cargar el pulso del negocio.");
  const customers = useQuery(() => api.GET("/api/v1/reports/customers"), [], "No se pudo cargar los clientes.");
  const period = sales.data?.period;
  const before = period?.from_date && period.to_date ? yearBefore(period.from_date, period.to_date) : null;
  const prevSales = useQuery(() => before ? api.GET("/api/v1/reports/sales", { params: { query: before } }) : Promise.resolve({ data: null }), [before?.from, before?.to], "");
  const prevCustomers = useQuery(() => before ? api.GET("/api/v1/reports/customers", { params: { query: before } }) : Promise.resolve({ data: null }), [before?.from, before?.to], "");

  const salesDelta = compare(sales.data?.amount, prevSales.data?.amount);
  const active = customers.data?.active_count;
  const prevActive = prevCustomers.data?.active_count;
  const activeDetail = active != null && prevActive != null
    ? active === prevActive ? `Igual que el año anterior (${formatInt(prevActive)})`
      : `${formatInt(Math.abs(active - prevActive))} ${active < prevActive ? "menos" : "más"} que el año anterior (${formatInt(prevActive)})`
    : undefined;
  const warnings = new Map((catalog.data?.items ?? []).map((item) => [item.code, item]));

  return <div className="space-y-8">
    <PageHeader
      title="Reportes"
      subtitle={period ? `Inteligencia comercial sobre el historial de Mederi · datos hasta el ${formatDate(period.data_as_of)} · montos sin IGV` : "Inteligencia comercial sobre el historial de Mederi"}
      badge={<span className="inline-flex items-center gap-1.5 rounded-xs bg-brand-soft px-2 py-0.5 text-[13px] font-semibold text-brand" title="Las funciones con IA están pendientes de configurar Gemini">
        <Sparkles size={14} aria-hidden />Con IA</span>}
    />

    <CustomerBriefCard asOf={period?.data_as_of ?? null} />
    <AskYourDataCard />

    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pulso del negocio</h2>
      <Status loading={sales.loading && !sales.data} error={sales.error} reload={sales.reload} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatTile label="Venta últimos 12 meses" value={formatPen(sales.data?.amount)} detail={salesDelta.detail} tone={salesDelta.tone} origin="real" />
        <StatTile label="Clientes activos" value={formatInt(active)} origin="real" detail={activeDetail}
          tone={active != null && prevActive != null && active < prevActive ? "warn" : "muted"} />
        <PendingTile label="Indicadores en meta" kind="data" reason="Gerencia aún no definió las metas" />
        <PendingTile label="Por vencer en 90 días" kind="data" reason="Falta el archivo de lotes" />
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Reportes de negocio</h2>
        <p className="text-sm text-ink-muted">Todos se descargan en PDF y se envían por correo o WhatsApp</p>
      </div>
      <Status loading={catalog.loading && !catalog.data} error={catalog.error} reload={catalog.reload} />
      <div className="grid gap-4 lg:grid-cols-2">
        {REPORTS.map((report) => {
          const info = warnings.get(report.code);
          const partial = !!info?.warning || report.code === "kpis";
          return <Link key={report.code} href={report.href} className="group flex flex-col rounded-lg border border-line bg-surface p-6 no-underline transition-colors hover:border-brand">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">{report.n}</span>
              <span className={cn("rounded-xs px-2 py-0.5 text-xs font-semibold", partial ? "bg-warn-bg text-warn-fg" : "bg-ok-bg text-ok-fg")}>{partial ? "Parcial" : "Datos reales"}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">{report.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{report.question}</p>
            <div className="mt-4 flex flex-col gap-2 rounded bg-canvas p-4 text-sm text-ink-2">
              {info?.warning && <p>{warningText[info.warning] ?? info.warning}</p>}
              <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><Sparkles size={14} aria-hidden />Resumen automático pendiente de IA (Gemini)</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brand">Abrir reporte <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link>;
        })}
      </div>
    </section>

    <Pending kind="feature" title="Envíos programados">
      Los reportes llegan solos a quien los necesita, sin entrar a VetChain (por ejemplo, el resumen semanal de gerencia cada lunes por WhatsApp o correo).
    </Pending>
  </div>;
}

/** Reporte principal: elegir cliente, período y proyección, y abrir su ficha para reunión. */
function CustomerBriefCard({ asOf }: { asOf: string | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<PickedCustomer | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [projection, setProjection] = useState("month");
  useEffect(() => { if (asOf) { setTo((v) => v || asOf); setFrom((v) => v || twelveMonthStart(asOf)); } }, [asOf]);
  const open = () => {
    if (!picked) return;
    const query = new URLSearchParams({ ruc: picked.ruc, projection, ...(from && { from }), ...(to && { to }) });
    router.push(`/reportes/ficha?${query.toString()}`);
  };

  return <Card id="ficha" className="scroll-mt-6 grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">Reporte principal · antes de reunirte con un cliente</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Ficha de cliente para reunión</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">Cuánto le vendiste, a qué precio, si hubo descuentos, cuánto ganaste, cuánto proyectamos venderle y qué ofrecerle según el stock y los lotes por vencer. Lista para imprimir o enviar.</p>
      </div>
      <div><label htmlFor="brief-customer" className="mb-1.5 block text-sm font-semibold">Cliente</label>
        <CustomerPicker id="brief-customer" value={picked} onPick={setPicked} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Ventas desde<Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-11" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Hasta<Input type="date" value={to} max={asOf ?? undefined} onChange={(e) => setTo(e.target.value)} className="h-11" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Proyectar
          <select value={projection} onChange={(e) => setProjection(e.target.value)} className="h-11 rounded border border-line-strong bg-surface px-3 text-sm text-ink">
            <option value="month">Próximo mes</option><option value="semester">Próximo semestre</option><option value="year">Próximo año</option>
          </select></label>
      </div>
      <div><Button className="h-11 px-6" disabled={!picked} onClick={open}>Generar ficha <ArrowRight size={16} aria-hidden /></Button></div>
    </div>

    <aside className="rounded-lg bg-canvas p-6">
      <h3 className="font-semibold">Qué trae la ficha</h3>
      <ul className="mt-4 flex flex-col gap-4">
        {BRIEF_INCLUDES.map((item) => <li key={item.text} className="flex gap-3 text-[15px] leading-snug text-ink-2">
          {item.pending ? <Clock size={18} className="mt-0.5 flex-none text-ink-muted" aria-hidden /> : <Check size={18} className="mt-0.5 flex-none text-ok-fg" aria-hidden />}
          <span>{item.text}{item.pending && <span className="mt-1 block text-xs font-semibold text-ink-muted">{PENDING_LABEL[item.pending]}</span>}</span>
        </li>)}
      </ul>
    </aside>
  </Card>;
}

/** Preguntas en lenguaje natural: la base queda lista y se activa cuando se configure Gemini. */
function AskYourDataCard() {
  return <Card className="flex flex-col gap-4 p-8">
    <div>
      <h2 className="text-lg font-semibold">Pregúntale a tus datos</h2>
      <p className="mt-1 text-sm text-ink-muted">Escribe como le preguntarías a un analista. La respuesta dice de qué datos sale.</p>
    </div>
    <form className="flex gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="relative flex flex-1 items-center"><span className="sr-only">Pregunta</span>
        <Sparkles size={16} className="absolute left-3 text-ink-muted" aria-hidden />
        <Input disabled placeholder="Ej.: ¿cuánto le vendimos a Diservet este año?" className="h-12 pl-9" /></label>
      <Button type="submit" disabled className="h-12 bg-ink px-6 hover:bg-ink">Preguntar</Button>
    </form>
    <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted"><Sparkles size={14} aria-hidden />
      Pendiente de IA generativa (Gemini): se activará cuando se configure la clave de la API. Solo se le enviarán cifras agregadas, nunca nombres ni RUC.</p>
  </Card>;
}
