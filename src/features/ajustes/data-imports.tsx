"use client";

import { ArrowRight, Check, Download, FileText, FileUp, Loader2, RefreshCw, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { Notice } from "@/components/data/notice";
import { OriginBadge } from "@/components/data/origin-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { components } from "@/lib/api/schema";
import { api, errorMessage } from "@/lib/api/client";
import { formatDate, formatInt } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

/** Carga de los 7 CSV de Mederi desde Ajustes (estructura de design/prototipo/Integracion.dc.html).
 *  Subir un archivo lo valida y lo deja en revisión; solo al confirmar se actualizan e insertan los datos (nunca se borra). */

type Source = components["schemas"]["DataSourceOut"];
type DataImport = components["schemas"]["DataImportOut"];
type Origin = "real" | "synthetic" | "simulated";

const ORIGINS: [Origin, string, string][] = [
  ["real", "Reales (de Mederi)", "Archivos exportados del sistema de Mederi"],
  ["synthetic", "Sintéticos (de prueba)", "Datos inventados para probar, como los de datos-ejemplo"],
  ["simulated", "Simulados", "Escenarios simulados"],
];
const STATUS_LABEL: Record<DataImport["status"], { text: string; cls: string }> = {
  staged: { text: "En revisión", cls: "bg-warn-bg text-warn-fg" },
  confirmed: { text: "Cargado", cls: "bg-ok-bg text-ok-fg" },
  cancelled: { text: "Cancelado", cls: "bg-neutral-bg text-neutral-fg" },
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${formatInt(Math.max(1, Math.round(bytes / 1024)))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Paso numerado con su línea de avance a la izquierda. */
function Step({ n, title, done, last = false, children }: { n: number; title: string; done: boolean; last?: boolean; children: React.ReactNode }) {
  return <section className="flex gap-4">
    <div className="flex flex-col items-center">
      <span className={cn("flex size-8 flex-none items-center justify-center rounded-full text-sm font-semibold",
        done ? "bg-ok-fg text-white" : "bg-brand-soft text-brand")}>{done ? <Check size={16} aria-hidden /> : n}</span>
      {!last && <span className="mt-2 w-px flex-1 bg-line" aria-hidden />}
    </div>
    <div className={cn("min-w-0 flex-1", !last && "pb-6")}>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  </section>;
}

function downloadTemplate(source: Source) {
  const blob = new Blob([`﻿${source.headers.join(",")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = source.file_name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function DataImports() {
  const sources = useQuery(() => api.GET("/api/v1/data-sources"), [], "No se pudo cargar la lista de archivos.");
  const history = useQuery(() => api.GET("/api/v1/data-imports", { params: { query: { per_page: 10 } } }), [], "No se pudo cargar el historial.");
  const [selected, setSelected] = useState<string>("");
  const [origin, setOrigin] = useState<Origin>("real");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<DataImport | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const uploader = useRef<HTMLDivElement>(null);

  const items = sources.data?.items ?? [];
  const total = items.reduce((s, i) => s + i.rows_in_db, 0);
  const source = items.find((i) => i.source === selected);

  const pick = (key: string) => { setSelected(key); setReview(null); setDone(null); setError(null); };
  const pickAndScroll = (key: string) => { pick(key); uploader.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const reset = () => { setFile(null); if (input.current) input.current.value = ""; };
  const choose = (picked: File | null) => {
    setReview(null); setDone(null); setError(null);
    if (!picked) return;
    if (!/\.csv$/i.test(picked.name)) { setError("El archivo debe ser .csv. En Excel: Archivo › Guardar como › CSV UTF-8."); return; }
    setFile(picked);
    // Reconoce el archivo por su nombre (mederi-2-pedidos.csv) si aún no se eligió cuál es.
    const match = items.find((s) => picked.name.toLowerCase().endsWith(s.file_name));
    if (match && !selected) setSelected(match.source);
  };

  const upload = async () => {
    if (!source || !file) return;
    setBusy(true); setError(null); setDone(null);
    const form = new FormData();
    form.append("source", source.source); form.append("origin", origin); form.append("file", file);
    const { data, error: err } = await api.POST("/api/v1/data-imports", {
      body: {} as never, bodySerializer: () => form,
    });
    setBusy(false);
    if (err || !data) { setError(errorMessage(err, "No se pudo leer el archivo. Revisa que sea un CSV con encabezados.")); return; }
    setReview(data); history.reload();
  };

  const decide = async (action: "confirm" | "cancel") => {
    if (!review) return;
    setBusy(true); setError(null);
    const { data, error: err } = await api.PATCH("/api/v1/data-imports/{import_id}", { params: { path: { import_id: review.id } }, body: { action } });
    setBusy(false);
    if (err || !data) { setError(errorMessage(err, "No se pudo completar la acción.")); return; }
    setReview(null); reset();
    setDone(action === "confirm" ? `Listo: se actualizaron o agregaron ${formatInt(data.rows_loaded)} filas de ${source?.description.toLowerCase() ?? "datos"}.` : "Carga cancelada. No se cambió ningún dato.");
    sources.reload(); history.reload();
  };

  return <div className="flex flex-col gap-6">
    <Notice tone="warn">
      Por ahora los datos entran desde 7 archivos CSV exportados del sistema de Mederi. Cada archivo debe traer en la primera fila los encabezados
      de su plantilla. Subir un archivo no cambia nada: primero se revisa y solo al confirmar se actualizan o agregan filas (nunca se borran).
      El significado de algunas columnas aún debe confirmarse con Mederi.
    </Notice>

    <Card className="flex flex-col gap-4 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Archivos cargados</h2><p className="text-sm text-ink-muted">{formatInt(total)} registros en total</p></div>
        <Button variant="outline" size="sm" onClick={() => sources.reload()}><RefreshCw size={14} aria-hidden />Actualizar</Button>
      </div>
      {sources.error ? <Notice>{sources.error.message}</Notice> : !sources.data ? <p className="text-sm text-ink-muted">Cargando…</p> :
        <Table>
          <THead><TR><TH>Archivo</TH><TH>Qué contiene</TH><TH numeric>Registros</TH><TH>Período</TH><TH>Estado</TH><TH /></TR></THead>
          <TBody>{items.map((s) => <TR key={s.source} className={cn(s.source === selected && "bg-brand-soft/40")}>
            <TD className="font-semibold">{s.file_name}</TD>
            <TD className="text-ink-2">{s.description}</TD>
            <TD numeric>{formatInt(s.rows_in_db)}</TD>
            <TD className="whitespace-nowrap text-ink-muted">{s.first_date ? `${formatDate(s.first_date)} – ${formatDate(s.last_date)}` : "—"}</TD>
            <TD className="text-[13px]">{s.last_import
              ? <span className="text-ok-fg">Cargado el {formatDate(s.last_import.decided_at)}{s.last_import.origin !== "real" && ` · ${s.last_import.origin}`}</span>
              : s.rows_in_db ? <span className="text-ink-muted">Carga inicial</span> : <span className="text-brand-strong">Sin datos</span>}</TD>
            <TD><div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => downloadTemplate(s)} title="Descargar plantilla con encabezados"><Download size={14} aria-hidden />Plantilla</Button>
              <Button variant="outline" size="sm" onClick={() => pickAndScroll(s.source)}><FileUp size={14} aria-hidden />Cargar</Button>
            </div></TD>
          </TR>)}</TBody>
        </Table>}
    </Card>

    <div ref={uploader} className="scroll-mt-6">
      <Card className="flex flex-col gap-5 p-8">
        <div><h2 className="text-lg font-semibold">Cargar archivo CSV</h2>
          <p className="text-sm text-ink-muted">Tres pasos. Nada cambia hasta que confirmes.</p></div>
        <Step n={1} title="¿Qué archivo vas a cargar?" done={!!source}>
          <p className="-mt-2 mb-3 text-[13px] text-ink-muted">En el orden en que conviene cargarlos: un pedido necesita que antes existan su cliente y su vendedor.</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((s) => <button key={s.source} type="button" onClick={() => pick(s.source)} aria-pressed={s.source === selected}
              className={cn("flex flex-col items-start gap-0.5 rounded border px-4 py-3 text-left transition-colors",
                s.source === selected ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong hover:bg-canvas")}>
              <span className={cn("text-sm font-semibold", s.source === selected && "text-brand")}>{s.number}. {s.description}</span>
              <span className="text-xs text-ink-muted">{s.file_name}</span>
            </button>)}
          </div>
        </Step>

        <Step n={2} title="Sube el CSV" done={!!file}>
          <div className="flex flex-col gap-4">
            <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" id="csv-file" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
            {!file ? <label htmlFor="csv-file"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0] ?? null); }}
              className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-canvas/60 hover:border-brand hover:bg-brand-soft/40")}>
              <UploadCloud size={32} className={dragging ? "text-brand" : "text-ink-muted"} aria-hidden />
              <span className="font-semibold">Arrastra el CSV aquí o <span className="text-brand underline underline-offset-2">elige un archivo</span></span>
              <span className="text-[13px] text-ink-muted">Hasta 25 MB · separador coma o punto y coma · UTF-8 · fechas AAAA-MM-DD · decimales con punto</span>
              {!source && <span className="text-[13px] text-ink-muted">Si se llama como el original (por ejemplo mederi-2-pedidos.csv), lo reconocemos solos.</span>}
            </label>
            : <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
              <span className="flex size-11 flex-none items-center justify-center rounded bg-ok-bg text-ok-fg"><FileText size={22} aria-hidden /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{file.name}</p><p className="text-[13px] text-ink-muted">{formatSize(file.size)}{source && ` · se cargará como ${source.description.toLowerCase()}`}</p></div>
              <Button variant="ghost" size="sm" onClick={() => { reset(); setReview(null); }} disabled={busy}><X size={14} aria-hidden />Quitar</Button>
            </div>}

            {source && <div className="rounded bg-canvas p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">La primera fila debe traer estos {source.headers.length} encabezados, en este orden</p>
                <Button variant="ghost" size="sm" onClick={() => downloadTemplate(source)}><Download size={14} aria-hidden />Descargar plantilla</Button>
              </div>
              <ol className="flex flex-wrap gap-1.5">{source.headers.map((h, i) => <li key={`${h}-${i}`}
                className={cn("rounded-xs px-2 py-0.5 font-mono text-xs", /^c\d+$/.test(h) ? "bg-surface text-ink-muted" : "border border-line bg-surface text-ink-2")}
                title={/^c\d+$/.test(h) ? "Columna de Defontana que no se usa: puede ir vacía" : undefined}>
                <span className="mr-1 text-ink-muted">{i + 1}</span>{h}</li>)}</ol>
              <p className="mt-2 text-xs text-ink-muted">Las columnas en gris (cN) no se usan y pueden ir vacías. Si abriste el CSV en Excel y se perdieron
                los ceros a la izquierda (008 → 8), VetChain los repone en los códigos al revisar.</p>
            </div>}
          </div>
        </Step>

        <Step n={3} title="Revisa y confirma" done={false} last>
          <div className="flex flex-col gap-4">
            <div role="radiogroup" aria-label="Origen de los datos" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-semibold">Origen de los datos</span>
              {ORIGINS.map(([value, label, hint]) => <button key={value} type="button" role="radio" aria-checked={origin === value} title={hint}
                onClick={() => setOrigin(value)}
                className={cn("rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
                  origin === value ? "border-brand bg-brand-soft text-brand" : "border-line-strong text-ink-2 hover:bg-canvas")}>{label}</button>)}
            </div>
            {!review && <div><Button className="h-11 px-6" disabled={!source || !file || busy} onClick={upload}>
              {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden />Revisando el archivo…</> : <>Revisar archivo <ArrowRight size={16} aria-hidden /></>}</Button>
              {(!source || !file) && <p className="mt-2 text-[13px] text-ink-muted">{!source ? "Primero elige qué archivo vas a cargar." : "Ahora sube el CSV."}</p>}
            </div>}
          </div>
        </Step>
        {error && <Notice>{error}</Notice>}
        {done && <p className="rounded border border-ok-fg/20 bg-ok-bg px-5 py-3 text-sm font-semibold text-ok-fg">{done}</p>}

        {review && <div className="flex flex-col gap-4 rounded-lg border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">{review.file_name}</p><p className="text-sm text-ink-muted">Revisión antes de cargar · {source?.description}</p></div>
            {review.origin === "real" ? <OriginBadge origin="real" /> : <OriginBadge origin={review.origin as "synthetic" | "simulated"} />}
          </div>
          <dl className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded bg-canvas p-3"><dt className="text-xs text-ink-muted">Filas leídas</dt><dd className="text-2xl font-semibold tabular-nums">{formatInt(review.rows_read)}</dd></div>
            <div className="rounded bg-ok-bg p-3"><dt className="text-xs text-ok-fg">Válidas</dt><dd className="text-2xl font-semibold tabular-nums text-ok-fg">{formatInt(review.valid_rows)}</dd></div>
            <div className={cn("rounded p-3", review.rows_with_error ? "bg-danger-bg" : "bg-canvas")}><dt className={cn("text-xs", review.rows_with_error ? "text-danger-fg" : "text-ink-muted")}>Con error</dt>
              <dd className={cn("text-2xl font-semibold tabular-nums", review.rows_with_error ? "text-danger-fg" : "")}>{formatInt(review.rows_with_error)}</dd></div>
          </dl>
          {review.errors.length > 0 && <div className="max-h-64 overflow-y-auto rounded border border-line">
            <Table><THead><TR><TH numeric>Línea</TH><TH>Problema</TH></TR></THead>
              <TBody>{review.errors.map((e) => <TR key={`${e.line}-${e.message}`}><TD numeric>{formatInt(e.line)}</TD><TD>{e.message}</TD></TR>)}</TBody></Table>
          </div>}
          {review.rows_with_error > review.errors.length && <p className="text-[13px] text-ink-muted">Se muestran {formatInt(review.errors.length)} de {formatInt(review.rows_with_error)} errores.</p>}
          <p className="text-[13px] text-ink-muted">Las filas con error no se cargan. Al confirmar, las {formatInt(review.valid_rows)} filas válidas actualizan los registros que ya existen y agregan los nuevos.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => decide("cancel")}>Cancelar carga</Button>
            <Button disabled={busy || review.valid_rows === 0} onClick={() => decide("confirm")}>{busy ? "Cargando…" : `Confirmar y cargar ${formatInt(review.valid_rows)} filas`}</Button>
          </div>
        </div>}
      </Card>
    </div>

    <Card className="flex flex-col gap-4 p-8">
      <h2 className="text-lg font-semibold">Cargas anteriores</h2>
      {history.data?.items.length ? <Table>
        <THead><TR><TH>Fecha</TH><TH>Archivo</TH><TH>Qué contiene</TH><TH numeric>Leídas</TH><TH numeric>Con error</TH><TH numeric>Cargadas</TH><TH>Estado</TH></TR></THead>
        <TBody>{history.data.items.map((h) => <TR key={h.id}>
          <TD className="whitespace-nowrap">{formatDate(h.created_at)}</TD>
          <TD className="font-semibold">{h.file_name}</TD>
          <TD className="text-ink-2">{items.find((s) => s.source === h.source)?.description ?? h.source}</TD>
          <TD numeric>{formatInt(h.rows_read)}</TD>
          <TD numeric>{formatInt(h.rows_with_error)}</TD>
          <TD numeric>{h.rows_loaded != null ? formatInt(h.rows_loaded) : "—"}</TD>
          <TD><span className={cn("rounded-xs px-2 py-0.5 text-xs font-semibold", STATUS_LABEL[h.status].cls)}>{STATUS_LABEL[h.status].text}</span></TD>
        </TR>)}</TBody>
      </Table> : <p className="text-sm text-ink-muted">Todavía no hay cargas desde Ajustes. Los datos actuales vienen de la carga inicial del servidor.</p>}
    </Card>

    <Card className="flex flex-col gap-4 p-8">
      <div><h2 className="text-lg font-semibold">Cómo llegarán los datos</h2><p className="text-sm text-ink-muted">El camino previsto, de lo que hay hoy a lo que se automatizará</p></div>
      <ol className="grid gap-3 md:grid-cols-3">
        {[["Hoy", "Archivos CSV manuales", "Se suben aquí con la plantilla de encabezados. Hay que confirmar con Mederi qué es cada columna."],
          ["Siguiente paso", "Exportación programada con encabezados", "Mederi deja los mismos archivos cada semana, con nombres de columna. Es lo que se propone para el piloto."],
          ["Fase 2", "Conexión automática por API", "Por ahora no se usa la API de Defontana. Queda como opción futura si Mederi lo pide."]]
          .map(([step, title, text], i) => <li key={step} className={cn("rounded p-5", i === 0 ? "bg-brand-soft" : "bg-canvas")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide", i === 0 ? "text-brand" : "text-ink-muted")}>{step}</p>
            <p className="mt-1 font-semibold">{title}</p><p className="mt-1 text-sm text-ink-2">{text}</p></li>)}
      </ol>
    </Card>
  </div>;
}
