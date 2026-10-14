"use client";

import { MessageCircle, Search } from "lucide-react";
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
import { downloadQuotationCsv, downloadQuotationPdf, sendQuotationByWhatsApp } from "./quotation-exports";

type Customer = components["schemas"]["CustomerListItemOut"];
type CommercialTerms = components["schemas"]["CommercialTermsOut"];
type ProductPurchases = components["schemas"]["ProductPurchasesOut"];
type Product = components["schemas"]["ProductOut"];
type Preview = components["schemas"]["QuotationPreviewOut"];
type Quotation = components["schemas"]["QuotationOut"];
type Line = { product: Product; quantity: string };

const CARD = "rounded-lg border border-line bg-surface p-6";

/** Cotización en curso que se conserva al cambiar de pantalla (por usuario, en este navegador). */
type Draft = { customer: Customer | null; customerText: string; lines: Line[]; discount: string; preview: Preview | null;
  issued: Quotation | null; approvalConfirmed: boolean; approvalNote: string };
const draftKey = (userId: number) => `vetchain:quotation-draft:${userId}`;
function readDraft(userId: number): Draft | null {
  try { const raw = localStorage.getItem(draftKey(userId)); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; }
}
function writeDraft(userId: number, draft: Draft | null) {
  try { if (draft) localStorage.setItem(draftKey(userId), JSON.stringify(draft)); else localStorage.removeItem(draftKey(userId)); } catch { /* sin almacenamiento: el borrador solo vive en esta pantalla */ }
}
const FIELD = "mb-1.5 block text-[13px] font-semibold text-ink-muted";
const PRODUCTS_PER_PAGE = 8;

/** Trae el catálogo completo (115 códigos) en páginas de 100 para cruzarlo con lo que compra el cliente. */
async function loadWholeCatalog() {
  const first = await api.GET("/api/v1/products", { params: { query: { page: 1, per_page: 100 } } });
  if (!first.data) return first;
  const items = [...first.data.items];
  for (let page = 2; items.length < first.data.total; page++) {
    const next = await api.GET("/api/v1/products", { params: { query: { page, per_page: 100 } } });
    if (!next.data) return next;
    if (!next.data.items.length) break;
    items.push(...next.data.items);
  }
  return { data: { ...first.data, items } };
}

export function QuotationsPage() {
  const { user } = useAuth();
  const manager = user?.role === "manager";
  const [customerText, setCustomerText] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [commercialTerms, setCommercialTerms] = useState<CommercialTerms | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [productPurchases, setProductPurchases] = useState<ProductPurchases | null>(null);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [productText, setProductText] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [issued, setIssued] = useState<Quotation | null>(null);
  const [shareFormat, setShareFormat] = useState<"text" | "pdf">("text");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [detail, setDetail] = useState<Quotation | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // Se recupera después de montar (no en el estado inicial) para que el HTML del servidor y el del navegador coincidan.
  useEffect(() => {
    if (!user || restored) return;
    const draft = readDraft(user.id);
    if (draft) {
      setCustomer(draft.customer); setCustomerText(draft.customerText); setLines(draft.lines); setDiscount(draft.discount);
      setPreview(draft.preview); setIssued(draft.issued); setApprovalConfirmed(draft.approvalConfirmed); setApprovalNote(draft.approvalNote);
    }
    setRestored(true);
  }, [user, restored]);
  useEffect(() => {
    if (!user || !restored) return;
    const empty = !customer && !customerText && !lines.length && !discount;
    writeDraft(user.id, empty ? null : { customer, customerText, lines, discount, preview, issued, approvalConfirmed, approvalNote });
  }, [user, restored, customer, customerText, lines, discount, preview, issued, approvalConfirmed, approvalNote]);

  useEffect(() => {
    const timer = setTimeout(() => setCustomerSearch(customerText.trim()), 350);
    return () => clearTimeout(timer);
  }, [customerText]);
  useEffect(() => {
    const timer = setTimeout(() => { setProductSearch(productText.trim()); setProductPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [productText]);
  useEffect(() => {
    if (!customer) { setCommercialTerms(null); setTermsError(null); setTermsLoading(false); return; }
    let active = true;
    setCommercialTerms(null); setTermsError(null); setTermsLoading(true);
    api.GET("/api/v1/customers/{ruc}/commercial-terms", { params: { path: { ruc: customer.ruc } } })
      .then(({ data, error }) => {
        if (!active) return;
        if (data) setCommercialTerms(data);
        else setTermsError(errorMessage(error, "No se pudo cargar el descuento máximo de Ajustes."));
      })
      .catch(() => { if (active) setTermsError("No hay conexión con el servidor de VetChain."); })
      .finally(() => { if (active) setTermsLoading(false); });
    return () => { active = false; };
  }, [customer]);
  useEffect(() => {
    if (!customer) { setProductPurchases(null); setPurchasesError(null); return; }
    let active = true;
    setProductPurchases(null); setPurchasesError(null);
    api.GET("/api/v1/customers/{ruc}/products", { params: { path: { ruc: customer.ruc } } })
      .then(({ data, error }) => {
        if (!active) return;
        if (data) setProductPurchases(data);
        else setPurchasesError(errorMessage(error, "No se pudo cargar el historial de productos del cliente."));
      })
      .catch(() => { if (active) setPurchasesError("No hay conexión con el servidor de VetChain."); });
    return () => { active = false; };
  }, [customer]);
  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  const customers = useQuery(
    () => api.GET("/api/v1/customers", { params: { query: { search: customerSearch || undefined, page: 1, per_page: 6 } } }),
    [customerSearch], "No se pudo buscar clientes.",
  );
  const topCustomers = useQuery(
    () => api.GET("/api/v1/customers", { params: { query: { page: 1, per_page: 5 } } }),
    [], "No se pudo cargar los clientes principales.",
  );
  const products = useQuery(
    () => customer && !productSearch ? loadWholeCatalog()
      : api.GET("/api/v1/products", { params: { query: { search: productSearch || undefined, page: productPage, per_page: PRODUCTS_PER_PAGE } } }),
    [customer, productSearch, customer && !productSearch ? 0 : productPage], "No se pudo cargar el catálogo.",
  );
  const quotations = useQuery(
    () => api.GET("/api/v1/quotations", { params: { query: { page: listPage, per_page: 10 } } }),
    [listPage], "No se pudo cargar las cotizaciones.",
  );

  const startOver = () => {
    setCustomer(null); setCustomerText(""); setLines([]); setDiscount(""); setProductText(""); setProductPage(1); invalidatePreview();
  };
  const invalidatePreview = () => { setPreview(null); setPreviewOpen(false); setIssued(null); setPreviewError(null); setActionStatus(null); setApprovalConfirmed(false); setApprovalNote(""); };
  const chooseCustomer = (item: Customer) => { setCustomer(item); setCustomerText(item.name); setProductPage(1); invalidatePreview(); };
  const addProduct = (product: Product) => {
    if (product.reference_price == null || lines.some((line) => line.product.code === product.code)) return;
    setLines([...lines, { product, quantity: "1" }]); invalidatePreview();
  };
  const updateQuantity = (code: string, quantity: string) => {
    setLines(lines.map((line) => line.product.code === code ? { ...line, quantity } : line)); invalidatePreview();
  };
  const adjustQuantity = (code: string, difference: number) => {
    const line = lines.find((item) => item.product.code === code);
    if (!line) return;
    const current = Number(line.quantity);
    updateQuantity(code, String(Math.max(1, (Number.isFinite(current) ? current : 0) + difference)));
  };
  const removeProduct = (code: string) => { setLines(lines.filter((line) => line.product.code !== code)); invalidatePreview(); };
  const validLines = lines.length > 0 && lines.every((line) => Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0);
  const validDiscount = discount.trim() !== "" && Number.isFinite(Number(discount)) && Number(discount) >= 0 && Number(discount) <= 100;
  const discountOverMaximum = commercialTerms && validDiscount && Number(discount) > commercialTerms.max_discount_pct;
  const canPreview = !!customer && validLines && validDiscount;
  const canIssue = canPreview && !!commercialTerms;
  const quoteForActions = issued ?? preview;
  const productNames = new Map(lines.map((line) => [line.product.code, line.product.name]));
  const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
  const estimatedSubtotal = validLines ? roundMoney(lines.reduce((sum, line) => sum + roundMoney((line.product.reference_price ?? 0) * Number(line.quantity)), 0)) : null;
  const estimatedDiscount = estimatedSubtotal != null && validDiscount ? roundMoney(estimatedSubtotal * Number(discount) / 100) : null;
  const estimatedNet = estimatedSubtotal != null && estimatedDiscount != null ? roundMoney(estimatedSubtotal - estimatedDiscount) : null;
  const estimatedIgv = estimatedNet != null ? roundMoney(estimatedNet * 0.18) : null;
  const shownTotals = quoteForActions ? {
    subtotal: quoteForActions.subtotal, discount: quoteForActions.discount_amount, net: quoteForActions.net,
    igv: quoteForActions.igv, total: quoteForActions.total_with_tax,
  } : {
    subtotal: estimatedSubtotal, discount: estimatedDiscount, net: estimatedNet,
    igv: estimatedIgv, total: estimatedNet != null && estimatedIgv != null ? roundMoney(estimatedNet + estimatedIgv) : null,
  };
  const actionsReady = !!quoteForActions && (!preview?.approval_required || !!issued);
  const actionMessage = !lines.length ? "Agrega productos para armar la cotización."
    : !customer ? "Selecciona un cliente para continuar."
    : !validLines ? "Revisa las cantidades de los productos."
    : !validDiscount ? "Ingresa un descuento entre 0 y 100 %."
    : !commercialTerms ? "Puedes ver los importes provisionales. Completa las reglas de Ajustes para emitir y compartir la cotización."
    : preview?.approval_required ? "La cotización requiere aprobación de gerencia antes de compartirla."
    : !quoteForActions ? "Calcula la vista previa para habilitar las acciones."
    : issued ? "Cotización emitida y lista para compartir." : "Vista previa lista para descargar o compartir.";
  const purchaseByCode = new Map(productPurchases?.items.map((item) => [item.product_code, item]) ?? []);
  const preferredProducts = customer && !productSearch && productPurchases?.items.length
    ? productPurchases.items.map((item) => products.data?.items.find((product) => product.code === item.product_code)).filter((item): item is Product => !!item)
    : null;
  const shownProducts = preferredProducts?.length
    ? preferredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE)
    : products.data?.items ?? [];
  const requestBody = () => ({
    ruc: customer!.ruc,
    lines: lines.map((line) => ({ product_code: line.product.code, quantity: Number(line.quantity) })),
    discount_pct: Number(discount),
  });

  async function calculatePreview() {
    if (!canPreview) return;
    if (issued) { setPreviewOpen(true); return; }
    setBusy(true); setPreview(null); setPreviewError(null); setIssued(null); setActionStatus(null);
    if (!commercialTerms) { setPreviewOpen(true); setBusy(false); return; }
    try {
      const { data, error } = await api.POST("/api/v1/quotation-previews", { body: requestBody() });
      if (!data) { setPreview(null); setPreviewError(errorMessage(error, "No se pudo calcular la vista previa.")); }
      else { setPreview(data); setPreviewOpen(true); }
    } catch { setPreviewError("No hay conexión con el servidor de VetChain."); }
    finally { setBusy(false); }
  }

  async function issue() {
    if (!preview || !canIssue || (preview.approval_required && (!manager || !approvalConfirmed || !approvalNote.trim()))) return;
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

  function exportData() {
    if (!quoteForActions || !customer) return null;
    return { quote: quoteForActions, customerName: customer.name, customerRuc: customer.ruc, productNames };
  }

  async function shareByWhatsApp() {
    const data = exportData();
    if (!data) return;
    const result = await sendQuotationByWhatsApp(data, shareFormat);
    setActionStatus({
      text: "Se abrió WhatsApp con el cliente, los productos y los totales. Elige el contacto y envía el mensaje.",
      shared: "Se compartió la cotización con el PDF adjunto.",
      cancelled: "Cerraste el menú de compartir sin enviar. Vuelve a pulsar «Enviar por WhatsApp» cuando quieras.",
      downloaded: "Este navegador no permite adjuntar archivos desde la web: se descargó el PDF y se abrió WhatsApp con el mensaje. Arrastra el PDF al chat y envía.",
    }[result]);
  }

  return <>
    <PageHeader title={manager ? "Cotizaciones" : "Mis cotizaciones"} origin="estimated"
      subtitle="Nueva cotización · los precios se basan en el último importe pagado, sin IGV"
      actions={customer || lines.length ? <Button type="button" variant="outline" onClick={startOver}>Empezar otra cotización</Button> : undefined} />

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
      <div className="flex flex-col gap-4">
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold">1. Cliente</h2>
          <label className="relative block" htmlFor="quotation-customer">
            <span className="sr-only">Buscar cliente por nombre o RUC</span>
            <Search size={18} className="absolute left-3 top-3 text-ink-muted" aria-hidden />
            <Input id="quotation-customer" value={customerText} maxLength={100}
              onChange={(event) => { setCustomerText(event.target.value); setCustomer(null); invalidatePreview(); }}
              placeholder="Buscar cliente por nombre o RUC" className="h-11 pl-10" />
          </label>
          {customers.error && <Notice className="mt-3">{customers.error.message}</Notice>}
          {customerText && !customer && <div className="mt-2 max-h-56 overflow-y-auto rounded border border-line">
            {customers.loading ? <p className="p-3 text-sm text-ink-muted">Buscando clientes…</p> :
              customers.data?.items.length ? customers.data.items.map((item) => <button key={item.ruc} type="button"
                onClick={() => chooseCustomer(item)} className="flex w-full justify-between border-b border-line px-3 py-2 text-left text-sm hover:bg-canvas">
                <span>{item.name}</span><span className="text-ink-muted">{item.ruc}</span>
              </button>) : <p className="p-3 text-sm text-ink-muted">No se encontraron clientes.</p>}
          </div>}
          <p className="mb-2 mt-4 text-sm text-ink-muted">Mayores clientes por monto de pedidos de 12 meses:</p>
          {topCustomers.error ? <Notice>{topCustomers.error.message}</Notice> :
            topCustomers.data && <div role="group" aria-label="Clientes principales" className="flex flex-wrap gap-2">
              {topCustomers.data.items.map((item) => <button key={item.ruc} type="button"
                aria-pressed={customer?.ruc === item.ruc} onClick={() => chooseCustomer(item)}
                className={customer?.ruc === item.ruc
                  ? "min-h-11 rounded-sm border border-brand bg-brand px-4 py-2 text-left text-sm font-semibold text-white"
                  : "min-h-11 rounded-sm border border-line-strong bg-surface px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas"}>
                {item.name}
              </button>)}
            </div>}
          {customer && <div className="mt-4 space-y-3 text-base">
            {termsError && <Notice>{termsError} Revisa las reglas de nivel en Ajustes.</Notice>}
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div className="rounded bg-canvas p-4"><span className={FIELD}>Cliente seleccionado</span><strong className="text-lg">{customer.name}</strong><div className="mt-0.5 text-sm text-ink-muted">RUC {customer.ruc}</div></div>
              <div className="rounded bg-canvas p-4"><span className={FIELD}>Nivel de volumen</span><strong className="text-lg">{commercialTerms ? `Nivel ${commercialTerms.level}` : termsLoading ? "Calculando…" : "Sin configurar"}</strong></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded bg-canvas p-4"><span className={FIELD}>Pedidos de 12 meses</span><strong className="text-lg">{formatPen(customer.amount_12m)}</strong> <OriginBadge origin="real" /></div>
              <label className="rounded bg-canvas p-4"><span className={FIELD}>Descuento a este cliente (%)</span><Input className="h-11 text-base" type="number" min="0" max="100" step="0.01" value={discount}
                onChange={(event) => { setDiscount(event.target.value); invalidatePreview(); }} placeholder="Ingresa el descuento" />
                <span className="mt-1.5 block text-[13px] text-ink-muted">Máximo sin aprobación: {commercialTerms ? formatPercent(commercialTerms.max_discount_pct) : termsLoading ? "Cargando…" : "Sin configurar"}</span>
              </label>
              <div className="rounded bg-canvas p-4"><span className={FIELD}>Condición de pago</span><strong className="text-lg">{commercialTerms ? `${commercialTerms.credit_days} días` : "Por calcular"}</strong></div>
            </div>
            {discountOverMaximum && <Notice tone="warn">Este descuento supera el máximo de Ajustes. La cotización requerirá aprobación de gerencia.</Notice>}
            <p className="text-[13px] text-ink-muted">El nivel y la condición de pago se calculan con las reglas de Ajustes. El monto de pedidos es real y no incluye IGV.</p>
          </div>}
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold">2. Productos</h2>
          <p className="mb-4 mt-1 text-[13px] text-ink-muted">El precio de referencia es el último precio pagado en un pedido no cancelado.</p>
          <label className={FIELD} htmlFor="quotation-product">Buscar producto</label>
          <Input id="quotation-product" value={productText} maxLength={100} onChange={(event) => setProductText(event.target.value)} placeholder="Nombre o código" />
          {customer && !productSearch && preferredProducts?.length ? <p className="mt-3 text-xs text-ink-muted">Productos que más compra este cliente, ordenados por monto de pedidos. Busca para ver todo el catálogo.</p> : null}
          {purchasesError && <Notice className="mt-3">{purchasesError}</Notice>}
          {products.error ? <Notice className="mt-3">{products.error.message}</Notice> : products.loading && !products.data ?
            <p className="py-4 text-sm text-ink-muted">Cargando productos…</p> : shownProducts.length ? <>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_110px_76px] items-center gap-3 border-b border-line pb-2 text-xs font-semibold text-ink-muted sm:grid-cols-[minmax(0,1fr)_130px_90px]"><span>Producto</span><span className="text-right">Precio unitario</span><span className="text-center">Acción</span></div>
            <div className="divide-y divide-line">
              {shownProducts.map((product) => {
                const selected = lines.some((line) => line.product.code === product.code);
                const purchase = purchaseByCode.get(product.code);
                const averageQuantity = purchase && purchase.times_ordered > 0 ? Math.round(purchase.total_quantity / purchase.times_ordered) : null;
                return <div key={product.code} className="grid grid-cols-[minmax(0,1fr)_110px_76px] items-center gap-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_130px_90px]">
                <div className="min-w-0"><strong className="break-words">{product.name}</strong>
                  <div className="text-xs text-ink-muted">{averageQuantity != null
                    ? `Promedio por pedido: ${averageQuantity} ${averageQuantity === 1 ? "unidad" : "unidades"} · ${product.code}`
                    : product.code}</div></div>
                <div className="text-right"><div className="font-semibold tabular-nums">{formatPen(product.reference_price)}</div>
                  <div className="text-xs text-ink-muted">{product.reference_price == null ? "Sin precio de referencia" : "Estimado · sin IGV"}</div></div>
                <Button type="button" size="sm" variant={selected ? "outline" : "primary"} aria-pressed={selected}
                  disabled={product.reference_price == null && !selected}
                  onClick={() => selected ? removeProduct(product.code) : addProduct(product)}>{selected ? "Quitar" : "Agregar"}</Button>
              </div>;})}
            </div>
            {preferredProducts?.length ? <Pagination page={productPage} perPage={PRODUCTS_PER_PAGE} total={preferredProducts.length}
              onPage={setProductPage} label="productos del cliente" /> : null}
            {!preferredProducts?.length && products.data && <Pagination page={products.data.page} perPage={products.data.per_page} total={products.data.total}
              onPage={setProductPage} label="productos" />}
          </> : <p className="py-4 text-sm text-ink-muted">No hay productos que coincidan con la búsqueda.</p>}
        </section>

        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold">3. Detalle de la cotización</h2>
          {!lines.length ? <p className="rounded bg-canvas p-5 text-sm text-ink-muted">Aún no agregaste productos. Elige uno del catálogo.</p> :
            <div className="divide-y divide-line">{lines.map((line) => <div key={line.product.code} className="grid gap-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0"><strong>{line.product.name}</strong><div className="text-ink-muted">{formatPen(line.product.reference_price)} por unidad · estimado, sin IGV</div>
                <div className="mt-1 font-semibold tabular-nums">{line.product.reference_price != null && Number(line.quantity) > 0 ? formatPen(line.product.reference_price * Number(line.quantity)) : "—"}</div></div>
              <div role="group" aria-label={`Cantidad de ${line.product.name}`} className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={Number(line.quantity) <= 1}
                  onClick={() => adjustQuantity(line.product.code, -1)} aria-label={`Menos unidades de ${line.product.name}`}>−</Button>
                <Input className="w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  type="number" min="0.0001" step="any" value={line.quantity}
                  onChange={(event) => updateQuantity(line.product.code, event.target.value)} aria-label={`Cantidad de ${line.product.name}`} />
                <Button type="button" variant="outline" size="sm" onClick={() => adjustQuantity(line.product.code, 1)}
                  aria-label={`Más unidades de ${line.product.name}`}>+</Button>
              </div>
            </div>)}</div>}
        </section>
      </div>

      <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto rounded-lg border-2 border-brand bg-surface p-6">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <Notice tone="warn" className="px-4 py-3 text-xs">Los costos de compra no están validados. El margen no está disponible.</Notice>
        <div className="grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-sm">
          <span className="text-ink-muted">Subtotal</span><span className="text-right tabular-nums">{formatPen(shownTotals.subtotal)}</span>
          <span className="text-ink-muted">Descuento</span><span className="text-right tabular-nums">{shownTotals.discount != null ? `− ${formatPen(shownTotals.discount)}` : "—"}</span>
          <span className="text-ink-muted">Valor de venta</span><span className="text-right tabular-nums">{formatPen(shownTotals.net)}</span>
          <span className="text-ink-muted">IGV ({preview ? formatPercent(preview.igv_rate_pct, 0) : "18 %"})</span><span className="text-right tabular-nums">{formatPen(shownTotals.igv)}</span>
          <span className="border-t border-line pt-3 text-lg font-semibold">Total</span><strong className="border-t border-line pt-3 text-right text-lg tabular-nums">{formatPen(shownTotals.total)}</strong>
          {manager && <><span className="text-ink-muted">Margen</span><strong className="text-right">{formatPercent(quoteForActions?.margin_pct)}</strong></>}
        </div>
        {!quoteForActions && estimatedSubtotal != null && <p className="text-xs text-ink-muted">Importes provisionales con precios de referencia. La vista previa del servidor confirma el total.</p>}
        <p className="rounded bg-canvas p-4 text-sm font-medium text-ink-2">{actionMessage}</p>
        <Button type="button" variant="outline" className="h-12 flex-none text-[15px]" disabled={!canPreview || busy} onClick={calculatePreview}>
          {busy ? "Calculando…" : "Ver vista previa"}
        </Button>
        {previewError && <Notice>{previewError}</Notice>}
        {preview && <>
          <p className="text-xs text-ink-muted">Nivel {preview.level} · descuento máximo {formatPercent(preview.max_discount_pct)} · crédito {preview.credit_days} días</p>
          {preview.warnings.includes("no_cost_data") && <Notice tone="warn">Sin costos validados: el margen no está disponible.</Notice>}
          {preview.approval_required && <Notice tone="warn">El descuento supera el máximo permitido y requiere aprobación de gerencia antes de emitir.</Notice>}
          {preview.approval_required && manager && <>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approvalConfirmed}
              onChange={(event) => setApprovalConfirmed(event.target.checked)} /> Confirmo que la aprobación se obtuvo fuera de VetChain.</label>
            <label><span className={FIELD}>Nota de aprobación</span><Input value={approvalNote} maxLength={1000}
              onChange={(event) => setApprovalNote(event.target.value)} placeholder="Quién aprobó y por qué" /></label>
          </>}
          <Button type="button" className="h-12 flex-none text-[15px]" disabled={busy || (preview.approval_required && (!manager || !approvalConfirmed || !approvalNote.trim()))}
            onClick={issue}>Emitir cotización</Button>
          <p className="text-xs text-ink-muted">La emisión recalcula los importes. Vigencia: {preview.quotation_validity_days} días.</p>
        </>}
        {issued && <Notice tone="warn">Cotización #{issued.id} emitida. Válida hasta el {formatDate(issued.valid_until)}.</Notice>}
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" disabled={!actionsReady}
            onClick={() => { const data = exportData(); if (data) { downloadQuotationPdf(data); setActionStatus("Se descargó la cotización en PDF."); } }}>
            Descargar cotización (PDF)
          </Button>
          <Button type="button" variant="outline" disabled={!actionsReady}
            onClick={() => { const data = exportData(); if (data) { downloadQuotationCsv(data); setActionStatus("Se descargó el archivo CSV para Excel."); } }}>
            Descargar para Excel (CSV)
          </Button>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <span className="text-xs text-ink-muted">Enviar como</span>
            <div role="group" aria-label="Formato del mensaje" className="flex overflow-hidden rounded border border-line-strong">
              <button type="button" aria-pressed={shareFormat === "text"} onClick={() => setShareFormat("text")}
                className={shareFormat === "text" ? "bg-green-50 px-3 py-2 text-xs font-semibold text-green-800" : "px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-canvas"}>Texto</button>
              <button type="button" aria-pressed={shareFormat === "pdf"} onClick={() => setShareFormat("pdf")}
                className={shareFormat === "pdf" ? "bg-green-50 px-3 py-2 text-xs font-semibold text-green-800" : "px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-canvas"}>PDF adjunto</button>
            </div>
          </div>
          <Button type="button" className="bg-green-700 hover:bg-green-800" disabled={!actionsReady} onClick={shareByWhatsApp}>
            <MessageCircle size={17} aria-hidden /> Enviar por WhatsApp
          </Button>
        </div>
        {actionStatus && <p role="status" className="rounded border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-900">{actionStatus}</p>}
        <p className="text-xs leading-relaxed text-ink-muted">{shareFormat === "pdf" ? "En PDF se abre el menú de compartir del sistema: elige WhatsApp y el PDF va adjunto con el mensaje. " : "En texto, el mensaje lleva el cliente, los productos y los totales. "}{preview ? `Vigencia: ${preview.quotation_validity_days} días.` : issued ? `Válida hasta el ${formatDate(issued.valid_until)}.` : ""}</p>
      </aside>
    </div>

    {previewOpen && customer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="quotation-preview-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg bg-surface p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div><h2 id="quotation-preview-title" className="text-2xl font-semibold">{issued ? `Cotización #${issued.id}` : "Vista previa de cotización"}</h2>
            <p className="mt-1 text-sm text-ink-muted">Mederi Pharma · {issued ? `válida hasta el ${formatDate(issued.valid_until)}` : "no emitida"}</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        </div>
        {!quoteForActions && <Notice tone="warn" className="mt-5">Vista previa provisional con precios de referencia e IGV de 18 %. Faltan configurar las reglas de Ajustes; todavía no se puede emitir ni compartir esta cotización.</Notice>}
        {preview && <p className="mt-5 text-sm text-ink-muted">Calculada por VetChain · nivel {preview.level} · crédito {preview.credit_days} días · vigencia {preview.quotation_validity_days} días desde la emisión.</p>}
        {issued && <p className="mt-5 text-sm text-ink-muted">Emitida por VetChain el {formatDate(issued.issued_on)}.</p>}
        <div className="my-5 rounded bg-canvas p-4 text-sm"><span className="block text-xs font-semibold text-ink-muted">Cliente</span>
          <strong>{customer.name}</strong><span className="ml-2 text-ink-muted">RUC {customer.ruc}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-ink-muted"><th className="py-3 pr-3">Producto</th><th className="px-3 py-3 text-right">Cantidad</th><th className="px-3 py-3 text-right">Precio unitario</th><th className="py-3 pl-3 text-right">Importe</th></tr></thead>
          <tbody>{lines.map((line) => {
            const calculated = quoteForActions?.lines.find((item) => item.product_code === line.product.code);
            return <tr key={line.product.code} className="border-b border-line"><td className="py-3 pr-3 font-medium">{line.product.name}</td>
              <td className="px-3 py-3 text-right tabular-nums">{line.quantity}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPen(calculated?.unit_price ?? line.product.reference_price)}</td>
              <td className="py-3 pl-3 text-right tabular-nums">{formatPen(calculated?.amount ?? roundMoney((line.product.reference_price ?? 0) * Number(line.quantity)))}</td></tr>;
          })}</tbody>
        </table></div>
        <dl className="ml-auto mt-5 grid max-w-xs grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">Subtotal</dt><dd className="text-right tabular-nums">{formatPen(shownTotals.subtotal)}</dd>
          <dt className="text-ink-muted">Descuento ({formatPercent(Number(discount), 2)})</dt><dd className="text-right tabular-nums">− {formatPen(shownTotals.discount)}</dd>
          <dt className="text-ink-muted">Valor de venta</dt><dd className="text-right tabular-nums">{formatPen(shownTotals.net)}</dd>
          <dt className="text-ink-muted">IGV ({preview ? formatPercent(preview.igv_rate_pct, 0) : "18 %"})</dt><dd className="text-right tabular-nums">{formatPen(shownTotals.igv)}</dd>
          <dt className="border-t border-line pt-3 text-lg font-semibold">Total</dt><dd className="border-t border-line pt-3 text-right text-lg font-semibold tabular-nums">{formatPen(shownTotals.total)}</dd>
        </dl>
        {preview?.approval_required && <Notice tone="warn" className="mt-5">El descuento requiere aprobación de gerencia antes de emitir.</Notice>}
      </section>
    </div>}

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
