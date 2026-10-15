"use client";

import { useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { AiBadge } from "@/components/data/ai-badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Report = components["schemas"]["ReportSummaryIn"]["report"];
type Result = components["schemas"]["ReportSummaryOut"];

/** Encabezado de la tarjeta de resumen con «Redactar resumen» a la derecha. Solo se envían métricas agregadas. */
export function ReportGeminiSummary({ title, report, metrics }: {
  title: string; report: Report; metrics: Record<string, number | null | undefined>;
}) {
  const numeric = Object.fromEntries(Object.entries(metrics).filter((item): item is [string, number] =>
    typeof item[1] === "number" && Number.isFinite(item[1])));
  const fingerprint = JSON.stringify({ report, numeric });
  const [answer, setAnswer] = useState<{ fingerprint: string; result: Result } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function explain() {
    if (!Object.keys(numeric).length) return;
    setBusy(true); setError(""); setAnswer(null);
    try {
      const response = await api.POST("/api/v1/insights/report-summary", { body: { report, metrics: numeric } });
      if (response.error) setError(errorMessage(response.error, "No se pudo redactar el resumen. Inténtalo de nuevo."));
      else if (response.data) setAnswer({ fingerprint, result: response.data });
    } catch { setError("No se pudo redactar el resumen. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  const current = answer?.fingerprint === fingerprint ? answer.result : null;
  return <div className="flex flex-1 flex-col gap-4">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded bg-brand-soft text-brand"><BarChart3 size={18} aria-hidden /></span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={busy || !Object.keys(numeric).length} onClick={explain}>
        <Sparkles size={14} aria-hidden />{busy ? "Redactando…" : "Redactar resumen"}
      </Button>
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {current?.source === "gemini" ? <div className="rounded bg-canvas p-4">
        <AiBadge />
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{current.text}</p>
      </div>
      : <div aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-2 rounded border border-dashed border-line-strong px-6 py-6 text-center">
        <Sparkles size={18} className={busy ? "animate-pulse text-brand" : "text-ink-muted"} aria-hidden />
        <p className="text-sm text-ink-muted">{busy ? "Redactando el resumen con las cifras de este reporte…"
          : current?.text ?? "Pulsa «Redactar resumen» para obtener en pocas frases lo más importante de este reporte."}</p>
      </div>}
  </div>;
}
