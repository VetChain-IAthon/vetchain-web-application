"use client";

import { ArrowRight, Check, ClipboardCheck, MessageCircle, Phone, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice } from "@/components/data/notice";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatMonthYear, formatNumber, formatPen } from "@/lib/format";
import { formatPeruPhone, peruPhone } from "@/lib/phone";
import { CONTACT_OUTCOMES } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";

type AtRisk = components["schemas"]["AtRiskCustomerOut"];
type Contact = components["schemas"]["ContactOut"];
type Outcome = (typeof CONTACT_OUTCOMES)[number];

/** Clientes que se muestran por día: los de más soles en juego. */
const PER_DAY = 5;
const QUOTE_OUTCOME: Outcome = "Pidió cotización";

/** Texto del botón y qué pasa después, como en el prototipo (Vendedor.dc.html). */
const OUTCOME_TEXT: Record<Outcome, { label: string; hint: string }> = {
  "Pidió cotización": { label: "Pidió cotización", hint: "La cotización queda en Cotizaciones para seguimiento." },
  "Hará pedido directo": { label: "Hará pedido directo", hint: "Gerencia lo verá como pedido directo, sin cotización." },
  "No necesita": { label: "No necesita por ahora", hint: "Se vuelve a avisar cuando se pase su ritmo de compra." },
  "Compró a otro": { label: "Compró a otro proveedor", hint: "Gerencia lo verá como cliente que compró a la competencia." },
  "No contestó": { label: "No contestó", hint: "Queda pendiente para volver a intentarlo." },
};
const outcomeText = (outcome: string) => OUTCOME_TEXT[outcome as Outcome] ?? { label: outcome, hint: "" };

/** Días por encima del ritmo habitual (con el ritmo por defecto si el cliente tiene menos de dos pedidos). */
const daysLate = (item: AtRisk, defaultRhythm: number) => Math.max(0, item.days_since_last_order - (item.purchase_rhythm_days ?? defaultRhythm));
const lateText = (days: number) => `${formatNumber(days)} ${days === 1 ? "día" : "días"} más de lo habitual sin comprar`;

/** Último contacto de cada cliente, solo si es posterior a su último pedido (misma regla que el seguimiento de gerencia). */
async function loadContacts(items: AtRisk[]) {
  const entries = await Promise.all(items.map(async (item) => {
    const { data } = await api.GET("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc: item.ruc }, query: { page: 1, per_page: 1 } } });
    const latest = data?.items[0];
    return [item.ruc, latest && latest.contact_date >= item.last_order_date ? latest : null] as const;
  }));
  return new Map(entries);
}

export function TodayView() {
  const atRisk = useQuery(
    () => api.GET("/api/v1/customers/at-risk", { params: { query: { page: 1, per_page: PER_DAY } } }),
    [], "No se pudo cargar los clientes para hoy.",
  );
  const [contacts, setContacts] = useState<Map<string, Contact | null> | null>(null);
  const items = atRisk.data?.items ?? [];

  useEffect(() => {
    if (!atRisk.data) return;
    let active = true;
    loadContacts(atRisk.data.items).then((map) => { if (active) setContacts(map); }).catch(() => { if (active) setContacts(new Map()); });
    return () => { active = false; };
  }, [atRisk.data]);

  const defaultRhythm = atRisk.data?.default_rhythm_days ?? 30;
  const contactOf = (ruc: string) => contacts?.get(ruc) ?? null;
  const pending = items.filter((item) => !contactOf(item.ruc));
  const contacted = items.length - pending.length;
  const quoted = items.filter((item) => contactOf(item.ruc)?.outcome === QUOTE_OUTCOME).length;
  const totalAtStake = items.reduce((sum, item) => sum + item.money_at_stake, 0);
  const pendingAtStake = pending.reduce((sum, item) => sum + item.money_at_stake, 0);
  const next = contacts ? pending[0] : undefined;
  const cutoff = atRisk.data?.data_as_of ? ` · prioridades calculadas al corte de datos (${formatMonthYear(atRisk.data.data_as_of)})` : "";

  const header = <PageHeader title="Hoy" origin="estimated" subtitle={`Tus clientes por atender${cutoff}`} />;

  if (atRisk.error) return <>{header}<Notice>{atRisk.error.message} <Button variant="outline" size="sm" onClick={atRisk.reload}>Reintentar</Button></Notice></>;
  if (!atRisk.data) return <>{header}<p className="text-sm text-ink-muted">Cargando tus clientes para hoy…</p></>;
  if (!items.length) return <>{header}
    <section className="rounded-lg border border-line bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">No tienes clientes atrasados hoy</h2>
      <p className="mt-1 text-sm text-ink-muted">Todos tus clientes compraron dentro de su ritmo habitual. Revisa tu cartera en Clientes.</p>
    </section></>;

  return <>
    {header}

    {next ? <a href={`#cliente-${next.ruc}`} className="flex items-center gap-4 rounded-lg border border-line bg-surface px-6 py-5 text-ink no-underline hover:bg-canvas">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-soft text-brand"><ArrowRight size={18} aria-hidden /></span>
      <p className="m-0 text-base"><strong>Sigue con {next.name}:</strong> {formatPen(next.money_at_stake)} en juego y lleva {lateText(daysLate(next, defaultRhythm))}.</p>
    </a> : contacts && <div className="flex items-center gap-4 rounded-lg border border-ok-fg/20 bg-ok-bg px-6 py-5 text-ok-fg">
      <Check size={20} aria-hidden /><p className="m-0 text-base font-semibold">Contactaste a todos tus clientes de hoy.</p>
    </div>}

    <section className="grid gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
        <span className="text-sm font-medium text-ink-muted">Por contactar</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{contacts ? formatPen(pendingAtStake) : "…"}</span>
        <span className="text-sm text-ink-muted">de {formatPen(totalAtStake)} en juego hoy</span>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
        <span className="text-sm font-medium text-ink-muted">Contactados</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{contacts ? `${contacted} de ${items.length}` : "…"}</span>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={contacted} aria-label="Clientes contactados">
          <div className="h-full rounded-full bg-brand" style={{ width: `${items.length ? (contacted / items.length) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
        <span className="text-sm font-medium text-ink-muted">Pidieron cotización</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{contacts ? quoted : "…"}</span>
        <span className="text-sm text-ink-muted">Quedan en Cotizaciones para seguimiento</span>
      </div>
    </section>

    <div className="mt-2 flex items-baseline justify-between gap-2">
      <h2 className="m-0 text-xl font-semibold">Clientes para hoy</h2>
      <span className="text-sm text-ink-muted">Ordenados por soles en juego{atRisk.data.total > items.length ? ` · ${items.length} de ${atRisk.data.total} atrasados` : ""}</span>
    </div>

    <div className="flex flex-col gap-4">
      {items.map((item, index) => <TodayCustomer key={item.ruc} item={item} position={index + 1} defaultRhythm={defaultRhythm}
        contact={contactOf(item.ruc)} contactsLoaded={!!contacts}
        onContact={(contact) => setContacts((map) => new Map(map ?? []).set(item.ruc, contact))} />)}
    </div>

    <p className="text-[13px] leading-relaxed text-ink-muted">
      Un cliente aparece aquí cuando pasó más de {formatNumber(atRisk.data.at_risk_factor)} veces su ritmo de compra sin pedir (sin llegar a dormido).
      El ritmo y el pedido promedio salen de sus pedidos de 12 meses, sin IGV; si tiene menos de dos pedidos se usa un ritmo de {formatNumber(defaultRhythm)} días.
      Los factores son provisionales hasta que gerencia los defina. Un pedido no es una venta facturada.
    </p>
  </>;
}

function TodayCustomer({ item, position, defaultRhythm, contact, contactsLoaded, onContact }: {
  item: AtRisk; position: number; defaultRhythm: number; contact: Contact | null; contactsLoaded: boolean; onContact: (contact: Contact) => void;
}) {
  const products = useQuery(() => api.GET("/api/v1/customers/{ruc}/products", { params: { path: { ruc: item.ruc } } }), [item.ruc], "No se pudo cargar sus productos.");
  const detail = useQuery(() => api.GET("/api/v1/customers/{ruc}", { params: { path: { ruc: item.ruc } } }), [item.ruc], "No se pudo cargar su teléfono.");
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [usual, also] = products.data?.items ?? [];
  const usualQuantity = usual && usual.times_ordered > 0 ? Math.max(1, Math.round(usual.total_quantity / usual.times_ordered)) : null;
  const quoteHref = usual && usualQuantity
    ? `/cotizaciones?${new URLSearchParams({ ruc: item.ruc, producto: usual.product_code, cantidad: String(usualQuantity) })}`
    : `/cotizaciones?${new URLSearchParams({ ruc: item.ruc })}`;
  const phone = peruPhone(detail.data?.phone);

  async function openWhatsApp() {
    setMessage(null);
    const popup = window.open("", "_blank");
    const { data, error } = await api.GET("/api/v1/customers/{ruc}/whatsapp-link", { params: { path: { ruc: item.ruc } } });
    if (data) { if (popup) popup.location.href = data.url; else window.location.href = data.url; return; }
    popup?.close();
    setMessage(errorMessage(error, "No se pudo abrir WhatsApp. Revisa que el cliente tenga teléfono en su ficha."));
  }

  async function register(outcome: Outcome) {
    setBusy(true); setMessage(null);
    const { data, error } = await api.POST("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc: item.ruc } }, body: { outcome } });
    setBusy(false);
    if (!data) { setMessage(errorMessage(error, "No se pudo registrar el resultado. Inténtalo de nuevo.")); return; }
    setRegistering(false); onContact(data);
  }

  return (
    <article id={`cliente-${item.ruc}`} className="scroll-mt-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{position}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/clientes/${item.ruc}`} className="text-lg font-semibold text-ink no-underline hover:underline">{item.name}</Link>
              <p className="mt-0.5 text-sm text-brand-strong">{lateText(daysLate(item, defaultRhythm))}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold tracking-tight tabular-nums">{formatPen(item.money_at_stake)}</div>
              <div className="text-sm text-ink-muted">pedido promedio en juego</div>
            </div>
          </div>

          <dl className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Suele pedir</dt>
              <dd className="mt-1.5 text-[15px]">
                {products.error ? <span className="text-ink-muted">{products.error.message}</span>
                  : !products.data ? <span className="text-ink-muted">Cargando…</span>
                  : !usual ? <span className="text-ink-muted">Sin productos veterinarios en sus pedidos</span>
                  : <><strong>{usual.product_name}{usualQuantity ? ` · ${formatNumber(usualQuantity, 0)} u.` : ""}</strong>
                    {also && <span className="mt-1 block text-sm text-ink-muted">También: {also.product_name}</span>}</>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pedido promedio</dt>
              <dd className="mt-1.5 text-[15px]">Pedidos de 12 meses {formatPen(item.amount_12m)} ÷ {item.order_count_12m} {item.order_count_12m === 1 ? "pedido" : "pedidos"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cobranza</dt>
              <dd className="mt-1.5">
                <span className="inline-block rounded bg-neutral-bg px-3 py-1.5 text-sm font-semibold text-neutral-fg">Sin datos todavía</span>
                <span className="mt-1 block text-xs text-ink-muted">Falta enlazar cobros con facturas</span>
              </dd>
            </div>
          </dl>

          {contact && !registering ? (
            <div className="mt-5 flex items-center gap-4 rounded border border-ok-fg/15 bg-ok-bg px-5 py-4">
              <Check size={20} className="flex-none text-ok-fg" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold text-ok-fg">Contactado · {outcomeText(contact.outcome).label}</p>
                <p className="m-0 text-sm text-ink-2">{outcomeText(contact.outcome).hint}</p>
              </div>
              {contact.outcome === QUOTE_OUTCOME && <Button asChild size="sm"><Link href={quoteHref}>Armar cotización</Link></Button>}
              <button type="button" onClick={() => setRegistering(true)} className="text-sm font-semibold text-ok-fg underline">Cambiar</button>
            </div>
          ) : registering ? (
            <div className="mt-5 rounded border border-line bg-canvas p-5">
              <p className="m-0 mb-4 font-semibold">¿Cómo te fue con este cliente?</p>
              <div role="group" aria-label="Resultado del contacto" className="flex flex-wrap gap-3">
                {CONTACT_OUTCOMES.map((outcome) => <button key={outcome} type="button" disabled={busy} onClick={() => register(outcome)}
                  className="min-h-11 rounded-full border border-line-strong bg-surface px-5 text-[15px] font-medium hover:border-ink-2 disabled:opacity-50">
                  {OUTCOME_TEXT[outcome].label}</button>)}
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="m-0 text-sm text-ink-muted">Gerencia ve estos resultados por vendedor, de la alerta al pedido.</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRegistering(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button asChild className="h-11 px-5 text-[15px]">
                <Link href={quoteHref}><RefreshCw size={18} aria-hidden />{usual ? "Repetir pedido habitual" : "Armar cotización"}</Link>
              </Button>
              <Button type="button" variant="outline" className="h-11 px-5 text-[15px]" onClick={openWhatsApp}><MessageCircle size={18} aria-hidden />WhatsApp</Button>
              {phone ? <Button asChild variant="outline" className="h-11 px-5 text-[15px]"><a href={`tel:${phone}`} title={`Llamar al ${formatPeruPhone(phone)}`}><Phone size={18} aria-hidden />Llamar</a></Button>
                : <Button type="button" variant="outline" className="h-11 px-5 text-[15px]" disabled title="El cliente no tiene teléfono en su ficha"><Phone size={18} aria-hidden />Llamar</Button>}
              <button type="button" disabled={!contactsLoaded} onClick={() => setRegistering(true)}
                className="inline-flex h-11 items-center gap-2 px-2 text-[15px] font-semibold text-brand hover:text-brand-hover disabled:opacity-50">
                <ClipboardCheck size={18} aria-hidden />Registrar resultado</button>
            </div>
          )}
          {message && <p role="alert" className="mb-0 mt-3 text-sm text-brand-strong">{message}</p>}
        </div>
      </div>
    </article>
  );
}
