"use client";

import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { KpiCard } from "@/components/data/kpi-card";
import { LevelBadge } from "@/components/data/level-badge";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { formatDate, formatInt, formatMonthYear, formatNumber, formatPen, twelveMonthStart } from "@/lib/format";
import { CUSTOMER_TYPE } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";
import { CommercialTermsCard } from "./commercial-terms-card";
import { ContactsPanel } from "./contacts-panel";
import { OrdersTable } from "./orders-table";
import { ProductsTable } from "./products-table";

function BackLink() {
  return (
    <Link href="/clientes" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold no-underline">
      <ArrowLeft size={16} aria-hidden />Clientes
    </Link>
  );
}

function WhatsappButton({ ruc }: { ruc: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    setBusy(true); setError(null);
    const { data, error: err } = await api.GET("/api/v1/customers/{ruc}/whatsapp-link", { params: { path: { ruc } } });
    setBusy(false);
    if (data) window.open(data.url, "_blank", "noopener");
    else setError(errorMessage(err, "No se pudo armar el enlace de WhatsApp."));
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={open} disabled={busy} className="whitespace-nowrap"><MessageCircle size={16} aria-hidden />{busy ? "Abriendo…" : "Escribir por WhatsApp"}</Button>
      {error && <p role="alert" className="m-0 max-w-[280px] text-right text-xs text-brand-strong">{error} Revisa el teléfono en Defontana.</p>}
    </div>
  );
}

export function CustomerDetail({ ruc }: { ruc: string }) {
  const { data: c, error, reload } = useQuery(
    () => api.GET("/api/v1/customers/{ruc}", { params: { path: { ruc } } }), [ruc], "No se pudo cargar la ficha del cliente.",
  );

  if (error) {
    const text = error.code === "outside_portfolio" ? "Este cliente no es de tu cartera, así que no puedes ver su ficha."
      : error.code === "customer_not_found" || error.code === "invalid_ruc" ? `No encontramos un cliente con el RUC ${ruc}.`
      : `${error.message} Revisa tu conexión e inténtalo de nuevo.`;
    return (
      <>
        <BackLink />
        <Notice className="flex items-center justify-between gap-4">
          <span>{text}</span>
          {!["outside_portfolio", "customer_not_found", "invalid_ruc"].includes(error.code ?? "") && <Button variant="outline" onClick={reload}>Reintentar</Button>}
        </Notice>
      </>
    );
  }
  if (!c) return <><BackLink /><p className="text-sm text-ink-muted">Cargando ficha…</p></>;

  const period = c.data_as_of ? `${formatMonthYear(twelveMonthStart(c.data_as_of))} a ${formatMonthYear(c.data_as_of)}` : "últimos 12 meses";

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink />
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-[26px] font-semibold tracking-[-0.015em]">{c.name}</h1>
              <LevelBadge level={c.level} />
              <OriginBadge origin="real" />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              RUC {c.ruc} · {c.customer_type ? CUSTOMER_TYPE[c.customer_type] : "—"} · {c.region ?? "Sin departamento"} · Vendedor {c.salesperson_code ?? "—"}
            </p>
          </div>
          <WhatsappButton ruc={c.ruc} />
        </header>
      </div>

      <section aria-label="Indicadores del cliente" className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Monto pedido 12 meses" value={formatPen(c.amount_12m)} hint={period} />
          <KpiCard label="Pedidos 12 meses" value={formatInt(c.order_count_12m)} />
          <KpiCard label="Pedido promedio" value={formatPen(c.average_order_amount_12m)} hint="Últimos 12 meses" />
          <KpiCard label="Compra cada" value={c.purchase_rhythm_days != null ? `${formatNumber(c.purchase_rhythm_days)} días` : "—"}
            hint={c.purchase_rhythm_days == null ? "Necesita al menos dos pedidos" : "Promedio de todo el historial"} />
          <KpiCard label="Última compra" value={formatDate(c.last_order_date)} />
          <KpiCard label="Monto histórico" value={formatPen(c.lifetime_amount)}
            hint={c.first_order_date ? `${formatInt(c.lifetime_order_count)} pedidos desde ${formatMonthYear(c.first_order_date)}` : "Sin pedidos"} />
        </div>
        <p className="m-0 text-xs text-ink-muted">
          Montos sin IGV, solo productos veterinarios y sin pedidos cancelados. Un pedido no es una venta facturada.
        </p>
      </section>

      <div className="grid grid-cols-2 items-start gap-5">
        <CommercialTermsCard ruc={c.ruc} levelsConfigured={c.levels_configured} />
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
          <h2 className="m-0 text-base font-semibold">Datos de contacto</h2>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-muted">Teléfono</dt><dd className="m-0">{c.phone || "Sin teléfono"}</dd>
            <dt className="text-ink-muted">Correo</dt><dd className="m-0 break-all">{c.email || "Sin correo"}</dd>
          </dl>
          <p className="m-0 text-xs text-ink-muted">Vienen de la ficha del cliente en Defontana.</p>
        </section>
      </div>

      <ProductsTable ruc={c.ruc} />
      <OrdersTable ruc={c.ruc} />
      <ContactsPanel ruc={c.ruc} />
    </>
  );
}
