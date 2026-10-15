"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Report = components["schemas"]["ReportSummaryIn"]["report"];
type Result = components["schemas"]["ReportSummaryOut"];

export function ReportGeminiSummary({ report, metrics }: { report: Report; metrics: Record<string, number | null | undefined> }) {
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
      if (response.error) setError(errorMessage(response.error, "Gemini no pudo redactar el resumen."));
      else if (response.data) setAnswer({ fingerprint, result: response.data });
    } catch { setError("Gemini no pudo redactar el resumen."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-2 border-t border-line pt-3">
    <p className="text-xs text-ink-muted">Al pulsar, se envían a Gemini solo las métricas agregadas de esta tarjeta. No se envían nombres, RUC ni filas individuales.</p>
    <Button type="button" variant="outline" size="sm" disabled={busy || !Object.keys(numeric).length} onClick={explain}>
      <Sparkles size={14} aria-hidden />{busy ? "Redactando…" : "Redactar con Gemini"}
    </Button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {answer?.fingerprint === fingerprint && <div className="rounded bg-canvas p-3">
      <span className="text-xs font-semibold text-brand">{answer.result.source === "gemini" ? "IA generativa · Gemini" : "Texto de respaldo"}</span>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{answer.result.text}</p>
    </div>}
  </div>;
}
