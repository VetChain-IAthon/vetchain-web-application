"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";

export type ShareChannel = "email" | "whatsapp";

/** Celular del Perú para wa.me (misma regla que el backend): 9 dígitos que empiezan con 9, con o sin 51 delante. */
export function peruMobile(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("51")) digits = digits.slice(2);
  return digits.length === 9 && digits.startsWith("9") ? `51${digits}` : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Panel para enviar la ficha por correo o WhatsApp: destinatario y texto editables, y siempre la opción de copiar. */
export function ShareDialog({ channel, ruc, subject, text, version, onClose }: {
  channel: ShareChannel; ruc?: string; subject: string; text: string; version: "internal" | "customer"; onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [body, setBody] = useState(channel === "whatsapp" ? `${subject}\n\n${text}` : text);
  const [copied, setCopied] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const customer = useQuery(() => ruc ? api.GET("/api/v1/customers/{ruc}", { params: { path: { ruc } } }) : Promise.resolve({ data: null }), [ruc], "");
  const customerContact = channel === "email"
    ? (customer.data?.email?.trim() && EMAIL.test(customer.data.email.trim()) ? customer.data.email.trim() : null)
    : (peruMobile(customer.data?.phone) ? customer.data?.phone?.trim() ?? null : null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const email = to.trim();
  const emailError = channel === "email" && email && !EMAIL.test(email) ? "Escribe un correo válido, por ejemplo nombre@empresa.pe." : null;
  const mobile = peruMobile(to);
  const phoneError = channel === "whatsapp" && to.trim() && !mobile ? "Escribe un celular del Perú de 9 dígitos que empiece con 9." : null;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const whatsappUrl = `https://wa.me/${mobile ?? ""}?text=${encodeURIComponent(body)}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(channel === "email" ? `${subject}\n\n${body}` : body); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  };
  const openUrl = (url: string, newTab: boolean) => { newTab ? window.open(url, "_blank", "noopener,noreferrer") : (window.location.href = url); onClose(); };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-lg bg-surface p-6 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="share-title" className="text-lg font-semibold">{channel === "email" ? "Enviar por correo" : "Enviar por WhatsApp"}</h2>
          <p className="text-sm text-ink-muted">{version === "customer" ? "Versión para el cliente." : "Versión interna: no la envíes al cliente."} Revisa el destinatario antes de enviar.</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink"><X size={18} /></button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="share-to" className="text-sm font-semibold">{channel === "email" ? "Para" : "Celular"} <span className="font-normal text-ink-muted">(opcional)</span></label>
        <Input id="share-to" ref={first} value={to} onChange={(e) => setTo(e.target.value)} inputMode={channel === "email" ? "email" : "tel"}
          placeholder={channel === "email" ? "nombre@empresa.pe" : "987 654 321"} aria-invalid={!!(emailError || phoneError)} maxLength={120} />
        {(emailError || phoneError) && <p className="text-[13px] text-brand-strong">{emailError || phoneError}</p>}
        {customerContact && to.trim() !== customerContact && <button type="button" onClick={() => setTo(customerContact)}
          className="self-start text-[13px] font-semibold text-brand hover:underline">Usar el {channel === "email" ? "correo" : "celular"} del cliente ({customerContact})</button>}
        {channel === "whatsapp" && !to.trim() && <p className="text-[13px] text-ink-muted">Sin celular, WhatsApp te deja elegir el chat.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="share-body" className="text-sm font-semibold">Mensaje</label>
        <textarea id="share-body" value={body} onChange={(e) => setBody(e.target.value)} rows={9}
          className="w-full rounded border border-line-strong bg-surface p-3 text-sm leading-relaxed text-ink focus:border-brand focus:outline focus:outline-2 focus:outline-brand" />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copiado" : "Copiar texto"}</Button>
        {channel === "email" ? <>
          <Button variant="outline" disabled={!!emailError} onClick={() => openUrl(mailtoUrl, false)}>Abrir mi app de correo</Button>
          <Button disabled={!!emailError} onClick={() => openUrl(gmailUrl, true)}>Abrir en Gmail</Button>
        </> : <Button disabled={!!phoneError} onClick={() => openUrl(whatsappUrl, true)}>Abrir WhatsApp</Button>}
      </div>
    </div>
  </div>;
}
