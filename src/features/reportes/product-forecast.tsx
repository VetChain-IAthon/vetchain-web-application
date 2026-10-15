"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiBadge } from "@/components/data/ai-badge";
import { OriginBadge } from "@/components/data/origin-badge";
import { api, errorMessage } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import type { components } from "@/lib/api/schema";

type Forecast = components["schemas"]["ForecastComparisonOut"];
type Explanation = components["schemas"]["ForecastExplanationOut"];

/** Sección de Stock y merma: compara promedio móvil de seis meses y el modelo predictivo (Extra Trees) para un producto. */
export function ProductForecast() {
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
      if (response.error) setExplanationError(errorMessage(response.error, "No se pudo redactar el resumen. Inténtalo de nuevo."));
      else setExplanation(response.data ?? null);
    } catch {
      setExplanationError("No se pudo redactar el resumen. Inténtalo de nuevo.");
    } finally { setExplaining(false); }
  }

  return <section id="pronostico" aria-label="Pronóstico por producto" className="scroll-mt-6 space-y-4">
    <Card className="space-y-5 p-8">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Pronóstico por producto</h2><p className="text-sm text-ink-muted">Cantidad que se pedirá, según el promedio móvil de seis meses y el modelo predictivo</p></div>
        <OriginBadge origin="estimated" className="flex-none" />
      </div>
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
    {result && <Card className="space-y-5 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Resultado para {result.product_id}</h3>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={explaining} onClick={explain}><Sparkles size={14} aria-hidden />{explaining ? "Redactando…" : "Redactar resumen"}</Button>
      </div>
      <p className="text-sm text-ink-muted">Escenario {result.scenario} · Corte {result.cutoff_month} · Desde {result.forecast_start_month} · {result.horizon_months} {result.horizon_months === 1 ? "mes" : "meses acumulados"}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded bg-canvas p-5"><p className="text-sm text-ink-muted">Promedio móvil de 6 meses · método estadístico</p><p className="mt-2 text-3xl font-semibold">{formatNumber(result.moving_average_6m, 2)}</p></div>
        <div className="rounded bg-canvas p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-ink-muted">Modelo predictivo</p><AiBadge kind="predictive" /></div><p className="mt-2 text-3xl font-semibold">{formatNumber(result.extra_trees, 2)}</p></div>
      </div>
      <p className="text-sm text-ink-muted">{result.warning} Las dos cifras son cantidades de presentaciones registradas, no importes en soles.</p>
      {explanationError && <p role="alert" className="text-sm text-danger">{explanationError}</p>}
      {explanation && <div className="rounded bg-canvas p-4">
        {explanation.source === "gemini" && <AiBadge />}
        <p className={explanation.source === "gemini" ? "mt-2 text-sm leading-relaxed" : "text-sm leading-relaxed"}>{explanation.text}</p>
      </div>}
    </Card>}
  </section>;
}
