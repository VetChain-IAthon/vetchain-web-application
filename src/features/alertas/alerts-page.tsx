"use client";

import { useState } from "react";
import { CalculatedBadge } from "@/components/data/calculated-badge";
import { Notice } from "@/components/data/notice";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { formatDate, formatMonthYear, formatNumber, formatPen } from "@/lib/format";
import { CONTACT_OUTCOMES } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";
import { type AlertContact, type AlertItem, daysLate, reloadAlerts, setAlertContact, useAlerts } from "./use-alerts";


const lateLabel = (days: number) => `${formatNumber(days, days % 1 ? 1 : 0)} ${days === 1 ? "día" : "días"} de atraso`;

export function AlertsPage() {
  const { state, loaded } = useAlerts();
  const items = state?.items ?? [];
  const contactOf = (ruc: string) => state?.contacts.get(ruc) ?? null;
  const contacted = items.filter((i) => contactOf(i.ruc)).length;
  const pendingAtStake = items.filter((i) => !contactOf(i.ruc)).reduce((sum, i) => sum + i.money_at_stake, 0);
  const maxAtStake = Math.max(1, ...items.map((i) => i.money_at_stake));
  const cutoff = state?.dataAsOf ? `Datos hasta ${formatMonthYear(state.dataAsOf)} · ` : "";

  const header = <PageHeader title="Alertas del día" subtitle={`${cutoff}clientes que ya pasaron su ritmo habitual de compra`}
    actions={<CalculatedBadge />} />;

  if (!loaded) return <>{header}<p className="text-sm text-ink-muted">Calculando las alertas del día…</p></>;
  if (!state) return <>{header}<Notice className="flex items-center justify-between gap-4">
    <span>No se pudieron cargar las alertas. Revisa tu conexión e inténtalo de nuevo.</span>
    <Button variant="outline" onClick={() => reloadAlerts()}>Reintentar</Button></Notice></>;
  if (!items.length) return <>{header}<section className="rounded-lg border border-line bg-surface p-8 text-center">
    <h2 className="text-lg font-semibold">No hay alertas hoy</h2>
    <p className="mt-1 text-sm text-ink-muted">Todos los clientes compraron dentro de su ritmo habitual.</p></section></>;

  return <>
    {header}
    <section className="grid gap-4 md:grid-cols-3">
      <Tile label="Clientes con alerta" value={formatNumber(items.length, 0)} detail={state.total > items.length ? `Los ${items.length} con más soles en juego de ${state.total}` : "Ordenados por soles en juego"} />
      <Tile label="Ya contactados" value={`${contacted} de ${items.length}`} detail="Desde su último pedido" />
      <Tile label="Por contactar" value={formatPen(pendingAtStake)} detail="Pedido promedio de los pendientes" />
    </section>
    <div className="flex flex-col gap-4">
      {items.map((item) => <AlertCard key={item.ruc} item={item} contact={contactOf(item.ruc)} defaultRhythm={state.defaultRhythm} maxAtStake={maxAtStake} />)}
    </div>
    <p className="text-[13px] leading-relaxed text-ink-muted">
      Ordenadas por soles en juego: venta de 12 meses ÷ pedidos. Cálculo automático a partir del historial de pedidos, sin IGV; un pedido no es una venta facturada.
      Tú decides qué ofrecer y a qué precio.
    </p>
  </>;
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
    <span className="text-sm font-medium text-ink-muted">{label}</span>
    <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
    <span className="text-sm text-ink-muted">{detail}</span>
  </div>;
}

function AlertCard({ item, contact, defaultRhythm, maxAtStake }: { item: AlertItem; contact: AlertContact | null; defaultRhythm: number; maxAtStake: number }) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const products = useQuery(() => api.GET("/api/v1/customers/{ruc}/products", { params: { path: { ruc: item.ruc } } }), [item.ruc], "");
  const [usual, also] = products.data?.items ?? [];
  const usualQty = usual && usual.times_ordered > 0 ? Math.max(1, Math.round(usual.total_quantity / usual.times_ordered)) : null;
  const late = daysLate(item, defaultRhythm);

  async function mark(outcome: string) {
    setBusy(true); setError("");
    const { data, error: err } = await api.POST("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc: item.ruc } }, body: { outcome } });
    setBusy(false);
    if (!data) { setError(errorMessage(err, "No se pudo registrar el contacto.")); return; }
    setChoosing(false); setAlertContact(item.ruc, data);
  }

  async function unmark() {
    if (!contact) return;
    setBusy(true); setError("");
    const { response, error: err } = await api.DELETE("/api/v1/customers/{ruc}/contacts/{contact_id}", { params: { path: { ruc: item.ruc, contact_id: contact.id } } });
    setBusy(false);
    if (response.status !== 204) { setError(errorMessage(err, "No se pudo quitar la marca.")); return; }
    setAlertContact(item.ruc, null);
  }

  return <article id={`alerta-${item.ruc}`} className="scroll-mt-4 rounded-lg border border-line bg-surface p-6">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto] lg:items-center">
      <div>
        <h2 className="text-lg font-semibold">{item.name}</h2>
        <p className="text-sm text-ink-muted">Compró {formatPen(item.amount_12m)} (sin IGV) en los últimos 12 meses</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 w-24 flex-none overflow-hidden rounded-full bg-canvas" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (item.money_at_stake / maxAtStake) * 100)}%` }} />
          </div>
          <span className="text-sm font-semibold text-brand">{formatPen(item.money_at_stake)} por pedido · {lateLabel(late)}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-ink-muted">Producto que suele comprar</p>
        <p className="mt-1 font-semibold">{products.loading && !products.data ? "Cargando…" : usual ? `${usual.product_name}${usualQty ? ` · ${formatNumber(usualQty, 0)} unidades` : ""}` : "Sin productos veterinarios en sus pedidos"}</p>
        {also && <p className="mt-1 text-sm text-ink-muted">Otro producto frecuente: <strong className="text-ink">{also.product_name}</strong></p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {contact && <span className="rounded-xs bg-ok-bg px-2.5 py-1 text-sm font-semibold text-ok-fg" title={`${contact.outcome} · ${formatDate(contact.contact_date)}`}>Contactado</span>}
        <Button variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Ocultar" : "Ver por qué"}</Button>
        {contact
          ? <Button disabled={busy} onClick={unmark}>{busy ? "Quitando…" : "Quitar marca"}</Button>
          : <Button disabled={busy} onClick={() => setChoosing((v) => !v)} aria-expanded={choosing}>Marcar contactado</Button>}
      </div>
    </div>

    {choosing && !contact && <div className="mt-4 flex flex-wrap items-center gap-2 rounded bg-canvas p-4">
      <span className="mr-2 text-sm font-semibold">¿Qué respondió?</span>
      {CONTACT_OUTCOMES.map((o) => <Button key={o} size="sm" variant="outline" disabled={busy} onClick={() => mark(o)}>{o}</Button>)}
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {open && <Explanation item={item} late={late} defaultRhythm={defaultRhythm} usual={usual} usualQty={usualQty} />}
  </article>;
}

function Explanation({ item, late, defaultRhythm, usual, usualQty }: {
  item: AlertItem; late: number; defaultRhythm: number;
  usual?: { product_name: string; times_ordered: number }; usualQty: number | null;
}) {
  const rhythm = item.purchase_rhythm_days ?? defaultRhythm;
  const orders = item.order_count_12m;
  return <div className="mt-5 rounded bg-canvas p-5">
    <h3 className="text-base font-semibold text-brand">Por qué aparece</h3>
    <p className="mt-2 text-[15px] leading-relaxed">
      {item.purchase_rhythm_days != null
        ? `Suele comprar cada ${formatNumber(rhythm, 0)} días (según sus ${formatNumber(orders, 0)} compras de los últimos 12 meses).`
        : `Tiene menos de dos compras en 12 meses, así que se usa un ritmo de ${formatNumber(defaultRhythm, 0)} días.`}
      {" "}Su última compra fue el {formatDate(item.last_order_date)}, hace {formatNumber(item.days_since_last_order, 0)} días al corte de los datos.
      {usual && ` ${usual.product_name} aparece en ${formatNumber(usual.times_ordered, 0)} de sus pedidos${usualQty ? `, con una cantidad típica de ${formatNumber(usualQty, 0)} unidades` : ""}.`}
    </p>
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      {[`Última compra: ${formatDate(item.last_order_date)}`, `Ritmo habitual: cada ${formatNumber(rhythm, 0)} días`, `Atraso: ${formatNumber(late, late % 1 ? 1 : 0)} días`]
        .map((t) => <span key={t} className="rounded border border-line-strong bg-surface px-3 py-1.5 font-semibold">{t}</span>)}
    </div>
    <p className="mt-3 text-[13px] text-ink-muted">Ordenadas por soles en juego: venta de 12 meses ÷ pedidos. Cálculo automático a partir del historial de pedidos. Tú decides qué ofrecer y a qué precio.</p>
  </div>;
}
