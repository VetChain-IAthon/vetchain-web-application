"use client";

import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/data/notice";
import { Stepper, parseNumber } from "@/components/form/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorCode, errorMessage } from "@/lib/api/client";
import { formatPen } from "@/lib/format";
import { cn } from "@/lib/utils";

type Level = "A" | "B" | "C";
type Pricing = { igv: string; validity: string; minMargin: string; promoCut: string };
type LevelRule = { margin: string; discount: string; credit: string };
type Form = { pricing: Pricing; levels: Record<Level, LevelRule>; thresholds: { a: string; b: string } };

const LEVELS: { level: Level; name: string; detail: string }[] = [
  { level: "C", name: "Nivel C", detail: "Pocos pedidos al año" },
  { level: "B", name: "Nivel B", detail: "Compra con frecuencia moderada" },
  { level: "A", name: "Nivel A", detail: "Gran volumen de pedidos" },
];

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const emptyRule = (): LevelRule => ({ margin: "", discount: "", credit: "" });
const EMPTY: Form = {
  pricing: { igv: "18", validity: "", minMargin: "", promoCut: "" },
  levels: { A: emptyRule(), B: emptyRule(), C: emptyRule() },
  thresholds: { a: "", b: "" },
};

/** Lee las tres reglas. Un 404 «no configurado» no es error: el campo queda vacío para que gerencia lo defina. */
async function loadForm(): Promise<Form> {
  const [pricing, levels, thresholds] = await Promise.all([
    api.GET("/api/v1/settings/pricing"),
    api.GET("/api/v1/settings/customer-levels"),
    api.GET("/api/v1/settings/level-thresholds"),
  ]);
  // El contrato no declara el 404 «no configurado», por eso el error se lee sin tipo.
  for (const r of [pricing, levels, thresholds] as { error?: unknown }[]) {
    if (r.error && !["pricing_not_configured", "thresholds_not_configured"].includes(errorCode(r.error) ?? "")) {
      throw new Error(errorMessage(r.error, "No se pudieron leer los ajustes."));
    }
  }
  const form: Form = structuredClone(EMPTY);
  if (pricing.data) {
    const p = pricing.data;
    form.pricing = { igv: str(p.igv_rate_pct), validity: str(p.quotation_validity_days), minMargin: str(p.min_margin_pct), promoCut: str(p.promo_margin_cut_pct) };
  }
  for (const l of levels.data?.items ?? []) {
    if (l.level === "A" || l.level === "B" || l.level === "C") {
      form.levels[l.level] = { margin: str(l.margin_pct), discount: str(l.max_discount_pct), credit: str(l.credit_days) };
    }
  }
  if (thresholds.data) form.thresholds = { a: str(thresholds.data.min_amount_a), b: str(thresholds.data.min_amount_b) };
  return form;
}

// El IGV viene fijo (18 %), así que solo cuentan los tres valores que gerencia edita.
const PRICING_FIELDS: [Exclude<keyof Pricing, "igv">, string][] = [
  ["validity", "la vigencia"], ["minMargin", "el margen mínimo"], ["promoCut", "la rebaja de margen en promociones"],
];

const filled = (vals: string[]) => vals.filter((v) => v.trim() !== "").length;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Revisa el formulario antes de enviarlo. Devuelve el primer problema en lenguaje claro, o null. */
function validate(f: Form): string | null {
  const nums = (vals: string[]) => vals.every((v) => parseNumber(v) != null);
  const p = Object.values(f.pricing);
  const missing = PRICING_FIELDS.filter(([key]) => f.pricing[key].trim() === "").map(([, name]) => name);
  if (missing.length > 0 && missing.length < PRICING_FIELDS.length) return `Falta definir ${missing.join(" y ")} en «Impuestos y vigencia». Completa esos valores o deja la sección vacía.`;
  if (filled(p) === 4) {
    if (!nums(p)) return "Los valores de «Impuestos y vigencia» deben ser números.";
    if (!Number.isInteger(parseNumber(f.pricing.validity)) || parseNumber(f.pricing.validity)! < 1) return "La vigencia de la cotización debe ser de al menos 1 día, sin decimales.";
    if ([f.pricing.igv, f.pricing.minMargin, f.pricing.promoCut].some((v) => parseNumber(v)! > 100)) return "Los porcentajes no pueden pasar de 100 %.";
  }
  for (const { level, name } of LEVELS) {
    const r = Object.values(f.levels[level]);
    if (filled(r) > 0 && filled(r) < 3) return `Completa margen, descuento y crédito del ${name}, o déjalos todos vacíos.`;
    if (filled(r) === 3) {
      if (!nums(r)) return `Los valores del ${name} deben ser números.`;
      if (parseNumber(f.levels[level].margin)! > 100 || parseNumber(f.levels[level].discount)! > 100) return `Los porcentajes del ${name} no pueden pasar de 100 %.`;
      if (!Number.isInteger(parseNumber(f.levels[level].credit))) return `Los días de crédito del ${name} van sin decimales.`;
    }
  }
  const t = [f.thresholds.a, f.thresholds.b];
  if (filled(t) === 1) return "Define los dos umbrales (nivel A y nivel B) o déjalos vacíos.";
  if (filled(t) === 2) {
    if (!nums(t)) return "Los umbrales deben ser montos en soles, sin letras.";
    if (parseNumber(f.thresholds.a)! < parseNumber(f.thresholds.b)!) return "El umbral del nivel A debe ser mayor o igual que el del nivel B.";
  }
  return null;
}

function Tile({ title, hint, children, className }: { title: string; hint: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-[10px] bg-canvas p-4", className)}>
      <div className="text-[13px] font-semibold text-ink-muted">{title}</div>
      {children}
      <div className="text-[13px] text-ink-muted">{hint}</div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded border border-line bg-surface p-6">
      <div>
        <h2 className="m-0 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function BusinessRules() {
  const [saved, setSaved] = useState<Form | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try { const f = await loadForm(); setSaved(f); setForm(f); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "No se pudieron leer los ajustes."); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  if (loadError) {
    return (
      <Notice className="flex items-center justify-between gap-4">
        <span>{loadError} Revisa tu conexión e inténtalo de nuevo.</span>
        <Button variant="outline" onClick={reload}>Reintentar</Button>
      </Notice>
    );
  }
  if (!saved) return <div className="text-sm text-ink-muted">Cargando ajustes…</div>;

  const dirty = !same(form, saved);
  const missing = [
    filled(Object.values(saved.pricing)) < 4 && "impuestos y vigencia",
    LEVELS.some(({ level }) => filled(Object.values(saved.levels[level])) < 3) && "niveles de cliente",
    filled([saved.thresholds.a, saved.thresholds.b]) < 2 && "umbrales de volumen",
  ].filter(Boolean) as string[];

  const set = (fn: (f: Form) => void) => { setStatus(null); setForm((prev) => { const next = structuredClone(prev); fn(next); return next; }); };
  const igv = parseNumber(form.pricing.igv);

  async function save() {
    const problem = validate(form);
    if (problem) { setStatus({ tone: "error", text: problem }); return; }
    setBusy(true); setStatus(null);
    const n = (v: string) => parseNumber(v)!;
    const calls: Promise<{ error?: unknown }>[] = [];
    if (!same(form.pricing, saved!.pricing) && filled(Object.values(form.pricing)) === 4) {
      const p = form.pricing;
      calls.push(api.PUT("/api/v1/settings/pricing", { body: { igv_rate_pct: n(p.igv), quotation_validity_days: n(p.validity), min_margin_pct: n(p.minMargin), promo_margin_cut_pct: n(p.promoCut) } }));
    }
    for (const { level } of LEVELS) {
      const r = form.levels[level];
      if (!same(r, saved!.levels[level]) && filled(Object.values(r)) === 3) {
        calls.push(api.PUT("/api/v1/settings/customer-levels/{level}", { params: { path: { level } }, body: { margin_pct: n(r.margin), max_discount_pct: n(r.discount), credit_days: n(r.credit) } }));
      }
    }
    if (!same(form.thresholds, saved!.thresholds) && filled([form.thresholds.a, form.thresholds.b]) === 2) {
      calls.push(api.PUT("/api/v1/settings/level-thresholds", { body: { min_amount_a: n(form.thresholds.a), min_amount_b: n(form.thresholds.b) } }));
    }
    try {
      const results = await Promise.all(calls);
      const failed = results.find((r) => r.error);
      await reload();
      setStatus(failed
        ? { tone: "error", text: errorMessage(failed.error, "Algunos cambios no se guardaron.") + " Revisa los valores e inténtalo de nuevo." }
        : { tone: "ok", text: "Cambios guardados. Las cotizaciones nuevas ya usan estos valores." });
    } catch {
      setStatus({ tone: "error", text: "No hay conexión con el servidor. Tus cambios siguen aquí: inténtalo de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  const title = status?.tone === "error" ? "No se guardaron los cambios"
    : dirty ? "Hay cambios sin guardar"
    : status?.tone === "ok" ? "Cambios guardados"
    : missing.length ? "Faltan reglas por definir" : "Configuración al día";
  const text = status?.text
    ?? (dirty ? "Al guardar, las cotizaciones nuevas usan estos valores."
      : missing.length ? `Todavía no se definieron: ${missing.join(", ")}. Mientras falten, VetChain no puede calcular precios ni niveles con esas reglas.`
      : "Las cotizaciones nuevas usan estos valores.");

  return (
    <>
      <Section title="Impuestos y vigencia" description="Los precios de las cotizaciones se calculan sin IGV y el impuesto se suma al final">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Tile title="IGV" hint={igv != null ? <>Ejemplo: un producto de {formatPen(100)} pasa a {formatPen(100 * (1 + igv / 100))}</> : "Tasa vigente según la ley"}>
            <div className="flex min-h-11 items-center gap-3">
              <strong className="text-[26px] tracking-[-0.02em] tabular-nums">{form.pricing.igv || "18"} %</strong>
              <span className="rounded bg-line px-2 py-0.5 text-xs font-semibold text-ink-2">Fijo por ley</span>
            </div>
          </Tile>
          <Tile title="Vigencia de la cotización" hint="Después de este plazo la cotización deja de ser válida">
            <Stepper size="lg" label="vigencia en días" suffix="días" min={1} value={form.pricing.validity} onChange={(v) => set((f) => { f.pricing.validity = v; })} />
          </Tile>
          <Tile title="Margen mínimo permitido" hint="Por debajo de este margen, la cotización necesita aprobación de gerencia">
            <Stepper size="lg" label="margen mínimo en porcentaje" suffix="%" max={100} value={form.pricing.minMargin} onChange={(v) => set((f) => { f.pricing.minMargin = v; })} />
          </Tile>
          <Tile title="Rebaja de margen en promociones" className="md:col-span-2 xl:col-span-3"
            hint={<>Los productos próximos a vencer se ofrecen con este margen menos que el normal del cliente.
              {parseNumber(form.levels.B.margin) != null && parseNumber(form.pricing.promoCut) != null
                ? ` Ejemplo: margen ${form.levels.B.margin} % pasa a ${parseNumber(form.levels.B.margin)! - parseNumber(form.pricing.promoCut)!} %.` : null}</>}>
            <Stepper size="lg" label="rebaja de margen en promociones" suffix="pts" max={100} value={form.pricing.promoCut} onChange={(v) => set((f) => { f.pricing.promoCut = v; })} />
          </Tile>
        </div>
      </Section>

      <Section title="Margen de ganancia según el nivel de volumen"
        description="Margen sobre el precio de venta. Más volumen de pedidos permite menos margen, más descuento y más días de crédito">
        <div className="overflow-x-auto"><div role="table" aria-label="Reglas por nivel de cliente" className="flex min-w-[700px] flex-col">
          <div role="row" className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 border-b border-line py-2.5 text-xs font-semibold text-ink-muted">
            <div role="columnheader">Nivel de volumen</div>
            <div role="columnheader" className="text-center">Margen de ganancia</div>
            <div role="columnheader" className="text-center">Descuento máximo</div>
            <div role="columnheader" className="text-center">Crédito</div>
          </div>
          {LEVELS.map(({ level, name, detail }) => {
            const r = form.levels[level];
            return (
              <div role="row" key={level} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-4 border-b border-line py-3 text-sm last:border-b-0">
                <div role="cell">
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-ink-muted">{detail}</div>
                </div>
                <div role="cell" className="flex justify-center">
                  <Stepper label={`margen del ${name}`} suffix="%" max={100} value={r.margin} onChange={(v) => set((f) => { f.levels[level].margin = v; })} />
                </div>
                <div role="cell" className="flex items-center justify-center gap-1.5">
                  <Input inputMode="decimal" aria-label={`Descuento máximo del ${name} en porcentaje`} placeholder="Sin definir" value={r.discount}
                    onChange={(e) => set((f) => { f.levels[level].discount = e.target.value; })} className="w-24 text-right font-semibold" />
                  <span className="font-semibold">%</span>
                </div>
                <div role="cell" className="flex justify-center">
                  <Stepper label={`crédito del ${name} en días`} suffix="días" step={15} value={r.credit} onChange={(v) => set((f) => { f.levels[level].credit = v; })} />
                </div>
              </div>
            );
          })}
        </div></div>
      </Section>

      <Section title="Umbrales de volumen de pedidos"
        description="Define desde qué monto de pedidos de los últimos 12 meses (en soles, sin IGV) un cliente pasa a nivel B o A. Ese nivel define su margen, descuento y crédito en las cotizaciones.">
        <div className="flex flex-wrap gap-4">
          {([["a", "Nivel A desde"], ["b", "Nivel B desde"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[13px] text-ink-muted">{label}
              <span className="text-sm font-semibold text-ink">S/</span>
              <Input inputMode="decimal" placeholder="Sin definir" value={form.thresholds[key]}
                onChange={(e) => set((f) => { f.thresholds[key] = e.target.value; })} className="w-32 text-right text-[15px] font-semibold" />
            </label>
          ))}
        </div>
      </Section>

      <section className={cn("flex flex-wrap items-center justify-between gap-4 rounded border-2 bg-surface px-6 py-5", status?.tone === "error" ? "border-brand-strong" : "border-brand")}>
        <div className="flex flex-[1_1_340px] flex-col gap-1" role="status" aria-live="polite">
          <div className="text-[15px] font-semibold">{title}</div>
          <p className={cn("m-0 text-[13px] leading-normal", status?.tone === "error" ? "text-brand-strong" : "text-ink-muted")}>{text}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" disabled={!dirty || busy} onClick={() => { setForm(saved); setStatus(null); }}>Descartar cambios</Button>
          <Button className="h-11" disabled={!dirty || busy} onClick={save}>{busy ? "Guardando…" : "Guardar cambios"}</Button>
        </div>
      </section>
    </>
  );
}
