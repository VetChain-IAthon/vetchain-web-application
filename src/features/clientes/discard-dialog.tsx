"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { DISCARD_REASONS, type DiscardReason } from "@/lib/labels";
import { cn } from "@/lib/utils";

const NOTE_MAX = 300;

/** Confirma el descarte de un cliente dormido con su motivo. Se puede restaurar desde «Clientes descartados». */
export function DiscardDialog({ customer, onClose, onDiscarded }: {
  customer: { ruc: string; name: string }; onClose: () => void; onDiscarded: () => void;
}) {
  const [reason, setReason] = useState<DiscardReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const noteMissing = reason === "other" && !note.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Elige por qué descartas al cliente."); return; }
    if (noteMissing) { setError("Si el motivo es «Otro motivo», escribe una nota que lo explique."); return; }
    setBusy(true); setError(null);
    const { data, error: err } = await api.POST("/api/v1/customers/{ruc}/discard", {
      params: { path: { ruc: customer.ruc } }, body: { reason, note: note.trim() || null },
    });
    setBusy(false);
    if (!data) { setError(errorMessage(err, "No se pudo descartar el cliente. Inténtalo de nuevo.")); return; }
    onDiscarded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="discard-title" onSubmit={submit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="discard-title" className="text-lg font-semibold">Descartar cliente</h2>
            <p className="mt-1 text-sm text-ink-muted">
              <span className="font-semibold text-ink">{customer.name}</span> saldrá de «Clientes dormidos» y pasará a «Clientes descartados».
              Podrás restaurarlo cuando quieras.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink"><X size={18} /></button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Motivo</legend>
          {DISCARD_REASONS.map((r, i) => (
            <label key={r.value} className={cn("flex cursor-pointer items-start gap-3 rounded border px-3.5 py-2.5",
              reason === r.value ? "border-brand bg-brand-soft" : "border-line-strong hover:bg-canvas")}>
              <input ref={i === 0 ? first : undefined} type="radio" name="discard-reason" value={r.value} checked={reason === r.value}
                onChange={() => { setReason(r.value); setError(null); }} className="mt-1 accent-brand" />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-ink">{r.label}</span>
                <span className="text-[13px] text-ink-muted">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="discard-note" className="text-sm font-semibold">
            Nota {reason === "other" ? <span className="font-normal text-ink-muted">(obligatoria)</span> : <span className="font-normal text-ink-muted">(opcional)</span>}
          </label>
          <textarea id="discard-note" value={note} onChange={(e) => { setNote(e.target.value); setError(null); }} rows={3} maxLength={NOTE_MAX}
            placeholder="Por ejemplo: cerró el local en 2024; ahora compra como 20601234567."
            aria-invalid={!!error && noteMissing}
            className="w-full rounded border border-line-strong bg-surface p-3 text-sm leading-relaxed text-ink focus:border-brand focus:outline focus:outline-2 focus:outline-brand" />
          <p className="self-end text-xs text-ink-muted tabular-nums">{note.length}/{NOTE_MAX}</p>
        </div>

        {error && <p role="alert" className="text-[13px] text-brand-strong">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? "Descartando…" : "Descartar cliente"}</Button>
        </div>
      </form>
    </div>
  );
}
