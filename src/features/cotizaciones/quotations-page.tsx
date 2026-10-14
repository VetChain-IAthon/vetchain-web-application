"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { Pagination } from "@/components/data/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPen, formatPercent } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

type Customer = components["schemas"]["CustomerListItemOut"];
type Product = components["schemas"]["ProductOut"];
type Preview = components["schemas"]["QuotationPreviewOut"];
type Quotation = components["schemas"]["QuotationOut"];
type Line = { product: Product; quantity: string };

const CARD = "rounded-lg border border-line bg-surface p-6";
const FIELD = "mb-1 block text-xs font-semibold text-ink-muted";

export function QuotationsPage() {
  const { user } = useAuth();
  const manager = user?.role === "manager";
  const [customerText, setCustomerText] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [productText, setProductText] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [issued, setIssued] = useState<Quotation | null>(null);
  const [listPage, setListPage] = useState(1);
  const [detail, setDetail] = useState<Quotation | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setCustomerSearch(customerText.trim()), 350);
    return () => clearTimeout(timer);
  }, [customerText]);
  useEffect(() => {
    const timer = setTimeout(() => { setProductSearch(productText.trim()); setProductPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [productText]);

  const customers = useQuery(
    () => api.GET("/api/v1/customers", { params: { query: { search: customerSearch || undefined, page: 1, per_page: 6 } } }),
    [customerSearch], "No se pudo buscar clientes.",
  );
  const products = useQuery(
    () => api.GET("/api/v1/products", { params: { query: { search: productSearch || undefined, page: productPage, per_page: 8 } } }),
    [productSearch, productPage], "No se pudo cargar el catálogo.",
  );
  const quotations = useQuery(
    () => api.GET("/api/v1/quotations", { params: { query: { page: listPage, per_page: 10 } } }),
    [listPage], "No se pudo cargar las cotizaciones.",
  );

  const invalidatePreview = () => { setPreview(null); setPreviewError(null); setApprovalConfirmed(false); setApprovalNote(""); };
  const chooseCustomer = (item: Customer) => { setCustomer(item); setCustomerText(item.name); invalidatePreview(); };
  const addProduct = (product: Product) => {
    if (product.reference_price == null || lines.some((line) => line.product.code === product.code)) return;
    setLines([...lines, { product, quantity: "1" }]); invalidatePreview();
  };
  const updateQuantity = (code: string, quantity: string) => {
    setLines(lines.map((line) => line.product.code === code ? { ...line, quantity } : line)); invalidatePreview();
  };
  const removeProduct = (code: string) => { setLines(lines.filter((line) => line.product.code !== code)); invalidatePreview(); };
  const validLines = lines.length > 0 && lines.every((line) => Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0);
  const validDiscount = discount.trim() !== "" && Number.isFinite(Number(discount)) && Number(discount) >= 0 && Number(discount) <= 100;
  const canPreview = !!customer && validLines && validDiscount;
  const requestBody = () => ({
    ruc: customer!.ruc,
    lines: lines.map((line) => ({ product_code: line.product.code, quantity: Number(line.quantity) })),
    discount_pct: Number(discount),
  });

  async function calculatePreview() {
    if (!canPreview) return;
    setBusy(true); setPreviewError(null); setIssued(null);
    try {
      const { data, error } = await api.POST("/api/v1/quotation-previews", { body: requestBody() });
      if (!data) { setPreview(null); setPreviewError(errorMessage(error, "No se pudo calcular la vista previa.")); }
      else setPreview(data);
    } catch { setPreviewError("No hay conexión con el servidor de VetChain."); }
    finally { setBusy(false); }
  }

  async function issue() {
    if (!preview || !canPreview || (preview.approval_required && (!manager || !approvalConfirmed || !approvalNote.trim()))) return;
    setBusy(true); setPreviewError(null);
    try {
      const { data, error } = await api.POST("/api/v1/quotations", {
        body: { ...requestBody(), approval_confirmed: approvalConfirmed, approval_note: approvalNote.trim() || null },
      });
      if (!data) setPreviewError(errorMessage(error, "No se pudo emitir la cotización."));
      else { setIssued(data); setPreview(null); quotations.reload(); setDetail(data); }
    } catch { setPreviewError("No hay conexión con el servidor de VetChain."); }
    finally { setBusy(false); }
  }

  async function openDetail(id: number) {
    setDetailError(null);
    try {
      const { data, error } = await api.GET("/api/v1/quotations/{quotation_id}", { params: { path: { quotation_id: id } } });
      if (data) setDetail(data);
      else setDetailError(errorMessage(error, "No se pudo cargar la cotización."));
    } catch { setDetailError("No hay conexión con el servidor de VetChain."); }
  }

  return <>
    <PageHeader title={manager ? "Cotizaciones" : "Mis cotizaciones"} origin="estimated"
      subtitle="Precios basados en el último importe pagado, sin IGV. Una cotización emitida no se edita." />
    <Notice tone="warn">Los costos de compra no están validados. El margen se muestra como «—» y no se calcula rentabilidad.</Notice>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
      <div className="flex flex-col gap-4">
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold">1. Cliente</h2>
          <label className={FIELD} htmlFor="quotation-customer">Buscar por nombre o RUC</label>
          <Input id="quotation-customer" value={customerText} maxLength={100}
            onChange={(event) => { setCustomerText(event.target.value); setCustomer(null); invalidatePreview(); }}
            placeholder="Nombre o RUC del cliente" />
          {customers.error && <Notice className="mt-3">{customers.error.message}</Notice>}
          {customerText && !customer && <div className="mt-2 max-h-56 overflow-y-auto rounded border border-line">
            {customers.loading ? <p className="p-3 text-sm text-ink-muted">Buscando clientes…</p> :
              customers.data?.items.length ? customers.data.items.map((item) => <button key={item.ruc} type="button"
                onClick={() => chooseCustomer(item)} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-sm hover:bg-canvas">
                <span>{item.name}</span><span className="text-ink-muted">{item.ruc}</span>
              </button>) : <p className="p-3 text-sm text-ink-muted">No se encontraron clientes.</p>}
          </div>}
          {customer && <div className="mt-4 grid gap-3 rounded bg-canvas p-4 text-sm sm:grid-cols-3">
            <div><span className={FIELD}>Cliente seleccionado</span><strong>{customer.name}</strong><div className="text-ink-muted">{customer.ruc}</div></div>
            <div><span className={FIELD}>Nivel de volumen</span>{customer.level ? `Nivel ${customer.level}` : "Sin configurar"}</div>
            <div><span className={FIELD}>Pedidos de 12 meses, sin IGV</span>{formatPen(customer.amount_12m)} <OriginBadge origin="real" /></div>
          </div>}
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold">2. Productos veterinarios</h2>
          <p className="mb-4 mt-1 text-[13px] text-ink-muted">El precio de referencia es el último precio pagado en un pedido no cancelado.</p>
          <label className={FIELD} htmlFor="quotation-product">Buscar producto</label>
          <Input id="quotation-product" value={productText} maxLength={100} onChange={(event) => setProductText(event.target.value)} placeholder="Nombre o código" />
          {products.error ? <Notice className="mt-3">{products.error.message}</Notice> : products.loading && !products.data ?
            <p className="py-4 text-sm text-ink-muted">Cargando productos…</p> : products.data?.items.length ? <>
            <div className="mt-3 divide-y divide-line">
              {products.data.items.map((product) => <div key={product.code} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><strong>{product.name}</strong><div className="text-xs text-ink-muted">{product.code}</div></div>
                <div className="text-right"><div className="font-semibold tabular-nums">{formatPen(product.reference_price)}</div>
                  <div className="text-xs text-ink-muted">{product.reference_price == null ? "Sin precio de referencia" : "Estimado · sin IGV"}</div></div>
                <Button type="button" variant="outline" size="sm" disabled={product.reference_price == null || lines.some((line) => line.product.code === product.code)}
                  onClick={() => addProduct(product)}>Agregar</Button>
              </div>)}
            </div>
            <Pagination page={products.data.page} perPage={products.data.per_page} total={products.data.total}
              onPage={setProductPage} label="productos" />
          </> : <p className="py-4 text-sm text-ink-muted">No hay productos que coincidan con la búsqueda.</p>}
        </section>

        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold">3. Detalle de la cotización</h2>
          {!lines.length ? <p className="rounded bg-canvas p-5 text-sm text-ink-muted">Aún no agregaste productos. Elige uno del catálogo.</p> :
            <div className="divide-y divide-line">{lines.map((line) => <div key={line.product.code} className="flex items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1"><strong>{line.product.name}</strong><div className="text-ink-muted">{formatPen(line.product.reference_price)} por unidad</div></div>
              <label className="w-24"><span className={FIELD}>Cantidad</span><Input type="number" min="0.0001" step="0.0001" value={line.quantity}
                onChange={(event) => updateQuantity(line.product.code, event.target.value)} aria-label={`Cantidad de ${line.product.name}`} /></label>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeProduct(line.product.code)} aria-label={`Quitar ${line.product.name}`}>Quitar</Button>
            </div>)}</div>}
        </section>
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border-2 border-brand bg-surface p-6">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <label><span className={FIELD}>Descuento al cliente (%)</span>
          <Input type="number" min="0" max="100" step="0.01" value={discount}
            onChange={(event) => { setDiscount(event.target.value); invalidatePreview(); }} placeholder="Ingresa el descuento" /></label>
        <Button type="button" variant="outline" disabled={!canPreview || busy} onClick={calculatePreview}>
          {busy ? "Calculando…" : "Calcular vista previa"}
        </Button>
        {previewError && <Notice>{previewError}</Notice>}
        {preview && <>
          <div className="grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-sm">
            <span>Nivel</span><strong className="text-right">{preview.level}</strong>
            <span>Descuento máximo del nivel</span><strong className="text-right">{formatPercent(preview.max_discount_pct)}</strong>
            <span>Crédito</span><strong className="text-right">{preview.credit_days} días</strong>
            <span>Subtotal</span><strong className="text-right tabular-nums">{formatPen(preview.subtotal)}</strong>
            <span>Descuento</span><strong className="text-right tabular-nums">− {formatPen(preview.discount_amount)}</strong>
            <span>Valor sin IGV</span><strong className="text-right tabular-nums">{formatPen(preview.net)}</strong>
            <span>IGV ({formatPercent(preview.igv_rate_pct, 0)})</span><strong className="text-right tabular-nums">{formatPen(preview.igv)}</strong>
            <span className="border-t border-line pt-3 text-lg font-semibold">Total</span><strong className="border-t border-line pt-3 text-right text-lg tabular-nums">{formatPen(preview.total_with_tax)}</strong>
            {manager && <><span>Margen</span><strong className="text-right">{formatPercent(preview.margin_pct)}</strong></>}
          </div>
          {preview.warnings.includes("no_cost_data") && <Notice tone="warn">Sin costos validados: el margen no está disponible.</Notice>}
          {preview.approval_required && <Notice tone="warn">El descuento supera el máximo permitido y requiere aprobación de gerencia antes de emitir.</Notice>}
          {preview.approval_required && manager && <>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)} /> Confirmo que la aprobación se obtuvo fuera de VetChain.</label>
            <label><span className={FIELD}>Nota de aprobación</span><Input value={approvalNote} maxLength={1000}
              onChange={(event) => setApprovalNote(event.target.value)} placeholder="Quién aprobó y por qué" /></label>
          </>}
          <Button type="button" disabled={busy || (preview.approval_required && (!manager || !approvalConfirmed || !approvalNote.trim()))}
            onClick={issue}>Emitir cotización</Button>
          <p className="text-xs text-ink-muted">La emisión recalcula los importes. Vigencia: {preview.quotation_validity_days} días.</p>
        </>}
        {issued && <Notice tone="warn">Cotización #{issued.id} emitida. Válida hasta el {formatDate(issued.valid_until)}.</Notice>}
      </aside>
    </div>

    <section className={CARD}>
      <h2 className="mb-4 text-lg font-semibold">{manager ? "Cotizaciones emitidas" : "Cotizaciones de mi cartera"}</h2>
      {quotations.error ? <Notice>{quotations.error.message} <Button variant="outline" onClick={quotations.reload}>Reintentar</Button></Notice> :
        !quotations.data ? <p className="py-4 text-sm text-ink-muted">Cargando cotizaciones…</p> :
        quotations.data.items.length === 0 ? <p className="py-4 text-sm text-ink-muted">Todavía no hay cotizaciones emitidas.</p> : <>
          <Table><THead><TR><TH>Número</TH><TH>Cliente</TH><TH>Emisión</TH><TH>Estado</TH><TH numeric>Total con IGV</TH><TH>Detalle</TH></TR></THead>
            <TBody>{quotations.data.items.map((item) => <TR key={item.id}><TD>#{item.id}</TD><TD>{item.ruc}</TD>
              <TD>{formatDate(item.issued_on)}</TD><TD>{item.status}</TD><TD numeric>{formatPen(item.total_with_tax)}</TD>
              <TD><Button variant="ghost" size="sm" onClick={() => openDetail(item.id)}>Ver</Button></TD></TR>)}</TBody></Table>
          <Pagination page={quotations.data.page} perPage={quotations.data.per_page} total={quotations.data.total}
            onPage={setListPage} label="cotizaciones" />
        </>}
      {detailError && <Notice>{detailError}</Notice>}
      {detail && <div className="mt-5 rounded border border-line bg-canvas p-5 text-sm">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Cotización #{detail.id} · {detail.ruc}</h3>
          <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Cerrar</Button></div>
        <p className="my-2 text-ink-muted">Emitida el {formatDate(detail.issued_on)} · válida hasta el {formatDate(detail.valid_until)} · sin edición</p>
        <ul className="my-3 space-y-1">{detail.lines.map((line) => <li key={line.product_code}>{line.product_code} · {line.quantity} × {formatPen(line.unit_price)} = {formatPen(line.amount)}</li>)}</ul>
        <strong>Total con IGV: {formatPen(detail.total_with_tax)}</strong> <OriginBadge origin="estimated" />
      </div>}
    </section>
  </>;
}
