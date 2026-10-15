"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { OriginBadge } from "@/components/data/origin-badge";
import { api, errorMessage } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import type { components } from "@/lib/api/schema";

type Forecast = components["schemas"]["ForecastComparisonOut"];
type Explanation = components["schemas"]["ForecastExplanationOut"];

export function ProductForecastPage() {
  const [productId, setProductId] = useState("");
  const [scenario, setScenario] = useState<"A" | "B">("A");
  const [horizon, setHorizon] = useState<1 | 3>(1);
  const [cutoff, setCutoff] = useState("");
  const [result, setResult] = useState<Forecast | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explanationError, setExplanationError] = useState("");
  const [explaining, setExplaining] = useState(false);
  const products = useQuery(() => api.GET("/api/v1/products", { params: { query: { search: productId || undefined, per_page: 30 } } }),
    [productId], "");

  async function calculate() {
    if (!productId.trim()) return;
    setBusy(true); setError(""); setResult(null); setExplanation(null); setExplanationError("");
    try {
      const response = await api.GET("/api/v1/prediction/forecasts", {
        params: { query: { product_id: productId.trim(), scenario, horizon, cutoff: cutoff || undefined } },
      });
      if (response.error) setError(errorMessage(response.error, "No se pudo calcular el pronóstico."));
      else setResult(response.data ?? null);
    } catch {
      setError("No se pudo consultar el pronóstico.");
    } finally { setBusy(false); }
  }

  async function explain() {
    if (!result) return;
    setExplaining(true); setExplanationError(""); setExplanation(null);
    try {
      const response = await api.POST("/api/v1/prediction/forecasts/explanation", {
        body: { product_id: result.product_id, scenario: result.scenario, horizon: result.horizon_months, cutoff: result.cutoff_month },
      });
      if (response.error) setExplanationError(errorMessage(response.error, "No se pudo explicar el pronóstico."));
      else setExplanation(response.data ?? null);
    } catch {
      setExplanationError("No se pudo explicar el pronóstico.");
    } finally { setExplaining(false); }
  }

  return <div className="space-y-6">
    <Link href="/reportes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline"><ArrowLeft size={16} aria-hidden />Reportes</Link>
    <PageHeader title="Pronóstico por producto" subtitle="Comparación de promedio móvil de seis meses y Extra Trees" origin="estimated" />
    <Card className="space-y-5 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="text-sm font-semibold">Producto
          <input list="forecast-products" className="mt-1 block h-11 w-full rounded border border-line-strong px-3 font-normal" value={productId}
            onChange={(e) => setProductId(e.target.value)} placeholder="Código del producto" />
          <datalist id="forecast-products">{(products.data?.items ?? []).map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</datalist>
        </label>
        <label className="text-sm font-semibold">Escenario
          <select className="mt-1 block h-11 w-full rounded border border-line-strong px-3 font-normal" value={scenario} onChange={(e) => setScenario(e.target.value as "A" | "B")}>
            <option value="A">A · Cantidad solicitada</option><option value="B">B · Con precio positivo</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Horizonte
          <select className="mt-1 block h-11 w-full rounded border border-line-strong px-3 font-normal" value={horizon} onChange={(e) => setHorizon(Number(e.target.value) as 1 | 3)}>
            <option value={1}>1 mes</option><option value={3}>3 meses acumulados</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Mes de corte (opcional)
          <input type="month" className="mt-1 block h-11 w-full rounded border border-line-strong px-3 font-normal" value={cutoff} onInput={(e) => setCutoff(e.currentTarget.value)} onChange={(e) => setCutoff(e.target.value)} />
        </label>
      </div>
      <p className="text-sm text-ink-muted">Sin corte indicado, se usa el último mes cerrado anterior al pedido más reciente cargado.</p>
      <Button disabled={busy || !productId.trim()} onClick={calculate}>{busy ? "Calculando…" : "Calcular pronóstico"}</Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Card>
    {result && <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Resultado para {result.product_id}</h2><OriginBadge origin="estimated" />
      </div>
      <p className="text-sm text-ink-muted">Escenario {result.scenario} · Corte {result.cutoff_month} · Desde {result.forecast_start_month} · {result.horizon_months} {result.horizon_months === 1 ? "mes" : "meses acumulados"}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded bg-canvas p-5"><p className="text-sm text-ink-muted">Promedio móvil de 6 meses · método estadístico</p><p className="mt-2 text-3xl font-semibold">{formatNumber(result.moving_average_6m, 2)}</p></div>
        <div className="rounded bg-canvas p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-ink-muted">Extra Trees</p><span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">IA predictiva</span></div><p className="mt-2 text-3xl font-semibold">{formatNumber(result.extra_trees, 2)}</p></div>
      </div>
      <p className="text-sm text-ink-muted">{result.warning} Las dos cifras son cantidades de presentaciones registradas, no importes en soles.</p>
      <div className="border-t border-line pt-5">
        <p className="mb-3 text-xs text-ink-muted">Al solicitar la explicación, se envían a Gemini el escenario, el período y las dos cantidades estimadas. No se envían nombres ni identificadores de clientes.</p>
        <Button variant="outline" disabled={explaining} onClick={explain}><Sparkles size={16} aria-hidden />{explaining ? "Redactando…" : "Explicar resultados"}</Button>
        {explanationError && <p role="alert" className="mt-3 text-sm text-danger">{explanationError}</p>}
        {explanation && <div className="mt-4 rounded bg-canvas p-4">
          <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">{explanation.source === "gemini" ? "IA generativa · Gemini" : "Texto de respaldo"}</span>
          <p className="mt-2 text-sm leading-relaxed">{explanation.text}</p>
        </div>}
      </div>
    </Card>}
  </div>;
}
