"use client";

import { useState } from "react";
import { Pagination } from "@/components/data/pagination";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CONTACT_OUTCOMES } from "@/lib/labels";
import { useQuery } from "@/lib/use-query";

const PER_PAGE = 10;

export function ContactsPanel({ ruc }: { ruc: string }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { data, error, reload } = useQuery(
    () => api.GET("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc }, query: { page, per_page: PER_PAGE } } }),
    [ruc, page], "No se pudo cargar el registro de contactos.",
  );

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) { setMessage({ ok: false, text: "Elige qué respondió el cliente." }); return; }
    setBusy(true); setMessage(null);
    const { data: created, error: err } = await api.POST("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc } }, body: { outcome } });
    setBusy(false);
    if (!created) { setMessage({ ok: false, text: errorMessage(err, "No se pudo registrar el contacto. Inténtalo de nuevo.") }); return; }
    setOutcome(""); setMessage({ ok: true, text: "Contacto registrado con la fecha de hoy." }); setPage(1); reload();
  }

  return (
    <section aria-labelledby="contactos-titulo" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div>
        <h2 id="contactos-titulo" className="m-0 text-base font-semibold">Contactos</h2>
        <p className="mt-1 text-[13px] text-ink-muted">Cada vez que alguien contacta al cliente y qué respondió.</p>
      </div>

      <form onSubmit={register} className="flex flex-wrap items-end gap-3 rounded border border-line bg-canvas p-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">¿Qué respondió el cliente?
          <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setMessage(null); }}
            className="h-10 w-[260px] rounded border border-line-strong bg-surface px-3 text-sm font-normal">
            <option value="">Elige una opción</option>
            {CONTACT_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <Button type="submit" disabled={busy}>{busy ? "Registrando…" : "Registrar contacto"}</Button>
        {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "m-0 text-sm text-ok-fg" : "m-0 text-sm text-brand-strong"}>{message.text}</p>}
      </form>

      {error ? <p className="m-0 text-sm text-brand-strong">{error.message}</p>
        : !data ? <p className="m-0 text-sm text-ink-muted">Cargando contactos…</p>
        : data.total === 0 ? <p className="m-0 text-sm text-ink-muted">Todavía nadie registró un contacto con este cliente.</p>
        : (
          <>
            <Table>
              <THead><TR><TH>Fecha</TH><TH>Resultado</TH><TH>Registrado por</TH></TR></THead>
              <TBody>
                {data.items.map((c) => (
                  <TR key={c.id}>
                    <TD>{formatDate(c.contact_date)}</TD>
                    <TD className="font-semibold">{c.outcome}</TD>
                    <TD className="text-ink-2">{c.user_id === user?.id ? "Tú" : `Usuario ${c.user_id}`}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={data.page} perPage={data.per_page} total={data.total} onPage={setPage} label="contactos" />
          </>
        )}
    </section>
  );
}
