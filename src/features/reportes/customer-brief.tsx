"use client";

import { ArrowLeft, Download, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OriginBadge } from "@/components/data/origin-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { formatDate, formatInt, formatMonthYear, formatNumber, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { briefSummaryText, downloadBriefPdf } from "./brief-exports";
import { CustomerPicker, type PickedCustomer } from "./customer-picker";
import { ShareDialog, type ShareChannel } from "./share-dialog";
import { EmailComposer } from "./email-composer";
import { Pending, PendingTile, StatTile, Status } from "./report-ui";

export type Brief = components["schemas"]["CustomerBriefOut"];
type Projection = "month" | "semester" | "year";
export type BriefVersion = "internal" | "customer";

export const PROJECTION_LABEL: Record<Projection, string> = { month: "Próximo mes", semester: "Próximo semestre", year: "Próximo año" };
const TOP_PRODUCTS = 6;

/** Ficha de cliente para reunión, en versión interna o para el cliente. Estructura de design/prototipo/Ficha-icvr.dc.html.
 *  Todo lo que necesita el modelo de predicción, Gemini, costos, lotes o cobros se muestra como pendiente. */
export function CustomerBriefPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ruc = params.get("ruc");
  const from = params.get("from");
  const to = params.get("to");
  const projection = (["month", "semester", "year"].includes(params.get("projection") ?? "") ? params.get("projection") : "month") as Projection;
  const version: BriefVersion = params.get("version") === "customer" ? "customer" : "internal";
  const [picked, setPicked] = useState<PickedCustomer | null>(null);
  const [channel, setChannel] = useState<ShareChannel | null>(null);

  const brief = useQuery(
    () => ruc ? api.GET("/api/v1/customers/{ruc}/brief", { params: { path: { ruc }, query: { from: from || undefined, to: to || undefined, projection } } }) : Promise.resolve({ data: null }),
    [ruc, from, to, projection], "No se pudo armar la ficha del cliente.",
  );
  const data = brief.data;
  const customer = picked ?? (data && data.ruc === ruc ? { ruc: data.ruc, name: data.name } : null);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader
      title="Ficha de cliente para reunión"
      subtitle="Cuánto compró, a qué precio, cuánto se ganó, qué proyectamos y qué ofrecerle según stock y merma."
      actions={<ShareActions brief={data} projection={projection} version={version} onShare={setChannel} />}
    />

    <Card className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div><label htmlFor="brief-customer" className="mb-1.5 block text-sm font-semibold">Empresa</label>
          <CustomerPicker id="brief-customer" value={customer} onPick={(c) => { setPicked(c); if (c) update({ ruc: c.ruc }); }} /></div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Ventas desde
          <Input type="date" className="h-11" value={from ?? data?.date_from ?? ""} max={to ?? data?.date_to ?? undefined} onChange={(e) => update({ from: e.target.value || null })} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Hasta
          <Input type="date" className="h-11" value={to ?? data?.date_to ?? ""} max={data?.data_as_of ?? undefined} onChange={(e) => update({ to: e.target.value || null })} /></label>
      </div>
      <div className="flex flex-wrap gap-6">
        <Segmented label="Proyectar" value={projection} onChange={(v) => update({ projection: v })}
          options={(Object.keys(PROJECTION_LABEL) as Projection[]).map((key) => ({ value: key, label: PROJECTION_LABEL[key] }))} />
        <Segmented label="Versión" value={version} onChange={(v) => update({ version: v === "customer" ? v : null })}
          options={[{ value: "internal", label: "Interna" }, { value: "customer", label: "Para el cliente" }]} />
        <p className="self-end pb-3 text-[13px] text-ink-muted">{version === "customer"
          ? "Para el cliente: es lo que sale en el PDF, el correo y el WhatsApp. No muestra ranking, atraso, ganancia ni datos internos."
          : "Interna: para Gerencia y el vendedor. Incluye ranking, ritmo de compra y atraso; la ganancia, el stock y el guion se sumarán cuando estén los costos, los lotes y la IA."}</p>
      </div>
    </Card>

    {data && channel === "email" && <EmailComposer ruc={data.ruc} version="customer"
      attachment={() => downloadBriefPdf(data, PROJECTION_LABEL[projection], "customer", "blob")}
      subject={`Resumen de sus compras · ${data.name}`} text={briefSummaryText(data, "customer")}
      onClose={() => setChannel(null)} inline />}
    {data && channel === "whatsapp" && <ShareDialog channel="whatsapp" ruc={data.ruc} version={version}
      subject={version === "customer" ? `Resumen de sus compras · ${data.name}` : `Ficha para reunión · ${data.name}`}
      text={briefSummaryText(data, version)} onClose={() => setChannel(null)} />}

    {!ruc ? <Card className="py-12 text-center text-sm text-ink-muted">Elige un cliente para armar su ficha.</Card>
      : <>
        <Status loading={brief.loading && !data} error={brief.error} reload={brief.reload} />
        {data && (version === "customer" ? <CustomerVersionBody brief={data} projection={projection} /> : <BriefBody brief={data} projection={projection} />)}
      </>}
  </div>;
}

function BriefBody({ brief, projection }: { brief: Brief; projection: Projection }) {
  const discountPct = brief.list_amount > 0 ? (brief.invoice_discount / brief.list_amount) * 100 : 0;
  const late = (brief.days_late ?? 0) > 0;
  return <>
    <Card className="flex flex-wrap items-start justify-between gap-6 p-8">
      <div className="min-w-0 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{brief.name}</h2>
        <div className="flex flex-wrap gap-2">
          {brief.level ? <Chip tone="ok">Nivel {brief.level}</Chip> : <Chip title="Gerencia aún no definió los umbrales en Ajustes">Nivel sin definir</Chip>}
          {brief.credit_days != null && <Chip>Crédito a {brief.credit_days} días</Chip>}
          {brief.rank != null && <Chip>Cliente n.° {formatInt(brief.rank)} de {formatInt(brief.ranked_customers)}</Chip>}
          {brief.days_late != null && (late ? <Chip tone="bad">{brief.days_late} días de atraso</Chip> : <Chip tone="ok">Al día con su ritmo</Chip>)}
        </div>
        {brief.salesperson_name && <p className="text-sm text-ink-muted">Vendedor: {brief.salesperson_name}
          {brief.salesperson_share_pct != null && ` · atendió el ${formatPercent(brief.salesperson_share_pct, 0)} de sus compras del período`}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm text-ink-muted">Período analizado</p>
        <p className="font-semibold">{formatDate(brief.date_from)} – {formatDate(brief.date_to)}</p>
        <p className="text-sm text-ink-muted">Montos sin IGV · <OriginBadge origin="real" className="align-middle" /></p>
      </div>
    </Card>

    <Pending kind="feature" title="Resumen para la reunión">
      Cuatro líneas con lo esencial: cuánto compra y qué lugar ocupa, si va atrasado, cuánto paga frente a la referencia y qué proponerle. El resumen individual queda pendiente de una política de uso de datos del cliente con Gemini.
    </Pending>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatTile label="Venta del período" value={formatPen(brief.amount)} detail={`${formatPercent(brief.share_pct)} de la venta de Mederi`} />
      <PendingTile label="Ganancia estimada" kind="data" reason="Faltan costos de compra validados" />
      <StatTile label="Pedidos" value={formatInt(brief.order_count)} detail={brief.order_count ? `Pedido promedio ${formatPen(brief.average_order_amount)}` : undefined} />
      <StatTile label="Ritmo de compra" value={brief.purchase_rhythm_days != null ? `Cada ${formatNumber(brief.purchase_rhythm_days, 0)} días` : "—"} tone={late ? "bad" : "muted"}
        detail={brief.days_since_last_order != null ? `Última compra hace ${brief.days_since_last_order} días` : "Sin pedidos"} />
      <StatTile label="Descuentos" value={`${formatPercent(discountPct)} en factura`}
        detail={brief.below_reference_pct != null ? `Pagó ${formatPercent(Math.abs(brief.below_reference_pct))} ${brief.below_reference_pct >= 0 ? "bajo" : "sobre"} el precio de referencia` : undefined} />
      <PendingTile label={`Proyección ${PROJECTION_LABEL[projection].toLowerCase()}`} kind="data" reason="Falta validar la proyección de importes por cliente" />
    </div>

    <MonthlyCard brief={brief} projection={projection} />
    <WhatTheyBuy brief={brief} />
    <RhythmCard brief={brief} />
    <ProductsCard brief={brief} discountPct={discountPct} />

    <Pending kind="feature" title="Qué ofrecerle">
      La propuesta personalizada requiere el archivo de lotes, costos validados y reglas comerciales aprobadas antes de poder redactarse.
    </Pending>
    <Pending kind="feature" title="Guion para la reunión">
      Preguntas y propuestas en orden para la conversación: abrir con su historial, preguntar por el atraso, proponer la reposición y cuidar el descuento.
    </Pending>
    <Pending kind="data" title="Crédito y cobranza">
      Días promedio de pago, deuda vencida y recomendación de crédito. Los cobros de Defontana aún no se pueden enlazar con los pedidos, así que no se calculan.
    </Pending>

    <p className="text-[13px] leading-relaxed text-ink-muted">Fuentes: pedidos y detalle de Mederi, solo productos veterinarios, sin IGV y sin líneas bonificadas; se excluyen pedidos cancelados.
      Un pedido no es una venta facturada: Mederi aún debe confirmar los demás estados. Datos cargados hasta el {formatDate(brief.data_as_of)}.</p>
  </>;
}

/** Lo que ve el cliente: sus compras, precios y ahorro. Sin ranking, atraso, ganancia ni notas internas. */
function CustomerVersionBody({ brief, projection }: { brief: Brief; projection: Projection }) {
  const top = brief.products.slice(0, 2).filter((p) => brief.amount > 0);
  const summary = [
    `Entre el ${formatLongDate(brief.date_from)} y el ${formatLongDate(brief.date_to)} compró ${formatPen(brief.amount)} sin IGV en ${formatInt(brief.order_count)} pedido${brief.order_count === 1 ? "" : "s"}.`,
    ...(top.length ? [`Sus productos principales fueron ${top.map((p) => `${p.product_name} (${formatPercent((p.amount / brief.amount) * 100, 0)})`).join(" y ")}.`] : []),
    ...(brief.below_reference_pct != null && brief.below_reference_pct > 0 ? [`Pagó en promedio ${formatPercent(brief.below_reference_pct)} menos que el precio de referencia.`] : []),
  ];
  return <>
    <Card className="flex flex-wrap items-start justify-between gap-6 p-8">
      <div className="min-w-0 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{brief.name}</h2>
        <div className="flex flex-wrap gap-2">
          {brief.level && <Chip tone="ok">Nivel {brief.level}</Chip>}
          {brief.credit_days != null && brief.credit_days > 0 && <Chip>Crédito a {brief.credit_days} días</Chip>}
        </div>
        {brief.salesperson_name && <p className="text-sm text-ink-muted">Su vendedor: {brief.salesperson_name}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm text-ink-muted">Período analizado</p>
        <p className="font-semibold">{formatDate(brief.date_from)} – {formatDate(brief.date_to)}</p>
        <p className="text-sm text-ink-muted">Montos sin IGV</p>
      </div>
    </Card>

    <Card className="flex flex-col gap-4 p-8">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumen de sus compras</h2>
        <OriginBadge origin="real" className="flex-none" />
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">{summary.map((line) => <li key={line}>{line}</li>)}</ol>
      <p className="text-[13px] text-ink-muted">La propuesta individual sigue pendiente de datos de lotes y costos validados.</p>
    </Card>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Compras del período" value={formatPen(brief.amount)} detail="Sin IGV" />
      <StatTile label="Pedidos" value={formatInt(brief.order_count)} detail={brief.order_count ? `Pedido promedio ${formatPen(brief.average_order_amount)}` : undefined} />
      <StatTile label="Ahorro frente a referencia" value={brief.below_reference_pct != null && brief.below_reference_pct > 0 ? formatPercent(brief.below_reference_pct) : "—"}
        detail="Precio pagado vs. precio de referencia" />
      <PendingTile label="Propuesta" kind="data" reason="Pendiente del archivo de lotes y costos" />
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <MonthlyCard brief={brief} projection={projection} />
      <WhatTheyBuy brief={brief} forCustomer />
    </div>
    <ProductsCard brief={brief} discountPct={brief.list_amount > 0 ? (brief.invoice_discount / brief.list_amount) * 100 : 0} forCustomer />

    <Pending kind="feature" title="Nuestra propuesta">
      Ofertas para este cliente con precios sin IGV y su vigencia: su reposición habitual, productos de lotes por vencer y precios por volumen. Requiere el archivo de lotes y costos validados para respetar el margen mínimo.
    </Pending>

    <p className="text-[13px] leading-relaxed text-ink-muted">Fuente: pedidos de {brief.name} registrados en Mederi, sin IGV. Precio de referencia: último precio pagado registrado del producto.</p>
  </>;
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

function MonthlyCard({ brief, projection }: { brief: Brief; projection: Projection }) {
  const data = brief.monthly.map((m) => {
    const iso = `${m.month}-01`;
    const label = formatMonthYear(iso).slice(0, 3);
    return { label: `${label.charAt(0).toUpperCase()}${label.slice(1)} ${m.month.slice(2, 4)}`, amount: m.amount, full: formatMonthYear(iso), orders: m.order_count };
  });
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Compras por mes y proyección</h2><p className="text-sm text-ink-muted">En miles de soles, sin IGV.</p></div>
      <OriginBadge origin="real" className="flex-none" />
    </div>
    <div className="h-72 w-full" role="img" aria-label="Monto de pedidos del cliente por mes, sin IGV">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E3E3E3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#5F6368", fontSize: 11 }} axisLine={{ stroke: "#CFCFCF" }} tickLine={false} />
          <YAxis hide />
          <Tooltip cursor={{ fill: "#F5F5F5" }} formatter={(value, _name, item) => [`${formatPen(Number(value))} · ${item.payload.orders} pedido${item.payload.orders === 1 ? "" : "s"}`, "Monto sin IGV"]}
            labelFormatter={(_l, payload) => payload?.[0]?.payload?.full ?? ""} />
          <Bar dataKey="amount" fill="#D01F29" radius={[4, 4, 0, 0]} maxBarSize={48}>
            <LabelList dataKey="amount" position="top" fill="#3A3A3A" fontSize={11} formatter={(v: unknown) => formatNumber(Number(v) / 1000, 1)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="grid gap-4 rounded bg-canvas p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div><p className="text-sm font-semibold text-ink-muted">Proyección {PROJECTION_LABEL[projection].toLowerCase()}</p><p className="mt-1 text-3xl font-semibold text-ink-muted">—</p></div>
      <p className="self-center text-sm text-ink-muted">Pendiente del modelo de predicción: cuando se entrene con el historial de pedidos, aquí aparecerán las barras proyectadas, el monto esperado y su rango probable.</p>
    </div>
  </Card>;
}

/** Colores de la dona en orden fijo: los mismos que los tokens `chart-*` de tailwind.config.ts (ver design/tokens.md). */
const DONUT_COLORS = ["#D01F29", "#2A78D6", "#EDA100", "#1BAF7A"];
const DONUT_OTHER = "#B5B5B5";
const DONUT_TOP = 4;

function WhatTheyBuy({ brief, forCustomer = false }: { brief: Brief; forCustomer?: boolean }) {
  const total = brief.amount;
  const top = brief.products.slice(0, DONUT_TOP);
  const rest = brief.products.slice(DONUT_TOP).reduce((sum, p) => sum + p.amount, 0);
  const slices = [
    ...top.map((p, i) => ({ key: p.product_code, label: p.product_name, value: p.amount, color: DONUT_COLORS[i] })),
    ...(rest > 0 ? [{ key: "otros", label: `Otros productos (${brief.products.length - DONUT_TOP})`, value: rest, color: DONUT_OTHER }] : []),
  ].map((slice) => ({ ...slice, share: total > 0 ? (slice.value / total) * 100 : 0 }));

  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Qué compra</h2><p className="text-sm text-ink-muted">{forCustomer ? "Por producto, en el período." : "Por producto, en el período. Las categorías de Defontana aún están por confirmar."}</p></div>
      <OriginBadge origin="real" className="flex-none" />
    </div>
    {slices.length ? <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
      <div className="relative h-56 w-56 flex-none" role="img" aria-label={`Participación por producto: ${slices.map((s) => `${s.label} ${formatPercent(s.share)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" startAngle={90} endAngle={-270}
              stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
              {slices.map((slice) => <Cell key={slice.key} fill={slice.color} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${formatPen(Number(value))} · ${formatPercent(total ? (Number(value) / total) * 100 : 0)}`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-semibold tabular-nums">{formatPen(total).replace(/\.\d{2}$/, "")}</span>
          <span className="text-xs text-ink-muted">en el período</span>
        </div>
      </div>
      <ul className="flex min-w-[240px] flex-1 flex-col gap-2.5">
        {slices.map((slice) => <li key={slice.key} className="flex items-center gap-3 text-sm">
          <span className="size-3 flex-none rounded-xs" style={{ backgroundColor: slice.color }} aria-hidden />
          <span className="min-w-0 flex-1 truncate" title={slice.label}>{slice.label}</span>
          <span className="flex-none font-semibold tabular-nums">{formatPercent(slice.share)}</span>
        </li>)}
      </ul>
    </div> : <p className="py-6 text-sm text-ink-muted">No hay pedidos en este período.</p>}
  </Card>;
}

function RhythmCard({ brief }: { brief: Brief }) {
  const start = Date.parse(brief.date_from);
  const cut = Date.parse(brief.date_to);
  const expected = brief.expected_next_order_date ? Date.parse(brief.expected_next_order_date) : null;
  const end = Math.max(cut, expected ?? 0) + 10 * 86_400_000;
  const W = 1000, PAD = 16;
  const x = (t: number) => PAD + ((t - start) / (end - start)) * (W - 2 * PAD);
  const dots = [...new Set(brief.order_dates)].map((d) => Date.parse(d));
  const last = brief.last_order_date ? Date.parse(brief.last_order_date) : null;
  const months = useMemo(() => {
    const ticks: { t: number; label: string }[] = [];
    const d = new Date(start); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
    while (d.getTime() <= end) { ticks.push({ t: d.getTime(), label: new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(d) }); d.setUTCMonth(d.getUTCMonth() + 1); }
    return ticks;
  }, [start, end]);
  const late = (brief.days_late ?? 0) > 0;
  return <Card className="flex flex-col gap-3 p-8">
    <div><h2 className="text-lg font-semibold">Ritmo de compra</h2>
      <p className="text-sm text-ink-muted">Cada punto es un pedido.{brief.purchase_rhythm_days != null && ` Suele comprar cada ${formatNumber(brief.purchase_rhythm_days, 0)} días; la línea punteada marca cuándo se esperaba el siguiente (${formatDate(brief.expected_next_order_date)}).`}</p></div>
    {dots.length ? <svg viewBox={`0 0 ${W} 130`} className="w-full" role="img" aria-label={`${dots.length} días con pedido en el período`}>
      <line x1={PAD} x2={W - PAD} y1={50} y2={50} stroke="#E3E3E3" strokeWidth={2} />
      {late && last && <line x1={x(last)} x2={x(cut)} y1={50} y2={50} stroke="#D01F29" strokeWidth={3} />}
      {late && last && <text x={(x(last) + x(cut)) / 2} y={24} textAnchor="middle" fontSize={15} fontWeight={600} fill="#A8161F">{brief.days_since_last_order} días sin comprar</text>}
      {expected && <line x1={x(expected)} x2={x(expected)} y1={36} y2={64} stroke="#5F6368" strokeWidth={1.5} strokeDasharray="4 3" />}
      <line x1={x(cut)} x2={x(cut)} y1={32} y2={68} stroke="#161616" strokeWidth={2} />
      <text x={x(cut)} y={86} textAnchor="middle" fontSize={13} fontWeight={600} fill="#161616">Corte {formatDate(brief.date_to).replace(/ \d{4}$/, "")}</text>
      {dots.map((t) => <circle key={t} cx={x(t)} cy={50} r={6} fill="#D01F29" stroke="#FFFFFF" strokeWidth={2}><title>{formatDate(new Date(t).toISOString().slice(0, 10))}</title></circle>)}
      {months.map((m) => <text key={m.t} x={x(m.t)} y={120} textAnchor="middle" fontSize={13} fill="#5F6368">{m.label.charAt(0).toUpperCase() + m.label.slice(1).replace(".", "")}</text>)}
    </svg> : <p className="py-6 text-sm text-ink-muted">No hay pedidos en este período.</p>}
  </Card>;
}

function ProductsCard({ brief, discountPct, forCustomer = false }: { brief: Brief; discountPct: number; forCustomer?: boolean }) {
  const top = brief.products.slice(0, TOP_PRODUCTS);
  const rest = brief.products.slice(TOP_PRODUCTS);
  const restAmount = rest.reduce((sum, p) => sum + p.amount, 0);
  const priced = brief.products.filter((p) => p.below_reference_pct != null).length;
  return <Card className="flex flex-col gap-4 p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Qué compró y a qué precio</h2>
        <p className="text-sm text-ink-muted">Descuento en factura del período: {formatPen(brief.invoice_discount)} ({formatPercent(discountPct)}). El descuento real está en el precio.</p></div>
      <OriginBadge origin="estimated" className="flex-none" />
    </div>
    {brief.products.length ? <Table>
      <THead><TR><TH>Producto</TH><TH numeric>Unidades</TH><TH numeric>Precio pagado</TH><TH numeric>Precio de referencia</TH><TH numeric>{forCustomer ? "Su ahorro" : "Bajo referencia"}</TH><TH numeric>Venta</TH><TH numeric>Última compra</TH></TR></THead>
      <TBody>
        {top.map((p) => <TR key={p.product_code}>
          <TD className="font-semibold">{p.product_name}</TD>
          <TD numeric>{formatNumber(p.quantity, 0)}</TD>
          <TD numeric>{formatPen(p.average_price)}</TD>
          <TD numeric className="text-ink-muted">{formatPen(p.reference_price)}</TD>
          <TD numeric className={cn(p.below_reference_pct != null && p.below_reference_pct < 0 && "text-warn-fg")}>{formatPercent(p.below_reference_pct)}</TD>
          <TD numeric className="font-semibold">{formatPen(p.amount)}</TD>
          <TD numeric className="text-ink-muted">{formatDate(p.last_order_date)}</TD>
        </TR>)}
        {rest.length > 0 && <TR><TD className="font-semibold">Otros productos ({rest.length})</TD><TD numeric>—</TD><TD numeric>—</TD><TD numeric>—</TD><TD numeric>—</TD>
          <TD numeric className="font-semibold">{formatPen(restAmount)}</TD><TD numeric>—</TD></TR>}
        <TR className="border-t-2 border-line-strong"><TD className="font-semibold">Total</TD><TD /><TD /><TD />
          <TD numeric className="font-semibold">{formatPercent(brief.below_reference_pct)}</TD><TD numeric className="font-semibold">{formatPen(brief.amount)}</TD><TD /></TR>
      </TBody>
    </Table> : <p className="py-6 text-sm text-ink-muted">No hay pedidos en este período.</p>}
    <p className="text-[13px] text-ink-muted">{forCustomer
      ? `Precio de referencia = último precio de venta registrado del producto. El total se calcula sobre los ${priced} productos con precio de referencia.`
      : `Precio de referencia = último precio pagado por cualquier cliente hasta el corte (estimado, no es una lista oficial ni un costo). El total bajo referencia es el promedio ponderado por venta de los ${priced} productos con referencia; un valor negativo indica que pagó más.`}</p>
  </Card>;
}

function ShareActions({ brief, projection, version, onShare }: { brief: Brief | null; projection: Projection; version: BriefVersion; onShare: (channel: ShareChannel) => void }) {
  return <div className="flex flex-wrap gap-2">
    <Button disabled={!brief} onClick={() => brief && downloadBriefPdf(brief, PROJECTION_LABEL[projection], version)}><Download size={16} aria-hidden />Descargar PDF</Button>
    <Button variant="outline" disabled={!brief} onClick={() => onShare("email")}><Mail size={16} aria-hidden />Correo</Button>
    <Button variant="outline" disabled={!brief} onClick={() => onShare("whatsapp")}><MessageSquare size={16} aria-hidden />WhatsApp</Button>
  </div>;
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string; disabled?: boolean; title?: string }[];
}) {
  return <div role="radiogroup" aria-label={label} className="flex flex-col gap-1.5">
    <span className="text-sm font-semibold">{label}</span>
    <div className="inline-flex rounded border border-line-strong bg-surface p-1">
      {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={o.value === value} disabled={o.disabled} title={o.title}
        onClick={() => onChange(o.value)}
        className={cn("rounded-sm px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:text-ink-muted/60",
          o.value === value ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas")}>{o.label}</button>)}
    </div>
  </div>;
}

function Chip({ children, tone = "neutral", title }: { children: React.ReactNode; tone?: "neutral" | "ok" | "bad"; title?: string }) {
  const cls = { neutral: "bg-neutral-bg text-neutral-fg", ok: "bg-ok-bg text-ok-fg", bad: "bg-danger-bg text-danger-fg" }[tone];
  return <span title={title} className={cn("rounded-xs px-2.5 py-1 text-sm font-semibold", cls)}>{children}</span>;
}
