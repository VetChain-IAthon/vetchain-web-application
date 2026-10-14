"use client";

import { useState } from "react";
import { Notice } from "@/components/data/notice";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { components } from "@/lib/api/schema";
import { api, errorMessage } from "@/lib/api/client";
import { formatDate, formatInt } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

type Laboratory = components["schemas"]["LaboratoryOut"];
type Decision = components["schemas"]["DecisionIn"]["decision"];

const dollars = (value: number | string) => `US$ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value))}`;

export function ImportPlanningPage() {
  const query = useQuery(() => api.GET("/api/v1/import-suggestions"), [], "No se pudo cargar la planificación.");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const labs = query.data?.laboratories ?? [];
  const active = labs.find((lab) => lab.id === activeId) ?? labs[0];

  async function decide(id: number, decision: Decision) {
    setSavingId(id);
    setSaveError("");
    try {
      const { error } = await api.PATCH("/api/v1/import-suggestions/{suggestion_id}", {
        params: { path: { suggestion_id: id } }, body: { decision },
      });
      if (error) { setSaveError(errorMessage(error, "No se pudo guardar la revisión.")); return; }
      query.reload();
    } catch {
      setSaveError("No hay conexión con el servidor de VetChain.");
    } finally {
      setSavingId(null);
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Planificación de importación" origin="simulated"
      subtitle="Escenario ilustrativo para revisar un próximo pedido por laboratorio. Gerencia decide qué se estudia." />
    <Notice tone="warn" className="leading-relaxed">
      <strong>Datos de ejemplo.</strong> Los cuatro laboratorios y todas las cifras de esta pantalla son simulados. Los CSV no relacionan productos con laboratorios ni confirman costos de importación, lotes o vencimientos. Revisar una sugerencia aquí no crea un pedido.
    </Notice>

    {query.loading && !query.data && <Card>Preparando el escenario de ejemplo…</Card>}
    {query.error && <Notice tone="danger">{query.error.message} <button type="button" onClick={query.reload} className="ml-2 font-semibold underline">Reintentar</button></Notice>}
    {query.data && labs.length === 0 && <Card>No hay laboratorios configurados en la base de datos.</Card>}

    {active && <>
      <div role="tablist" aria-label="Laboratorios" className="flex gap-1 overflow-x-auto border-b border-line">
        {labs.map((lab) => <button key={lab.id} type="button" role="tab" aria-selected={lab.id === active.id}
          onClick={() => { setActiveId(lab.id); setSaveError(""); }}
          className={cn("whitespace-nowrap border-b-2 px-4 py-3 text-sm", lab.id === active.id
            ? "border-brand font-semibold text-brand" : "border-transparent text-ink-2 hover:text-brand")}>
          {lab.name} · {lab.country}
        </button>)}
      </div>

      <Summary lab={active} />

      <Card className="space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Sugerencias por producto</h2>
          <span className="text-sm text-ink-muted">{active.suggestions.filter((row) => row.decision !== "pending").length} de {active.suggestions.length} revisadas</span>
        </div>
        {saveError && <Notice tone="danger">{saveError}</Notice>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-sm">
            <thead><tr className="border-b border-line text-left text-ink-muted">
              <th className="py-3 pr-4 font-semibold">Producto</th>
              <th className="px-3 py-3 text-right font-semibold">Stock hoy</th>
              <th className="px-3 py-3 text-right font-semibold">Cobertura</th>
              <th className="px-3 py-3 text-right font-semibold">Demanda 90 días</th>
              <th className="px-3 py-3 text-right font-semibold">Pedido sugerido</th>
              <th className="px-3 py-3 text-right font-semibold">Vence en</th>
              <th className="px-3 py-3 text-right font-semibold">Pedir antes del</th>
              <th className="py-3 pl-3 text-right font-semibold">Tu revisión</th>
            </tr></thead>
            <tbody>{active.suggestions.map((row) => <tr key={row.id} className="border-b border-line last:border-0">
              <td className="py-4 pr-4 font-semibold">{row.product_name}</td>
              <td className="px-3 py-4 text-right">{formatInt(row.stock_units)}</td>
              <td className="px-3 py-4 text-right">{row.coverage_days} días</td>
              <td className="px-3 py-4 text-right">{formatInt(row.demand_90_days)}</td>
              <td className="px-3 py-4 text-right font-semibold">{formatInt(row.suggested_units)}</td>
              <td className="px-3 py-4 text-right">{row.shelf_life_months} meses</td>
              <td className="px-3 py-4 text-right">{formatDate(row.order_before)}</td>
              <td className="py-4 pl-3 text-right">
                {row.decision === "pending" ? <div className="flex justify-end gap-2">
                  <Button size="sm" disabled={savingId !== null} onClick={() => decide(row.id, "approved")}>Aprobar</Button>
                  <Button size="sm" variant="outline" disabled={savingId !== null} onClick={() => decide(row.id, "rejected")}>Rechazar</Button>
                </div> : <div className="flex items-center justify-end gap-2">
                  <span className={cn("font-semibold", row.decision === "approved" ? "text-ok-fg" : "text-ink-muted")}>{row.decision === "approved" ? "Aprobada" : "Rechazada"}</span>
                  <button type="button" disabled={savingId !== null} onClick={() => decide(row.id, "pending")} className="text-brand underline disabled:opacity-50">Deshacer</button>
                </div>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="border-t border-line pt-4 text-sm text-ink-muted">Aprobado hasta ahora: {dollars(active.suggestions.filter((row) => row.decision === "approved").reduce((sum, row) => sum + row.suggested_units * Number(row.unit_price_usd), 0))} · estimación de ejemplo, sin orden de compra.</p>
      </Card>
    </>}

    <Card className="p-6 md:p-8">
      <button type="button" onClick={() => setRulesOpen((open) => !open)} aria-expanded={rulesOpen} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-lg font-semibold">Reglas de referencia para la planificación</span>
        <span className="text-sm font-semibold text-brand">{rulesOpen ? "Ocultar" : "Ver reglas"}</span>
      </button>
      {rulesOpen && <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Rule label="Stock mínimo de seguridad" value="20 días de cobertura" />
          <Rule label="Vida útil mínima al recibir" value="70 % del plazo del lote" />
          <Rule label="Quién decide" value="Gerencia revisa cada propuesta" />
        </div>
        <p className="text-sm text-ink-muted">Estos umbrales son ilustrativos y deben acordarse con Mederi. La revisión de esta pantalla no ejecuta pedidos ni importaciones.</p>
      </div>}
    </Card>
  </div>;
}

function Summary({ lab }: { lab: Laboratory }) {
  const entries = [
    ["Productos a pedir", String(lab.suggestions.length), "con propuesta en este laboratorio"],
    ["Costo de la mercadería", dollars(lab.merchandise_cost_usd), "precios de ejemplo"],
    ["Costos de importación", dollars(lab.import_cost_usd), "sin validar"],
    ["Llegada estimada", formatDate(lab.estimated_arrival), `${lab.lead_days} días de tránsito estimado`],
  ];
  return <div className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4">
    {entries.map(([label, value, detail]) => <div key={label} className="space-y-2 border-b border-r border-line p-6 last:border-0 sm:even:border-r-0 xl:border-b-0 xl:even:border-r">
      <div className="text-sm font-semibold text-ink-muted">{label}</div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-sm text-ink-muted">{detail}</div>
    </div>)}
  </div>;
}

function Rule({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-canvas p-4"><div className="text-sm text-ink-muted">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}
