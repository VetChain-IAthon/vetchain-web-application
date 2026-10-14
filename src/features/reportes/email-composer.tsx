"use client";

import { CheckCircle2, FileText, Loader2, Send, ShieldCheck, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/data/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api/client";
import { isGmailSender, publicSenderDomain } from "@/lib/email-sender";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

export type EmailAttachment = { fileName: string; blob: Blob };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const splitEmails = (text: string) => text.split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean);

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Enviar desde el Gmail conectado por el usuario o desde el correo general. */
export function EmailComposer({ ruc, subject: initialSubject, text, version, attachment, onClose, inline = false }: {
  ruc?: string; subject: string; text: string; version: "internal" | "customer";
  attachment?: () => EmailAttachment | undefined; onClose: () => void; inline?: boolean;
}) {
  const setup = useQuery(() => api.GET("/api/v1/email-senders"), [], "No se pudo cargar los remitentes.");
  const gmail = useQuery(() => api.GET("/api/v1/gmail/connection"), [], "No se pudo revisar la conexión con Gmail.");
  const customer = useQuery(() => ruc ? api.GET("/api/v1/customers/{ruc}", { params: { path: { ruc } } }) : Promise.resolve({ data: null }), [ruc], "");
  const senders = setup.data?.senders ?? [];

  const [senderId, setSenderId] = useState<number | null>(null);
  const [mode, setMode] = useState<"gmail" | "general">("gmail");
  const [fromEmail, setFromEmail] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(text);
  const [withAttachment, setWithAttachment] = useState(!!attachment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ status: string; from: string; to: string[] } | null>(null);
  const file = useMemo(() => attachment?.(), [attachment]);

  // El remitente general de Ajustes prevalece para todos los envíos.
  useEffect(() => {
    if (senderId != null || !senders.length) return;
    const chosen = senders.find((s) => s.is_default) ?? senders[0];
    setSenderId(chosen.id);
    setFromEmail(chosen.is_domain ? "" : chosen.address);
  }, [senders, senderId]);
  useEffect(() => { if (gmail.data && !gmail.data.available && !gmail.data.email) setMode("general"); }, [gmail.data]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const sender = senders.find((s) => s.id === senderId);
  const publicDomain = mode === "general" && sender ? publicSenderDomain(sender.address) : null;
  const gmailSender = mode === "general" && sender ? isGmailSender(sender.address) : false;
  const customerEmail = customer.data?.email?.trim() && EMAIL.test(customer.data.email.trim()) ? customer.data.email.trim() : null;
  const recipients = splitEmails(to);
  const badRecipient = recipients.find((r) => !EMAIL.test(r));
  const fromError = mode === "general" && sender?.is_domain && fromEmail && !(EMAIL.test(fromEmail) && fromEmail.toLowerCase().endsWith(sender.address))
    ? `La dirección debe terminar en ${sender.address}.` : null;
  const senderReady = mode === "gmail" ? !!gmail.data?.available && !!gmail.data?.email : !!sender && !!setup.data?.provider_configured && (!sender.is_domain || !!fromEmail);
  const canSend = senderReady && recipients.length > 0 && !badRecipient && !fromError
    && subject.trim() !== "" && body.trim() !== "" && !busy && !publicDomain;

  const connectGmail = async () => {
    const path = window.location.pathname + window.location.search;
    const { data, error: err } = await api.GET("/api/v1/gmail/connect", { params: { query: { return_path: path } } });
    if (err || !data?.authorization_url) { setError(errorMessage(err, "No se pudo iniciar la conexión con Google.")); return; }
    window.location.assign(data.authorization_url);
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true); setError(null);
    const attachments = withAttachment && file ? [{ file_name: file.fileName, content_base64: await toBase64(file.blob), content_type: "application/pdf" }] : [];
    const { data, error: err } = await api.POST("/api/v1/emails", { body: {
      sender_id: mode === "gmail" ? null : sender?.id, from_email: mode === "general" && sender?.is_domain ? fromEmail : undefined, to: recipients,
      subject: subject.trim(), body: body.trim(), attachments,
    } });
    setBusy(false);
    if (err || !data) { setError(errorMessage(err, "No se pudo enviar el correo. Revisa los datos e intenta de nuevo.")); return; }
    setSent({ status: data.status, from: data.from_email, to: data.to });
  };

  return <div className={inline ? "" : "fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"} onMouseDown={(e) => { if (!inline && e.target === e.currentTarget && !busy) onClose(); }}>
    <div role={inline ? "region" : "dialog"} aria-modal={inline ? undefined : true} aria-labelledby="email-title" className={cn("flex w-full flex-col gap-5 rounded-lg border-2 border-brand bg-surface p-7", inline ? "" : "max-h-[92vh] max-w-3xl overflow-y-auto shadow-lg")}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="email-title" className="text-xl font-semibold">Enviar por correo</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink"><X size={20} /></button>
      </div>

      {sent ? <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 size={44} className="text-ok-fg" aria-hidden />
        <p className="text-lg font-semibold">{sent.status === "sent" ? "Correo enviado" : "Envío registrado en modo de prueba"}</p>
        <p className="text-sm text-ink-muted">{sent.status === "sent"
          ? <>Desde <strong>{sent.from}</strong> a <strong>{sent.to.join(", ")}</strong>.</>
          : <>Resend no está configurado: el correo no salió. Configura la clave en el servidor para habilitar los envíos.</>}</p>
        <Button onClick={onClose}>Listo</Button>
      </div> : <>
        <div className={cn("flex items-center gap-2.5 rounded px-4 py-3 text-sm", version === "customer" ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg")}>
          {version === "customer" ? <ShieldCheck size={18} aria-hidden /> : <TriangleAlert size={18} aria-hidden />}
          {version === "customer"
            ? "Sale la versión para el cliente: compras, precios y propuesta. La ganancia, los márgenes, el stock y el guion no salen de Mederi."
            : "Versión interna: incluye datos de Mederi que no deben llegar al cliente. Envíala solo al equipo."}
        </div>

        {setup.error && <Notice>{setup.error.message}</Notice>}
        {gmail.error && <Notice>{gmail.error.message}</Notice>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cuenta de origen">
          {gmail.data?.available && <Button variant={mode === "gmail" ? undefined : "outline"} onClick={() => setMode("gmail")}>Mi Gmail</Button>}
          {senders.length > 0 && <Button variant={mode === "general" ? undefined : "outline"} onClick={() => setMode("general")}>Correo general</Button>}
        </div>
        {gmail.data && !gmail.data.available && <p className="text-sm text-ink-muted">La conexión con Google está pendiente de activación por el administrador.</p>}
        {mode === "gmail" ? gmail.data?.email
          ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">De: <strong>Mederi Pharma &lt;{gmail.data.email}&gt;</strong><button type="button" onClick={connectGmail} className="font-semibold text-brand hover:underline">Cambiar cuenta</button></div>
          : <Notice tone="warn">Conecta tu Gmail con Google para enviar desde tu cuenta. <button type="button" onClick={connectGmail} disabled={!gmail.data?.available} className="font-semibold underline disabled:opacity-50">Conectar Gmail</button></Notice>
          : <>
          {setup.data && !setup.data.provider_configured && <p className="rounded border border-warn-fg/20 bg-warn-bg px-4 py-2.5 text-[13px] text-warn-fg">
            {gmailSender
              ? "Este correo general aún no está autorizado para enviar. Puedes conectar tu propio Gmail."
              : "El correo general aún no está disponible para enviar."}</p>}
          {publicDomain && <Notice tone="warn">El remitente usa {publicDomain}, que Resend no puede verificar para Mederi. Gerencia debe cambiar el correo de origen por uno de un dominio propio verificado en <Link href="/ajustes?tab=email" className="font-semibold underline">Ajustes › Correo</Link>.</Notice>}

          {sender && <p className="text-sm text-ink-muted">De: <strong>{sender.name} &lt;{sender.is_domain ? fromEmail || `…${sender.address}` : sender.address}&gt;</strong></p>}
          {sender?.is_domain && <label className="flex flex-col gap-1.5 text-sm font-semibold">Dirección de origen
              <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value.trim())} placeholder={`ventas${sender.address}`} aria-invalid={!!fromError} />
              {fromError && <span className="text-[13px] font-normal text-brand-strong">{fromError}</span>}
            </label>}
          </>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email-to" className="text-sm font-semibold">Para</label>
              <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="compras@cliente.pe" aria-invalid={!!badRecipient} autoFocus />
              {badRecipient ? <span className="text-[13px] text-brand-strong">«{badRecipient}» no es un correo válido.</span>
                : <span className="text-xs text-ink-muted">Varios destinatarios: sepáralos con coma.</span>}
              {customerEmail && !recipients.includes(customerEmail) && <button type="button" onClick={() => setTo(recipients.concat(customerEmail).join(", "))}
                className="self-start text-[13px] font-semibold text-brand hover:underline">Usar el correo del cliente ({customerEmail})</button>}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Asunto
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} /></label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">Mensaje
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7}
              className="w-full rounded border border-line-strong bg-surface p-3 text-sm font-normal leading-relaxed text-ink focus:border-brand focus:outline focus:outline-2 focus:outline-brand" /></label>

          {error && <Notice>{error}</Notice>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {file ? <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded bg-canvas px-3 py-2 text-sm", !withAttachment && "text-ink-muted line-through")}>
              <input type="checkbox" checked={withAttachment} onChange={(e) => setWithAttachment(e.target.checked)} className="accent-brand" />
              <FileText size={16} aria-hidden />{file.fileName}</label> : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
              <Button onClick={send} disabled={!canSend}>{busy ? <><Loader2 size={16} className="animate-spin" aria-hidden />Enviando…</> : <><Send size={16} aria-hidden />Enviar</>}</Button>
            </div>
          </div>
      </>}
    </div>
  </div>;
}
